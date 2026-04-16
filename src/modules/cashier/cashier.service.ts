import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

class CashierService {
  /**
   * Login with PIN
   * Find attendant by PIN and stationId, then create a new session
   */
  async loginWithPin(pin: string, stationId: string) {
    // Find all attendants assigned to this station
    const attendants = await prisma.user.findMany({
      where: {
        role: 'ATTENDANT',
        stationId,
        isActive: true,
      },
      include: {
        station: true,
      },
    });

    if (attendants.length === 0) {
      throw new Error('No attendants found for this station');
    }

    // Check PIN against all attendants
    let matchedAttendant = null;
    for (const attendant of attendants) {
      if (attendant.pin) {
        const isMatch = await bcrypt.compare(pin, attendant.pin);
        if (isMatch) {
          matchedAttendant = attendant;
          break;
        }
      }
    }

    if (!matchedAttendant) {
      throw new Error('Invalid PIN');
    }

    // Check if there's already an open session
    const existingSession = await prisma.cashierSession.findFirst({
      where: {
        attendantId: matchedAttendant.id,
        status: 'OPEN',
      },
    });

    if (existingSession) {
      // Return existing session
      const token = jwt.sign(
        {
          id: matchedAttendant.id,
          role: matchedAttendant.role,
          sessionId: existingSession.id,
          stationId: matchedAttendant.stationId,
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: env.JWT_ACCESS_EXPIRY } as jwt.SignOptions
      );

      return {
        token,
        session: existingSession,
        attendant: {
          id: matchedAttendant.id,
          firstName: matchedAttendant.firstName,
          lastName: matchedAttendant.lastName,
          email: matchedAttendant.email,
          role: matchedAttendant.role,
        },
      };
    }

    // Create new session
    const session = await prisma.cashierSession.create({
      data: {
        attendantId: matchedAttendant.id,
        stationId,
        status: 'OPEN',
      },
      include: {
        station: true,
        attendant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Generate JWT with session info
    const token = jwt.sign(
      {
        id: matchedAttendant.id,
        role: matchedAttendant.role,
        sessionId: session.id,
        stationId: matchedAttendant.stationId,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY } as jwt.SignOptions
    );

    // Update last login
    await prisma.user.update({
      where: { id: matchedAttendant.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token,
      session,
      attendant: {
        id: matchedAttendant.id,
        firstName: matchedAttendant.firstName,
        lastName: matchedAttendant.lastName,
        email: matchedAttendant.email,
        role: matchedAttendant.role,
      },
    };
  }

  /**
   * Close session
   * Calculate totals from transactions and close the session
   */
  async closeSession(sessionId: string, attendantId: string) {
    // Find session
    const session = await prisma.cashierSession.findUnique({
      where: { id: sessionId },
      include: {
        transactions: {
          where: {
            status: 'COMPLETED',
          },
        },
        attendant: true,
        station: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.attendantId !== attendantId) {
      throw new Error('You do not have permission to close this session');
    }

    if (session.status === 'CLOSED') {
      throw new Error('Session is already closed');
    }

    // Calculate totals
    const totals = session.transactions.reduce(
      (acc, tx) => {
        acc.totalRevenue += tx.totalAmount;
        acc.totalVolume += tx.volume;
        acc.totalTransactions += 1;

        // Count by payment method
        if (tx.paymentMethod === 'CASH') {
          acc.cashAmount += tx.totalAmount;
        } else if (tx.paymentMethod === 'WAVE') {
          acc.waveAmount += tx.totalAmount;
        } else if (tx.paymentMethod === 'ORANGE_MONEY') {
          acc.orangeMoneyAmount += tx.totalAmount;
        }

        return acc;
      },
      {
        totalRevenue: 0,
        totalVolume: 0,
        totalTransactions: 0,
        cashAmount: 0,
        waveAmount: 0,
        orangeMoneyAmount: 0,
      }
    );

    // Update session
    const closedSession = await prisma.cashierSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        ...totals,
      },
      include: {
        attendant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        station: true,
        transactions: {
          where: {
            status: 'COMPLETED',
          },
          include: {
            nozzle: {
              include: {
                pump: true,
              },
            },
          },
        },
      },
    });

    return closedSession;
  }

  /**
   * Get active session for an attendant
   */
  async getActiveSession(attendantId: string) {
    const session = await prisma.cashierSession.findFirst({
      where: {
        attendantId,
        status: 'OPEN',
      },
      include: {
        station: true,
        attendant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return session;
  }

  /**
   * Get session report
   */
  async getSessionReport(sessionId: string) {
    const session = await prisma.cashierSession.findUnique({
      where: { id: sessionId },
      include: {
        attendant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        station: true,
        transactions: {
          where: {
            status: 'COMPLETED',
          },
          include: {
            nozzle: {
              include: {
                pump: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Calculate payment method breakdown
    const paymentBreakdown = session.transactions.reduce((acc: any, tx) => {
      if (!acc[tx.paymentMethod]) {
        acc[tx.paymentMethod] = {
          count: 0,
          amount: 0,
        };
      }
      acc[tx.paymentMethod].count += 1;
      acc[tx.paymentMethod].amount += tx.totalAmount;
      return acc;
    }, {});

    return {
      ...session,
      paymentBreakdown,
    };
  }
}

export const cashierService = new CashierService();
