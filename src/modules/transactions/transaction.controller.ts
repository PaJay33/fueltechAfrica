import { Request, Response } from 'express';
import { transactionService } from './transaction.service';
import { waveService } from './wave.service';
import { ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import {
  initiateTransactionSchema,
  transactionIdSchema,
} from './transaction.validation';
import { TransactionStatus } from '@prisma/client';

class TransactionController {
  /**
   * Initiate a new transaction
   * POST /api/v1/transactions
   */
  async initiateTransaction(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const dto = initiateTransactionSchema.parse(req.body);

      // Get customer ID from authenticated user
      const customerId = req.user!.id;

      // Initiate transaction
      const result = await transactionService.initiate(customerId, dto);

      return ApiResponse.created(res, result, 'Transaction initiated successfully');
    } catch (error: any) {
      logger.error('Error in initiate transaction:', error);

      if (error.message === 'Nozzle not found') {
        return ApiResponse.notFound(res, error.message);
      }

      if (
        error.message === 'Nozzle is not available' ||
        error.message === 'Pump is not active'
      ) {
        return ApiResponse.badRequest(res, error.message);
      }

      if (error.message === 'WAVE_PAYMENT_FAILED') {
        return ApiResponse.error(res, 'Failed to initiate Wave payment', 500, error);
      }

      return ApiResponse.error(res, 'Failed to initiate transaction', 500, error);
    }
  }

  /**
   * Get all transactions with filters
   * GET /api/v1/transactions
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        stationId: req.query.stationId as string | undefined,
        userId: req.query.userId as string | undefined,
        status: req.query.status as TransactionStatus | undefined,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await transactionService.findAll(filters);

      return ApiResponse.success(res, result, 'Transactions retrieved successfully');
    } catch (error: any) {
      logger.error('Error in get transactions:', error);
      return ApiResponse.error(res, 'Failed to retrieve transactions', 500, error);
    }
  }

  /**
   * Get transaction by ID
   * GET /api/v1/transactions/:id
   */
  async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      // Validate transaction ID
      const { id } = transactionIdSchema.parse(req.params);

      const transaction = await transactionService.findById(id);

      if (!transaction) {
        return ApiResponse.notFound(res, 'Transaction not found');
      }

      return ApiResponse.success(res, transaction, 'Transaction retrieved successfully');
    } catch (error: any) {
      logger.error('Error in get transaction by ID:', error);
      return ApiResponse.error(res, 'Failed to retrieve transaction', 500, error);
    }
  }

  /**
   * Cancel a transaction
   * DELETE /api/v1/transactions/:id
   */
  async cancelTransaction(req: Request, res: Response): Promise<void> {
    try {
      // Validate transaction ID
      const { id } = transactionIdSchema.parse(req.params);

      // Get user ID from authenticated user
      const userId = req.user!.id;

      await transactionService.cancel(id, userId);

      return ApiResponse.success(res, null, 'Transaction cancelled successfully');
    } catch (error: any) {
      logger.error('Error in cancel transaction:', error);

      if (error.message === 'Transaction not found') {
        return ApiResponse.notFound(res, error.message);
      }

      if (
        error.message === 'You do not have permission to cancel this transaction' ||
        error.message === 'Transaction cannot be cancelled'
      ) {
        return ApiResponse.badRequest(res, error.message);
      }

      return ApiResponse.error(res, 'Failed to cancel transaction', 500, error);
    }
  }

  /**
   * Wave payment webhook
   * POST /api/v1/transactions/webhook/wave
   */
  async waveWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Get signature from headers
      const signature = req.headers['x-wave-signature'] as string | undefined;

      // Process webhook through Wave service
      const { transactionId, status } = waveService.handleWebhook(req.body, signature);

      // Update transaction status
      await transactionService.handleWaveWebhook(transactionId, status);

      return ApiResponse.success(res, null, 'Webhook processed successfully');
    } catch (error: any) {
      logger.error('Error in Wave webhook:', error);

      if (error.message === 'Invalid webhook signature') {
        return ApiResponse.unauthorized(res, error.message);
      }

      if (error.message === 'Transaction not found') {
        return ApiResponse.notFound(res, error.message);
      }

      return ApiResponse.error(res, 'Failed to process webhook', 500, error);
    }
  }
}

export const transactionController = new TransactionController();
