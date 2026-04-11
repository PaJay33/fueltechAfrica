import { PumpStatus } from '@prisma/client';

/**
 * Create Pump DTO
 */
export interface CreatePumpDto {
  name: string;
  code: string;
  stationId: string;
}

/**
 * Update Pump DTO
 */
export interface UpdatePumpDto {
  name?: string;
  status?: PumpStatus;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
}

/**
 * Pump Response (with relations)
 */
export interface PumpResponse {
  id: string;
  name: string;
  code: string;
  status: PumpStatus;
  stationId: string;
  lastMaintenanceDate: Date | null;
  nextMaintenanceDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  nozzles?: Array<{
    id: string;
    code: string;
    fuelType: string;
    status: string;
    pricePerLiter: number;
    currentReading: number;
    previousReading: number;
  }>;
  station?: {
    id: string;
    name: string;
    code: string;
  };
}
