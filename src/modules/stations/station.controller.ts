import { Request, Response } from 'express';
import { stationService } from './station.service';
import { ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import {
  createStationSchema,
  updateStationSchema,
  stationFiltersSchema,
  stationIdSchema,
} from './station.validation';
import { createPumpSchema } from '../pumps/pump.validation';
import { createNozzleSchema } from '../nozzles/nozzle.validation';

class StationController {
  /**
   * Create a new station
   * POST /api/v1/stations
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const dto = createStationSchema.parse(req.body);

      // Get owner ID from authenticated user
      const ownerId = req.user!.id;

      // Create station
      const station = await stationService.create(ownerId, dto);

      ApiResponse.created(res, 'Station created successfully', station);
    } catch (error: any) {
      logger.error('Error in create station:', error);

      if (error.message === 'Station code already exists') {
        return ApiResponse.badRequest(res, error.message);
      }

      ApiResponse.error(res, 'Failed to create station', error);
    }
  }

  /**
   * Get all stations with filters
   * GET /api/v1/stations
   */
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const filters = stationFiltersSchema.parse({
        city: req.query.city,
        region: req.query.region,
        status: req.query.status,
        search: req.query.search,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      });

      const result = await stationService.findAll(filters);

      ApiResponse.success(res, 'Stations retrieved successfully', result.stations, {
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      logger.error('Error in find all stations:', error);
      ApiResponse.error(res, 'Failed to retrieve stations', error);
    }
  }

  /**
   * Get station by ID
   * GET /api/v1/stations/:id
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      // Validate station ID
      const { id } = stationIdSchema.parse(req.params);

      const station = await stationService.findById(id);

      if (!station) {
        return ApiResponse.notFound(res, 'Station not found');
      }

      ApiResponse.success(res, 'Station retrieved successfully', station);
    } catch (error: any) {
      logger.error('Error in find station by ID:', error);
      ApiResponse.error(res, 'Failed to retrieve station', error);
    }
  }

  /**
   * Update station
   * PUT /api/v1/stations/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      // Validate station ID
      const { id } = stationIdSchema.parse(req.params);

      // Validate request body
      const dto = updateStationSchema.parse(req.body);

      // Verify user has access to this station
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await stationService.verifyAccess(id, userId, userRole);

      if (!hasAccess && userRole !== 'OWNER') {
        return ApiResponse.forbidden(res, 'You do not have permission to update this station');
      }

      // Update station
      const station = await stationService.update(id, dto);

      ApiResponse.success(res, 'Station updated successfully', station);
    } catch (error: any) {
      logger.error('Error in update station:', error);

      if (error.message === 'Station not found') {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message === 'Manager not found' || error.message === 'User is not a manager') {
        return ApiResponse.badRequest(res, error.message);
      }

      ApiResponse.error(res, 'Failed to update station', error);
    }
  }

  /**
   * Delete station (soft delete)
   * DELETE /api/v1/stations/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      // Validate station ID
      const { id } = stationIdSchema.parse(req.params);

      // Verify user has access to this station
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await stationService.verifyAccess(id, userId, userRole);

      if (!hasAccess && userRole !== 'OWNER') {
        return ApiResponse.forbidden(res, 'You do not have permission to delete this station');
      }

      await stationService.delete(id);

      ApiResponse.success(res, 'Station deleted successfully');
    } catch (error: any) {
      logger.error('Error in delete station:', error);

      if (error.message === 'Station not found') {
        return ApiResponse.notFound(res, error.message);
      }

      ApiResponse.error(res, 'Failed to delete station', error);
    }
  }

  /**
   * Get stations owned by current user
   * GET /api/v1/stations/my-stations
   */
  async getMyStations(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const stations = await stationService.findByOwnerId(ownerId);

      ApiResponse.success(res, 'Your stations retrieved successfully', stations);
    } catch (error: any) {
      logger.error('Error in get my stations:', error);
      ApiResponse.error(res, 'Failed to retrieve your stations', error);
    }
  }

  /**
   * Get station statistics
   * GET /api/v1/stations/:id/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      // Validate station ID
      const { id } = stationIdSchema.parse(req.params);

      const station = await stationService.findById(id);

      if (!station) {
        return ApiResponse.notFound(res, 'Station not found');
      }

      // Calculate statistics
      const totalPumps = station.pumps?.length || 0;
      const activePumps = station.pumps?.filter(p => p.status === 'ACTIVE').length || 0;
      const totalNozzles = station.pumps?.reduce((acc, pump) => acc + (pump.nozzles?.length || 0), 0) || 0;
      const activeNozzles = station.pumps?.reduce(
        (acc, pump) => acc + (pump.nozzles?.filter(n => n.status === 'ACTIVE').length || 0),
        0
      ) || 0;

      const stats = {
        station: {
          id: station.id,
          name: station.name,
          code: station.code,
          status: station.status,
        },
        pumps: {
          total: totalPumps,
          active: activePumps,
          inactive: totalPumps - activePumps,
        },
        nozzles: {
          total: totalNozzles,
          active: activeNozzles,
          inactive: totalNozzles - activeNozzles,
        },
      };

      ApiResponse.success(res, 'Station statistics retrieved successfully', stats);
    } catch (error: any) {
      logger.error('Error in get station stats:', error);
      ApiResponse.error(res, 'Failed to retrieve station statistics', error);
    }
  }

  /**
   * Add a pump to a station
   * POST /api/v1/stations/:id/pumps
   */
  async addPumpToStation(req: Request, res: Response): Promise<void> {
    try {
      const { id: stationId } = req.params;
      const ownerId = req.user!.id;
      const dto = createPumpSchema.parse(req.body);

      const pump = await stationService.addPump(stationId, ownerId, dto);

      return ApiResponse.created(res, 'Pump added to station successfully', pump);
    } catch (error: any) {
      logger.error('Error in add pump to station:', error);

      if (error.message === 'Station not found') {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message === 'You do not own this station') {
        return ApiResponse.forbidden(res, error.message);
      }

      if (error.message === 'Pump code already exists in this station') {
        return ApiResponse.badRequest(res, error.message);
      }

      ApiResponse.error(res, 'Failed to add pump to station', error);
    }
  }

  /**
   * Add a nozzle to a pump
   * POST /api/v1/stations/:id/pumps/:pumpId/nozzles
   */
  async addNozzleToPump(req: Request, res: Response): Promise<void> {
    try {
      const { id: stationId, pumpId } = req.params;
      const ownerId = req.user!.id;
      const dto = createNozzleSchema.parse(req.body);

      const nozzle = await stationService.addNozzle(pumpId, stationId, ownerId, dto);

      return ApiResponse.created(res, 'Nozzle added to pump successfully', nozzle);
    } catch (error: any) {
      logger.error('Error in add nozzle to pump:', error);

      if (error.message === 'Station not found' || error.message === 'Pump not found') {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message === 'You do not own this station') {
        return ApiResponse.forbidden(res, error.message);
      }

      if (error.message === 'Pump does not belong to this station') {
        return ApiResponse.badRequest(res, error.message);
      }

      if (error.message === 'Nozzle code already exists in this pump') {
        return ApiResponse.badRequest(res, error.message);
      }

      ApiResponse.error(res, 'Failed to add nozzle to pump', error);
    }
  }
}

export const stationController = new StationController();
