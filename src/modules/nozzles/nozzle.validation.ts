import { z } from 'zod';
import { FuelType } from '@prisma/client';

export const createNozzleSchema = z.object({
  code: z.string().min(1, 'Nozzle code is required').transform(val => val.toUpperCase()),
  fuelType: z.nativeEnum(FuelType),
  pricePerLiter: z.number().positive('Price must be greater than 0'),
});

export type CreateNozzleDto = z.infer<typeof createNozzleSchema>;
