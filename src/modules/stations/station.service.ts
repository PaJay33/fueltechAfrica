import { Prisma, StationStatus, PumpStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import {
  CreateStationDto,
  UpdateStationDto,
  StationFilters,
  StationResponse,
} from './station.types';
import { CreatePumpDto } from '../pumps/pump.types';
import { PumpResponse } from '../pumps/pump.types';
import { CreateNozzleDto, NozzleResponse } from '../nozzles/nozzle.types';

class StationService {
  /**
   * Create a new station
   */
  async create(ownerId: string, dto: CreateStationDto): Promise<StationResponse> {
    try {
      // Check if station code already exists
      const existingStation = await prisma.station.findUnique({
        where: { code: dto.code.toUpperCase() },
      });

      if (existingStation) {
        throw new Error('Station code already exists');
      }

      // Create the station
      const station = await prisma.station.create({
        data: {
          name: dto.name,
          code: dto.code.toUpperCase(),
          address: dto.address,
          city: dto.city,
          region: dto.region,
          country: dto.country || 'Senegal',
          latitude: dto.latitude || null,
          longitude: dto.longitude || null,
          phone: dto.phone || null,
          email: dto.email || null,
          ownerId,
          status: StationStatus.ACTIVE,
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          pumps: {
            include: {
              nozzles: {
                select: {
                  id: true,
                  code: true,
                  fuelType: true,
                  status: true,
                  pricePerLiter: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Station created: ${station.id} - ${station.name}`);
      return station as StationResponse;
    } catch (error) {
      logger.error('Error creating station:', error);
      throw error;
    }
  }

  /**
   * Find all stations with filters and pagination
   */
  async findAll(filters: StationFilters): Promise<{
    stations: StationResponse[];
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
      const where: Prisma.StationWhereInput = {};

      if (filters.city) {
        where.city = { contains: filters.city, mode: 'insensitive' };
      }

      if (filters.region) {
        where.region = { contains: filters.region, mode: 'insensitive' };
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await prisma.station.count({ where });

      // Get stations
      const stations = await prisma.station.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          pumps: {
            include: {
              nozzles: {
                select: {
                  id: true,
                  code: true,
                  fuelType: true,
                  status: true,
                  pricePerLiter: true,
                },
              },
            },
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        stations: stations as StationResponse[],
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error finding stations:', error);
      throw error;
    }
  }

  /**
   * Find station by ID
   */
  async findById(id: string): Promise<StationResponse | null> {
    try {
      const station = await prisma.station.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          pumps: {
            include: {
              nozzles: {
                select: {
                  id: true,
                  code: true,
                  fuelType: true,
                  status: true,
                  pricePerLiter: true,
                },
              },
            },
          },
        },
      });

      return station as StationResponse | null;
    } catch (error) {
      logger.error('Error finding station by ID:', error);
      throw error;
    }
  }

  /**
   * Update station
   */
  async update(id: string, dto: UpdateStationDto): Promise<StationResponse> {
    try {
      // Check if station exists
      const existingStation = await prisma.station.findUnique({
        where: { id },
      });

      if (!existingStation) {
        throw new Error('Station not found');
      }

      // If managerId is provided, verify the user exists and has MANAGER role
      if (dto.managerId) {
        const manager = await prisma.user.findUnique({
          where: { id: dto.managerId },
        });

        if (!manager) {
          throw new Error('Manager not found');
        }

        if (manager.role !== 'MANAGER') {
          throw new Error('User is not a manager');
        }
      }

      // Update the station
      const station = await prisma.station.update({
        where: { id },
        data: {
          name: dto.name,
          address: dto.address,
          city: dto.city,
          region: dto.region,
          country: dto.country,
          latitude: dto.latitude,
          longitude: dto.longitude,
          phone: dto.phone,
          email: dto.email,
          status: dto.status,
          managerId: dto.managerId,
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          pumps: {
            include: {
              nozzles: {
                select: {
                  id: true,
                  code: true,
                  fuelType: true,
                  status: true,
                  pricePerLiter: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Station updated: ${station.id} - ${station.name}`);
      return station as StationResponse;
    } catch (error) {
      logger.error('Error updating station:', error);
      throw error;
    }
  }

  /**
   * Delete station (soft delete by setting status to INACTIVE)
   */
  async delete(id: string): Promise<void> {
    try {
      const station = await prisma.station.findUnique({
        where: { id },
      });

      if (!station) {
        throw new Error('Station not found');
      }

      await prisma.station.update({
        where: { id },
        data: { status: StationStatus.INACTIVE },
      });

      logger.info(`Station soft-deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting station:', error);
      throw error;
    }
  }

  /**
   * Get stations by owner ID
   */
  async findByOwnerId(ownerId: string): Promise<StationResponse[]> {
    try {
      const stations = await prisma.station.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          pumps: {
            include: {
              nozzles: {
                select: {
                  id: true,
                  code: true,
                  fuelType: true,
                  status: true,
                  pricePerLiter: true,
                },
              },
            },
          },
        },
      });

      return stations as StationResponse[];
    } catch (error) {
      logger.error('Error finding stations by owner ID:', error);
      throw error;
    }
  }

  /**
   * Verify if user owns or manages the station
   */
  async verifyAccess(stationId: string, userId: string, userRole: string): Promise<boolean> {
    try {
      const station = await prisma.station.findUnique({
        where: { id: stationId },
      });

      if (!station) {
        return false;
      }

      // Owner has full access
      if (station.ownerId === userId) {
        return true;
      }

      // Manager has access to their assigned station
      if (station.managerId === userId && userRole === 'MANAGER') {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error verifying station access:', error);
      return false;
    }
  }

  /**
   * Add a pump to a station
   */
  async addPump(stationId: string, ownerId: string, dto: CreatePumpDto): Promise<PumpResponse> {
    try {
      // Verify station exists and user owns it
      const station = await prisma.station.findUnique({
        where: { id: stationId },
      });

      if (!station) {
        throw new Error('Station not found');
      }

      if (station.ownerId !== ownerId) {
        throw new Error('You do not own this station');
      }

      // Check if pump code already exists in this station
      const existingPump = await prisma.pump.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          stationId,
        },
      });

      if (existingPump) {
        throw new Error('Pump code already exists in this station');
      }

      // Create the pump
      const pump = await prisma.pump.create({
        data: {
          name: dto.name,
          code: dto.code.toUpperCase(),
          stationId,
          status: PumpStatus.ACTIVE,
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          nozzles: {
            select: {
              id: true,
              code: true,
              pumpId: true,
              fuelType: true,
              status: true,
              pricePerLiter: true,
              totalVolume: true,
              totalAmount: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      logger.info(`Pump added to station ${stationId}: ${pump.id} - ${pump.name}`);
      return pump as PumpResponse;
    } catch (error) {
      logger.error('Error adding pump to station:', error);
      throw error;
    }
  }

  /**
   * Add a nozzle to a pump
   */
  async addNozzle(pumpId: string, stationId: string, ownerId: string, dto: CreateNozzleDto): Promise<NozzleResponse> {
    try {
      // Verify station exists and user owns it
      const station = await prisma.station.findUnique({
        where: { id: stationId },
      });

      if (!station) {
        throw new Error('Station not found');
      }

      if (station.ownerId !== ownerId) {
        throw new Error('You do not own this station');
      }

      // Verify pump exists and belongs to the station
      const pump = await prisma.pump.findUnique({
        where: { id: pumpId },
      });

      if (!pump) {
        throw new Error('Pump not found');
      }

      if (pump.stationId !== stationId) {
        throw new Error('Pump does not belong to this station');
      }

      // Check if nozzle code already exists in this pump
      const existingNozzle = await prisma.nozzle.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          pumpId,
        },
      });

      if (existingNozzle) {
        throw new Error('Nozzle code already exists in this pump');
      }

      // Create the nozzle
      const nozzle = await prisma.nozzle.create({
        data: {
          code: dto.code.toUpperCase(),
          fuelType: dto.fuelType,
          pricePerLiter: dto.pricePerLiter,
          pumpId,
        },
        include: {
          pump: {
            select: {
              id: true,
              name: true,
              code: true,
              station: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Nozzle added to pump ${pumpId}: ${nozzle.id} - ${nozzle.code}`);
      return nozzle as NozzleResponse;
    } catch (error) {
      logger.error('Error adding nozzle to pump:', error);
      throw error;
    }
  }
}

export const stationService = new StationService();
