import { z } from 'zod';
import { FuelType } from '@prisma/client';

export const createPumpSchema = z.object({
  name: z.string().min(1, 'Pump name is required'),
  code: z.string().min(1, 'Pump code is required').transform(val => val.toUpperCase()),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
});

export const createNozzleSchema = z.object({
  code: z.string().min(1, 'Nozzle code is required').transform(val => val.toUpperCase()),
  fuelType: z.nativeEnum(FuelType),
  pricePerLiter: z.number().positive('Price must be greater than 0'),
});

export type CreatePumpDto = z.infer<typeof createPumpSchema>;
export type CreateNozzleDto = z.infer<typeof createNozzleSchema>;
