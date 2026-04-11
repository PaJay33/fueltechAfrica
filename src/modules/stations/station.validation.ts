import { z } from 'zod';
import { StationStatus } from '@prisma/client';

/**
 * Validation schema for creating a station
 */
export const createStationSchema = z.object({
  name: z.string()
    .min(3, 'Station name must be at least 3 characters')
    .max(100, 'Station name must not exceed 100 characters')
    .trim(),

  code: z.string()
    .min(3, 'Station code must be at least 3 characters')
    .max(20, 'Station code must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Station code must be uppercase alphanumeric only')
    .transform(val => val.toUpperCase()),

  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must not exceed 200 characters')
    .trim(),

  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City must not exceed 50 characters')
    .trim(),

  region: z.string()
    .min(2, 'Region must be at least 2 characters')
    .max(50, 'Region must not exceed 50 characters')
    .trim(),

  country: z.string()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country must not exceed 50 characters')
    .trim()
    .default('Senegal')
    .optional(),

  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),

  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),

  phone: z.string()
    .regex(/^\+221(77|78|76|70|75)[0-9]{7}$/, 'Phone must be a valid Senegalese number (e.g., +221771234567)')
    .optional(),

  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .optional(),
}).refine(
  (data) => {
    // If latitude is provided, longitude must also be provided
    if (data.latitude !== undefined && data.longitude === undefined) {
      return false;
    }
    if (data.longitude !== undefined && data.latitude === undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Both latitude and longitude must be provided together',
    path: ['latitude'],
  }
);

/**
 * Validation schema for updating a station
 */
export const updateStationSchema = z.object({
  name: z.string()
    .min(3, 'Station name must be at least 3 characters')
    .max(100, 'Station name must not exceed 100 characters')
    .trim()
    .optional(),

  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must not exceed 200 characters')
    .trim()
    .optional(),

  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City must not exceed 50 characters')
    .trim()
    .optional(),

  region: z.string()
    .min(2, 'Region must be at least 2 characters')
    .max(50, 'Region must not exceed 50 characters')
    .trim()
    .optional(),

  country: z.string()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country must not exceed 50 characters')
    .trim()
    .optional(),

  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),

  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),

  phone: z.string()
    .regex(/^\+221(77|78|76|70|75)[0-9]{7}$/, 'Phone must be a valid Senegalese number (e.g., +221771234567)')
    .optional(),

  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .optional(),

  status: z.nativeEnum(StationStatus, {
    errorMap: () => ({ message: 'Invalid station status' }),
  }).optional(),

  managerId: z.string()
    .cuid('Invalid manager ID format')
    .optional(),
}).refine(
  (data) => {
    // If latitude is provided, longitude must also be provided
    if (data.latitude !== undefined && data.longitude === undefined) {
      return false;
    }
    if (data.longitude !== undefined && data.latitude === undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Both latitude and longitude must be provided together',
    path: ['latitude'],
  }
);

/**
 * Validation schema for station filters
 */
export const stationFiltersSchema = z.object({
  city: z.string().trim().optional(),
  region: z.string().trim().optional(),
  status: z.nativeEnum(StationStatus).optional(),
  search: z.string().trim().optional(),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(20).optional(),
});

/**
 * Validation schema for station ID parameter
 */
export const stationIdSchema = z.object({
  id: z.string().cuid('Invalid station ID format'),
});

/**
 * Type exports
 */
export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
export type StationFiltersInput = z.infer<typeof stationFiltersSchema>;
