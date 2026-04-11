import { Router } from 'express';
import { stationController } from './station.controller';
import { authenticate, authorize } from '../../middleware/authenticate';

const router = Router();

/**
 * Public routes (authenticated but all roles)
 */

/**
 * @route   GET /api/v1/stations
 * @desc    Get all stations with filters
 * @access  Private (all authenticated users)
 */
router.get(
  '/',
  authenticate,
  (req, res) => stationController.findAll(req, res)
);

/**
 * @route   GET /api/v1/stations/:id
 * @desc    Get station by ID
 * @access  Private (all authenticated users)
 */
router.get(
  '/:id',
  authenticate,
  (req, res) => stationController.findById(req, res)
);

/**
 * @route   GET /api/v1/stations/:id/stats
 * @desc    Get station statistics
 * @access  Private (all authenticated users)
 */
router.get(
  '/:id/stats',
  authenticate,
  (req, res) => stationController.getStats(req, res)
);

/**
 * Owner-only routes
 */

/**
 * @route   POST /api/v1/stations
 * @desc    Create a new station
 * @access  Private (OWNER only)
 */
router.post(
  '/',
  authenticate,
  authorize('OWNER'),
  (req, res) => stationController.create(req, res)
);

/**
 * @route   GET /api/v1/stations/my-stations
 * @desc    Get stations owned by current user
 * @access  Private (OWNER only)
 */
router.get(
  '/my/stations',
  authenticate,
  authorize('OWNER'),
  (req, res) => stationController.getMyStations(req, res)
);

/**
 * @route   PUT /api/v1/stations/:id
 * @desc    Update station
 * @access  Private (OWNER or assigned MANAGER)
 */
router.put(
  '/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  (req, res) => stationController.update(req, res)
);

/**
 * @route   DELETE /api/v1/stations/:id
 * @desc    Delete station (soft delete)
 * @access  Private (OWNER only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('OWNER'),
  (req, res) => stationController.delete(req, res)
);

/**
 * @route   POST /api/v1/stations/:id/pumps
 * @desc    Add a pump to a station
 * @access  Private (OWNER only)
 */
router.post(
  '/:id/pumps',
  authenticate,
  authorize('OWNER'),
  (req, res) => stationController.addPumpToStation(req, res)
);

/**
 * @route   POST /api/v1/stations/:id/pumps/:pumpId/nozzles
 * @desc    Add a nozzle to a pump
 * @access  Private (OWNER only)
 */
router.post(
  '/:id/pumps/:pumpId/nozzles',
  authenticate,
  authorize('OWNER'),
  (req, res) => stationController.addNozzleToPump(req, res)
);

export default router;
