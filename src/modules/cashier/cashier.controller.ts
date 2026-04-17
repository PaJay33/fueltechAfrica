import { Request, Response } from 'express';
import { cashierService } from './cashier.service';
import { ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import { z } from 'zod';

// Validation schemas
const loginWithPinSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits'),
  stationId: z.string().cuid(),
});

const closeSessionSchema = z.object({
  closingCashAmount: z.number().min(0, 'Closing cash amount must be positive'),
  notes: z.string().optional(),
});

class CashierController {
  /**
   * Login with PIN
   * POST /api/v1/cashier/login-pin
   */
  async loginWithPin(req: Request, res: Response): Promise<void> {
    try {
      const { pin, stationId } = loginWithPinSchema.parse(req.body);

      const result = await cashierService.loginWithPin(pin, stationId);

      ApiResponse.success(res, result, 'Login successful');
    } catch (error: any) {
      logger.error('Error in cashier login with PIN:', error);

      if (error.message === 'No attendants found for this station') {
        ApiResponse.badRequest(res, error.message);
        return;
      }

      if (error.message === 'Invalid PIN') {
        ApiResponse.unauthorized(res, 'Invalid PIN');
        return;
      }

      ApiResponse.error(res, 'Failed to login', 500, error);
    }
  }

  /**
   * Close session
   * POST /api/v1/cashier/close-session
   */
  async closeSession(req: Request, res: Response): Promise<void> {
    try {
      const { closingCashAmount, notes } = closeSessionSchema.parse(req.body);
      const attendantId = req.user!.id;

      const closedSession = await cashierService.closeSession(
        attendantId,
        closingCashAmount,
        notes
      );

      ApiResponse.success(res, closedSession, 'Session closed successfully');
    } catch (error: any) {
      logger.error('Error in close session:', error);

      if (error.message === 'No active session found') {
        ApiResponse.notFound(res, error.message);
        return;
      }

      ApiResponse.error(res, 'Failed to close session', 500, error);
    }
  }

  /**
   * Get active session
   * GET /api/v1/cashier/session/active
   */
  async getActiveSession(req: Request, res: Response): Promise<void> {
    try {
      const attendantId = req.user!.id;

      const session = await cashierService.getActiveSession(attendantId);

      if (!session) {
        ApiResponse.notFound(res, 'No active session found');
        return;
      }

      ApiResponse.success(res, session, 'Active session retrieved successfully');
    } catch (error: any) {
      logger.error('Error in get active session:', error);
      ApiResponse.error(res, 'Failed to retrieve active session', 500, error);
    }
  }

  /**
   * Get session report
   * GET /api/v1/cashier/session/:id/report
   */
  async getSessionReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      const report = await cashierService.getSessionReport(id);

      ApiResponse.success(res, report, 'Session report retrieved successfully');
    } catch (error: any) {
      logger.error('Error in get session report:', error);

      if (error.message === 'Session not found') {
        ApiResponse.notFound(res, error.message);
        return;
      }

      ApiResponse.error(res, 'Failed to retrieve session report', 500, error);
    }
  }

  /**
   * Get session summary for a station
   * GET /api/v1/cashier/station/:stationId/summary
   */
  async getSessionSummary(req: Request, res: Response): Promise<void> {
    try {
      const { stationId } = req.params;

      if (!stationId) {
        ApiResponse.badRequest(res, 'Station ID is required');
        return;
      }

      const summary = await cashierService.getSessionSummary(stationId);

      ApiResponse.success(res, summary, 'Session summary retrieved successfully');
    } catch (error: any) {
      logger.error('Error in get session summary:', error);
      ApiResponse.error(res, 'Failed to retrieve session summary', 500, error);
    }
  }
}

export const cashierController = new CashierController();
