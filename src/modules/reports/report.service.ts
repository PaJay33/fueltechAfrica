import { Prisma, TransactionStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

type Period = 'today' | 'week' | 'month';

interface StationStats {
  totalRevenue: number;
  totalVolume: number;
  totalTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  revenueByFuelType: {
    SUPER: number;
    DIESEL: number;
    ORDINAIRE: number;
  };
  volumeByFuelType: {
    SUPER: number;
    DIESEL: number;
    ORDINAIRE: number;
  };
  revenueByPaymentMethod: {
    CASH: number;
    WAVE: number;
    ORANGE_MONEY: number;
    FREE_MONEY: number;
    CREDIT_CARD: number;
  };
  topPumps: Array<{
    pumpId: string;
    pumpName: string;
    revenue: number;
    volume: number;
  }>;
  hourlyRevenue: Array<{
    hour: number;
    revenue: number;
    transactions: number;
  }>;
}

interface NetworkStats {
  totalStations: number;
  activeStations: number;
  totalRevenue: number;
  totalVolume: number;
  totalTransactions: number;
  revenueByStation: Array<{
    stationId: string;
    stationName: string;
    revenue: number;
    volume: number;
    transactions: number;
  }>;
}

class ReportService {
  /**
   * Get date range for period
   */
  private getDateRange(period: Period): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Get station statistics
   */
  async getStationStats(stationId: string, period: Period = 'today'): Promise<StationStats> {
    try {
      const { startDate, endDate } = this.getDateRange(period);

      // Get all transactions for the period
      const transactions = await prisma.transaction.findMany({
        where: {
          stationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          nozzle: {
            include: {
              pump: true,
            },
          },
        },
      });

      // Calculate basic stats
      const completedTransactions = transactions.filter(
        (t) => t.status === TransactionStatus.COMPLETED
      );
      const failedTransactions = transactions.filter(
        (t) => t.status === TransactionStatus.FAILED
      );

      const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const totalVolume = completedTransactions.reduce((sum, t) => sum + t.volume, 0);

      // Revenue by fuel type
      const revenueByFuelType = {
        SUPER: 0,
        DIESEL: 0,
        ORDINAIRE: 0,
      };
      const volumeByFuelType = {
        SUPER: 0,
        DIESEL: 0,
        ORDINAIRE: 0,
      };

      completedTransactions.forEach((t) => {
        revenueByFuelType[t.fuelType] += t.totalAmount;
        volumeByFuelType[t.fuelType] += t.volume;
      });

      // Revenue by payment method
      const revenueByPaymentMethod = {
        CASH: 0,
        WAVE: 0,
        ORANGE_MONEY: 0,
        FREE_MONEY: 0,
        CREDIT_CARD: 0,
      };

      completedTransactions.forEach((t) => {
        revenueByPaymentMethod[t.paymentMethod] += t.totalAmount;
      });

      // Top pumps by revenue
      const pumpStats = new Map<
        string,
        { pumpId: string; pumpName: string; revenue: number; volume: number }
      >();

      completedTransactions.forEach((t) => {
        if (t.nozzle?.pump) {
          const pumpId = t.nozzle.pump.id;
          const existing = pumpStats.get(pumpId) || {
            pumpId,
            pumpName: t.nozzle.pump.name,
            revenue: 0,
            volume: 0,
          };
          existing.revenue += t.totalAmount;
          existing.volume += t.volume;
          pumpStats.set(pumpId, existing);
        }
      });

      const topPumps = Array.from(pumpStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Hourly revenue
      const hourlyStats = new Array(24).fill(0).map((_, hour) => ({
        hour,
        revenue: 0,
        transactions: 0,
      }));

      completedTransactions.forEach((t) => {
        const hour = new Date(t.createdAt).getHours();
        hourlyStats[hour].revenue += t.totalAmount;
        hourlyStats[hour].transactions += 1;
      });

      return {
        totalRevenue,
        totalVolume,
        totalTransactions: transactions.length,
        completedTransactions: completedTransactions.length,
        failedTransactions: failedTransactions.length,
        revenueByFuelType,
        volumeByFuelType,
        revenueByPaymentMethod,
        topPumps,
        hourlyRevenue: hourlyStats,
      };
    } catch (error) {
      logger.error('Error getting station stats:', error);
      throw error;
    }
  }

  /**
   * Get network statistics for all stations owned by a user
   */
  async getNetworkStats(ownerId: string): Promise<NetworkStats> {
    try {
      // Get all stations for this owner
      const stations = await prisma.station.findMany({
        where: { ownerId },
        include: {
          transactions: {
            where: {
              status: TransactionStatus.COMPLETED,
            },
          },
        },
      });

      const totalStations = stations.length;
      const activeStations = stations.filter((s) => s.status === 'ACTIVE').length;

      let totalRevenue = 0;
      let totalVolume = 0;
      let totalTransactions = 0;

      const revenueByStation = stations.map((station) => {
        const stationRevenue = station.transactions.reduce((sum, t) => sum + t.totalAmount, 0);
        const stationVolume = station.transactions.reduce((sum, t) => sum + t.volume, 0);
        const stationTransactions = station.transactions.length;

        totalRevenue += stationRevenue;
        totalVolume += stationVolume;
        totalTransactions += stationTransactions;

        return {
          stationId: station.id,
          stationName: station.name,
          revenue: stationRevenue,
          volume: stationVolume,
          transactions: stationTransactions,
        };
      });

      // Sort by revenue descending
      revenueByStation.sort((a, b) => b.revenue - a.revenue);

      return {
        totalStations,
        activeStations,
        totalRevenue,
        totalVolume,
        totalTransactions,
        revenueByStation,
      };
    } catch (error) {
      logger.error('Error getting network stats:', error);
      throw error;
    }
  }

  /**
   * Get daily report for a specific station and date
   */
  async getDailyReport(stationId: string, date: Date) {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Get all transactions for the day
      const transactions = await prisma.transaction.findMany({
        where: {
          stationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          nozzle: {
            select: {
              id: true,
              code: true,
              fuelType: true,
              pump: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Calculate summary
      const completedTransactions = transactions.filter(
        (t) => t.status === TransactionStatus.COMPLETED
      );

      const summary = {
        date: date.toISOString().split('T')[0],
        totalTransactions: transactions.length,
        completedTransactions: completedTransactions.length,
        totalRevenue: completedTransactions.reduce((sum, t) => sum + t.totalAmount, 0),
        totalVolume: completedTransactions.reduce((sum, t) => sum + t.volume, 0),
        averageTransactionAmount:
          completedTransactions.length > 0
            ? completedTransactions.reduce((sum, t) => sum + t.totalAmount, 0) /
              completedTransactions.length
            : 0,
      };

      return {
        summary,
        transactions,
      };
    } catch (error) {
      logger.error('Error getting daily report:', error);
      throw error;
    }
  }
}

export const reportService = new ReportService();
