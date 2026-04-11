import { Prisma, TransactionStatus, NozzleStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import {
  InitiateTransactionDto,
  TransactionFilters,
  TransactionResponse,
  InitiateTransactionResponse,
} from './transaction.types';
import { waveService } from './wave.service';
import { pumpSimulator } from '../../../simulator/pump.simulator';

class TransactionService {
  /**
   * Generate a unique transaction code
   */
  private async generateTransactionCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Count transactions today
    const count = await prisma.transaction.count({
      where: {
        transactionCode: {
          startsWith: `TXN-${dateStr}`,
        },
      },
    });

    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `TXN-${dateStr}-${nextNumber}`;
  }

  /**
   * Initiate a new transaction
   */
  async initiate(
    customerId: string,
    dto: InitiateTransactionDto
  ): Promise<InitiateTransactionResponse> {
    try {
      // Verify nozzle exists and is available
      const nozzle = await prisma.nozzle.findUnique({
        where: { id: dto.nozzleId },
        include: {
          pump: {
            include: {
              station: true,
            },
          },
        },
      });

      if (!nozzle) {
        throw new Error('Nozzle not found');
      }

      if (nozzle.status !== NozzleStatus.AVAILABLE) {
        throw new Error('Nozzle is not available');
      }

      if (nozzle.pump.status !== 'ACTIVE') {
        throw new Error('Pump is not active');
      }

      // Generate transaction code
      const transactionCode = await this.generateTransactionCode();

      // Calculate volume based on preset amount
      const estimatedVolume = dto.presetAmount / nozzle.pricePerLiter;

      // Create transaction
      let transaction = await prisma.transaction.create({
        data: {
          transactionCode,
          stationId: nozzle.pump.stationId,
          nozzleId: dto.nozzleId,
          userId: customerId,
          fuelType: nozzle.fuelType,
          volume: 0,
          pricePerLiter: nozzle.pricePerLiter,
          totalAmount: dto.presetAmount,
          paymentMethod: dto.paymentMethod,
          status: TransactionStatus.PENDING,
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          nozzle: {
            select: {
              id: true,
              code: true,
              fuelType: true,
              pricePerLiter: true,
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
      });

      let checkoutUrl: string | undefined;

      // Handle payment method
      if (dto.paymentMethod === PaymentMethod.WAVE) {
        // Initiate Wave payment
        try {
          const wavePayment = await waveService.initiatePayment({
            amount: dto.presetAmount,
            transactionId: transaction.id,
          });

          // Update transaction with Wave details
          transaction = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.PROCESSING,
              waveTransactionId: wavePayment.checkoutId,
              wavePaymentUrl: wavePayment.checkoutUrl,
            },
            include: {
              station: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              nozzle: {
                select: {
                  id: true,
                  code: true,
                  fuelType: true,
                  pricePerLiter: true,
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
          });

          checkoutUrl = wavePayment.checkoutUrl;
        } catch (error) {
          // If Wave payment fails, mark transaction as failed
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: TransactionStatus.FAILED },
          });
          throw error;
        }
      } else if (
        dto.paymentMethod === PaymentMethod.CASH ||
        dto.paymentMethod === PaymentMethod.ORANGE_MONEY ||
        dto.paymentMethod === PaymentMethod.FREE_MONEY
      ) {
        // For cash/mobile money, go directly to processing and authorize pump
        transaction = await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.PROCESSING },
          include: {
            station: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            nozzle: {
              select: {
                id: true,
                code: true,
                fuelType: true,
                pricePerLiter: true,
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
        });

        // Update nozzle status to IN_USE
        await prisma.nozzle.update({
          where: { id: dto.nozzleId },
          data: { status: NozzleStatus.IN_USE },
        });

        // Authorize pump
        await pumpSimulator.authorize(
          transaction.id,
          dto.nozzleId,
          dto.presetAmount,
          nozzle.pricePerLiter
        );

        logger.info(`Pump authorized for transaction ${transaction.id}`);
      }

      logger.info(`Transaction initiated: ${transaction.id} - ${transactionCode}`);

      return {
        transaction: transaction as TransactionResponse,
        checkoutUrl,
      };
    } catch (error) {
      logger.error('Error initiating transaction:', error);
      throw error;
    }
  }

  /**
   * Handle Wave payment webhook
   */
  async handleWaveWebhook(waveTransactionId: string, status: string): Promise<void> {
    try {
      // Find transaction by Wave transaction ID
      const transaction = await prisma.transaction.findFirst({
        where: { waveTransactionId },
        include: {
          nozzle: true,
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (status === 'succeeded') {
        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.PROCESSING },
        });

        // Update nozzle status to IN_USE
        await prisma.nozzle.update({
          where: { id: transaction.nozzleId },
          data: { status: NozzleStatus.IN_USE },
        });

        // Authorize pump
        await pumpSimulator.authorize(
          transaction.id,
          transaction.nozzleId,
          transaction.totalAmount,
          transaction.pricePerLiter
        );

        logger.info(`Pump authorized after Wave payment for transaction ${transaction.id}`);
      } else if (status === 'failed') {
        // Mark transaction as failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.FAILED },
        });

        logger.info(`Transaction ${transaction.id} marked as failed due to Wave payment failure`);
      }
    } catch (error) {
      logger.error('Error handling Wave webhook:', error);
      throw error;
    }
  }

  /**
   * Complete a transaction
   */
  async complete(transactionId: string, volumeDelivered: number): Promise<TransactionResponse> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          nozzle: true,
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const finalAmount = Math.round(volumeDelivered * transaction.pricePerLiter);

      // Update transaction
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          volume: volumeDelivered,
          totalAmount: finalAmount,
          completedAt: new Date(),
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          nozzle: {
            select: {
              id: true,
              code: true,
              fuelType: true,
              pricePerLiter: true,
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
      });

      // Update nozzle totals and set back to AVAILABLE
      await prisma.nozzle.update({
        where: { id: transaction.nozzleId },
        data: {
          status: NozzleStatus.AVAILABLE,
          totalVolume: {
            increment: volumeDelivered,
          },
          totalAmount: {
            increment: finalAmount,
          },
        },
      });

      logger.info(`Transaction completed: ${transactionId}`, {
        volumeDelivered,
        finalAmount,
      });

      return updatedTransaction as TransactionResponse;
    } catch (error) {
      logger.error('Error completing transaction:', error);
      throw error;
    }
  }

  /**
   * Cancel a transaction
   */
  async cancel(transactionId: string, userId: string): Promise<void> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.userId !== userId) {
        throw new Error('You do not have permission to cancel this transaction');
      }

      if (
        transaction.status !== TransactionStatus.PENDING &&
        transaction.status !== TransactionStatus.PROCESSING
      ) {
        throw new Error('Transaction cannot be cancelled');
      }

      // Stop pump if fueling is in progress
      pumpSimulator.stop(transactionId);

      // Update transaction
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      // Set nozzle back to AVAILABLE
      await prisma.nozzle.update({
        where: { id: transaction.nozzleId },
        data: { status: NozzleStatus.AVAILABLE },
      });

      logger.info(`Transaction cancelled: ${transactionId}`);
    } catch (error) {
      logger.error('Error cancelling transaction:', error);
      throw error;
    }
  }

  /**
   * Find all transactions with filters and pagination
   */
  async findAll(filters: TransactionFilters): Promise<{
    transactions: TransactionResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.TransactionWhereInput = {};

      if (filters.stationId) {
        where.stationId = filters.stationId;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      // Get total count
      const total = await prisma.transaction.count({ where });

      // Get transactions
      const transactions = await prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          nozzle: {
            select: {
              id: true,
              code: true,
              fuelType: true,
              pricePerLiter: true,
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
      });

      const totalPages = Math.ceil(total / limit);

      return {
        transactions: transactions as TransactionResponse[],
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error finding transactions:', error);
      throw error;
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<TransactionResponse | null> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          nozzle: {
            select: {
              id: true,
              code: true,
              fuelType: true,
              pricePerLiter: true,
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
      });

      return transaction as TransactionResponse | null;
    } catch (error) {
      logger.error('Error finding transaction by ID:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();
