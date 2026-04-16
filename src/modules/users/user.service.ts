import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';

class UserService {
  /**
   * Create attendant (cashier)
   * Only owners can create attendants for their stations
   */
  async createAttendant(ownerId: string, dto: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    stationId: string;
    pin: string; // 4 digit PIN
  }) {
    // Verify that the owner actually owns this station
    const station = await prisma.station.findFirst({
      where: {
        id: dto.stationId,
        ownerId,
      },
    });

    if (!station) {
      throw new Error('Station not found or you do not own this station');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Validate PIN (must be 4 digits)
    if (!/^\d{4}$/.test(dto.pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(dto.pin, 10);

    // Generate a default password (can be changed later)
    const defaultPassword = `${dto.firstName.toLowerCase()}@${new Date().getFullYear()}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create attendant
    const attendant = await prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        password: hashedPassword,
        pin: hashedPin,
        stationId: dto.stationId,
        role: 'ATTENDANT',
        isActive: true,
      },
      include: {
        station: true,
      },
    });

    // Return without sensitive data
    const { password, pin, ...attendantData } = attendant;

    return {
      ...attendantData,
      defaultPassword, // Return this so owner can give it to the attendant
    };
  }

  /**
   * Get all attendants for a specific station
   */
  async getStationAttendants(stationId: string, userId: string, userRole: string) {
    // Verify that user has access to this station
    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        OR: [
          { ownerId: userId },
          { managerId: userId },
        ],
      },
    });

    if (!station && userRole !== 'OWNER') {
      throw new Error('You do not have access to this station');
    }

    const attendants = await prisma.user.findMany({
      where: {
        stationId,
        role: 'ATTENDANT',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return attendants;
  }

  /**
   * Update attendant PIN
   * Only owners can update PINs
   */
  async updateAttendantPin(attendantId: string, newPin: string, ownerId: string) {
    // Validate new PIN
    if (!/^\d{4}$/.test(newPin)) {
      throw new Error('PIN must be exactly 4 digits');
    }

    // Find the attendant and verify ownership
    const attendant = await prisma.user.findUnique({
      where: { id: attendantId },
      include: {
        station: true,
      },
    });

    if (!attendant) {
      throw new Error('Attendant not found');
    }

    if (attendant.role !== 'ATTENDANT') {
      throw new Error('User is not an attendant');
    }

    if (!attendant.station) {
      throw new Error('Attendant not assigned to any station');
    }

    if (attendant.station.ownerId !== ownerId) {
      throw new Error('You do not have permission to update this attendant');
    }

    // Hash new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);

    // Update PIN
    await prisma.user.update({
      where: { id: attendantId },
      data: { pin: hashedPin },
    });

    return {
      message: 'PIN updated successfully',
    };
  }

  /**
   * Toggle attendant active status
   */
  async toggleAttendantStatus(attendantId: string, ownerId: string) {
    // Find the attendant and verify ownership
    const attendant = await prisma.user.findUnique({
      where: { id: attendantId },
      include: {
        station: true,
      },
    });

    if (!attendant) {
      throw new Error('Attendant not found');
    }

    if (attendant.role !== 'ATTENDANT') {
      throw new Error('User is not an attendant');
    }

    if (!attendant.station || attendant.station.ownerId !== ownerId) {
      throw new Error('You do not have permission to modify this attendant');
    }

    // Toggle status
    const updated = await prisma.user.update({
      where: { id: attendantId },
      data: { isActive: !attendant.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    return updated;
  }
}

export const userService = new UserService();
