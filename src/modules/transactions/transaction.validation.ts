import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

/**
 * Validation schema for initiating a transaction
 */
export const initiateTransactionSchema = z.object({
  nozzleId: z.string().cuid('Invalid nozzle ID format'),

  presetAmount: z
    .number()
    .min(500, 'Preset amount must be at least 500 FCFA')
    .max(100000, 'Preset amount must not exceed 100,000 FCFA'),

  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
});

/**
 * Validation schema for transaction ID parameter
 */
export const transactionIdSchema = z.object({
  id: z.string().cuid('Invalid transaction ID format'),
});

/**
 * Type exports
 */
export type InitiateTransactionInput = z.infer<typeof initiateTransactionSchema>;
