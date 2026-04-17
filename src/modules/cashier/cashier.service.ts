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
        station: matchedAttendant.station,
      };
    }

    // Find last closed session to get opening cash amount
    const lastSession = await prisma.cashierSession.findFirst({
      where: {
        stationId,
        status: 'CLOSED'
      },
      orderBy: { closedAt: 'desc' },
      include: {
        attendant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const openingCashAmount = lastSession?.closingCashAmount || 0;

    // Create new session
    const session = await prisma.cashierSession.create({
      data: {
        attendantId: matchedAttendant.id,
        stationId,
        status: 'OPEN',
        openingCashAmount,
        previousSessionId: lastSession?.id || null,
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
      station: matchedAttendant.station,
      previousSession: lastSession ? {
        closingCashAmount: lastSession.closingCashAmount,
        attendant: lastSession.attendant,
        closedAt: lastSession.closedAt,
      } : null,
    };
  }

  /**
   * Close session
   * Calculate totals from transactions and close the session
   */
  async closeSession(attendantId: string, closingCashAmount: number, notes?: string) {
    // Find the active (OPEN) session for this attendant
    const session = await prisma.cashierSession.findFirst({
      where: {
        attendantId,
        status: 'OPEN'
      },
      orderBy: { openedAt: 'desc' }
    });

    if (!session) {
      throw new Error('No active session found');
    }

    // Get all completed transactions for this session
    const transactions = await prisma.transaction.findMany({
      where: {
        sessionId: session.id,
        status: 'COMPLETED'
      }
    });

    // Calculate totals by payment method
    const cashAmount = transactions
      .filter(t => t.paymentMethod === 'CASH')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const waveAmount = transactions
      .filter(t => t.paymentMethod === 'WAVE')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const orangeMoneyAmount = transactions
      .filter(t => t.paymentMethod === 'ORANGE_MONEY')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalVolume = transactions.reduce((sum, t) => sum + t.volume, 0);
    const theoreticalCashAmount = session.openingCashAmount + cashAmount;
    const cashDifference = closingCashAmount - theoreticalCashAmount;

    // Update session to CLOSED
    const closedSession = await prisma.cashierSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingCashAmount,
        theoreticalCashAmount,
        cashDifference,
        totalRevenue,
        totalVolume,
        totalTransactions: transactions.length,
        cashAmount,
        waveAmount,
        orangeMoneyAmount,
        notes: notes || null,
      },
      include: {
        attendant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        station: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
      }
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

  /**
   * Get session summary for a station
   * Returns current active session and last closed session info
   */
  async getSessionSummary(stationId: string) {
    // Get active session
    const activeSession = await prisma.cashierSession.findFirst({
      where: {
        stationId,
        status: 'OPEN',
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
      },
    });

    // Get last closed session
    const lastClosedSession = await prisma.cashierSession.findFirst({
      where: {
        stationId,
        status: 'CLOSED',
      },
      orderBy: { closedAt: 'desc' },
      include: {
        attendant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Current cash amount in drawer
    const currentCashAmount = lastClosedSession?.closingCashAmount || 0;

    return {
      activeSession,
      lastClosedSession,
      currentCashAmount,
      hasActiveSession: !!activeSession,
    };
  }
}

export const cashierService = new CashierService();
