import { Request, Response } from 'express';
import { reportService } from './report.service';
import { ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

class ReportController {
  /**
   * Get station statistics
   * GET /api/v1/reports/stations/:stationId?period=today
   */
  async getStationStats(req: Request, res: Response): Promise<void> {
    try {
      const { stationId } = req.params;
      const period = (req.query.period as 'today' | 'week' | 'month') || 'today';

      // Validate period
      if (!['today', 'week', 'month'].includes(period)) {
        return ApiResponse.badRequest(res, 'Invalid period. Must be: today, week, or month');
      }

      const stats = await reportService.getStationStats(stationId, period);

      ApiResponse.success(res, 'Station statistics retrieved successfully', stats);
    } catch (error: any) {
      logger.error('Error in get station stats:', error);
      ApiResponse.error(res, 'Failed to retrieve station statistics', error);
    }
  }

  /**
   * Get network statistics for all stations owned by current user
   * GET /api/v1/reports/network
   */
  async getNetworkStats(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;

      const stats = await reportService.getNetworkStats(ownerId);

      ApiResponse.success(res, 'Network statistics retrieved successfully', stats);
    } catch (error: any) {
      logger.error('Error in get network stats:', error);
      ApiResponse.error(res, 'Failed to retrieve network statistics', error);
    }
  }

  /**
   * Get daily report for a station
   * GET /api/v1/reports/stations/:stationId/daily?date=2026-04-11
   */
  async getDailyReport(req: Request, res: Response): Promise<void> {
    try {
      const { stationId } = req.params;
      const dateParam = req.query.date as string;

      // Default to today if no date provided
      const date = dateParam ? new Date(dateParam) : new Date();

      // Validate date
      if (isNaN(date.getTime())) {
        return ApiResponse.badRequest(res, 'Invalid date format. Use YYYY-MM-DD');
      }

      const report = await reportService.getDailyReport(stationId, date);

      ApiResponse.success(res, 'Daily report retrieved successfully', report);
    } catch (error: any) {
      logger.error('Error in get daily report:', error);
      ApiResponse.error(res, 'Failed to retrieve daily report', error);
    }
  }
}

export const reportController = new ReportController();
