import { StationStatus } from '@prisma/client';

/**
 * Create Station DTO
 */
export interface CreateStationDto {
  name: string;
  code: string;
  address: string;
  city: string;
  region: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
}

/**
 * Update Station DTO
 */
export interface UpdateStationDto {
  name?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  status?: StationStatus;
  managerId?: string;
}

/**
 * Station Filters for listing
 */
export interface StationFilters {
  city?: string;
  region?: string;
  status?: StationStatus;
  search?: string; // Search by name or code
  page?: number;
  limit?: number;
}

/**
 * Station Response (with relations)
 */
export interface StationResponse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  status: StationStatus;
  ownerId: string;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  pumps?: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    nozzles?: Array<{
      id: string;
      code: string;
      fuelType: string;
      status: string;
      pricePerLiter: number;
    }>;
  }>;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}
