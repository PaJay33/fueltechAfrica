import { NozzleStatus, FuelType } from '@prisma/client';

/**
 * Create Nozzle DTO
 */
export interface CreateNozzleDto {
  code: string;
  fuelType: FuelType;
  pricePerLiter: number;
  pumpId: string;
}

/**
 * Update Nozzle DTO
 */
export interface UpdateNozzleDto {
  status?: NozzleStatus;
  pricePerLiter?: number;
  currentReading?: number;
}

/**
 * Nozzle Response
 */
export interface NozzleResponse {
  id: string;
  code: string;
  fuelType: FuelType;
  status: NozzleStatus;
  pricePerLiter: number;
  currentReading: number;
  previousReading: number;
  pumpId: string;
  createdAt: Date;
  updatedAt: Date;
  pump?: {
    id: string;
    name: string;
    code: string;
    station: {
      id: string;
      name: string;
      code: string;
    };
  };
}
