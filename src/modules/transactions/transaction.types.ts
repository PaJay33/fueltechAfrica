import { Transaction, TransactionStatus, PaymentMethod, FuelType } from '@prisma/client';

/**
 * DTO for initiating a transaction
 */
export interface InitiateTransactionDto {
  nozzleId: string;
  presetAmount: number;
  paymentMethod: PaymentMethod;
}

/**
 * Filters for querying transactions
 */
export interface TransactionFilters {
  stationId?: string;
  userId?: string;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Transaction response with relations
 */
export interface TransactionResponse extends Transaction {
  station?: {
    id: string;
    name: string;
    code: string;
  };
  nozzle?: {
    id: string;
    code: string;
    fuelType: FuelType;
    pricePerLiter: number;
    pump?: {
      id: string;
      name: string;
      code: string;
    };
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Response when initiating a transaction
 */
export interface InitiateTransactionResponse {
  transaction: TransactionResponse;
  checkoutUrl?: string;
}
