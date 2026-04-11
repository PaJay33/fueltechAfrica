import { Router } from 'express';
import { reportController } from './report.controller';
import { authenticate, authorize } from '../../middleware/authenticate';

const router = Router();

/**
 * @route   GET /api/v1/reports/stations/:stationId
 * @desc    Get station statistics
 * @access  Private (OWNER, MANAGER)
 */
router.get(
  '/stations/:stationId',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  (req, res) => reportController.getStationStats(req, res)
);

/**
 * @route   GET /api/v1/reports/network
 * @desc    Get network statistics for all owned stations
 * @access  Private (OWNER only)
 */
router.get(
  '/network',
  authenticate,
  authorize('OWNER'),
  (req, res) => reportController.getNetworkStats(req, res)
);

/**
 * @route   GET /api/v1/reports/stations/:stationId/daily
 * @desc    Get daily report for a station
 * @access  Private (OWNER, MANAGER)
 */
router.get(
  '/stations/:stationId/daily',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  (req, res) => reportController.getDailyReport(req, res)
);

export default router;
