import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Custom Application Error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Prisma errors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const field = (error.meta?.target as string[])?.join(', ') || 'field';
      return new AppError(`A record with this ${field} already exists`, 409);
    }

    case 'P2025': {
      // Record not found
      return new AppError('Record not found', 404);
    }

    case 'P2003': {
      // Foreign key constraint failed
      return new AppError('Related record not found', 404);
    }

    case 'P2014': {
      // Required relation violation
      return new AppError('Invalid relation data provided', 400);
    }

    case 'P2011': {
      // Null constraint violation
      const field = error.meta?.target || 'field';
      return new AppError(`${field} cannot be null`, 400);
    }

    case 'P2000': {
      // Value too long for column
      return new AppError('Value provided is too long', 400);
    }

    default: {
      logger.error('Unhandled Prisma error:', { code: error.code, meta: error.meta });
      return new AppError('Database operation failed', 500);
    }
  }
};

/**
 * Handle Zod validation errors
 */
const handleZodError = (error: ZodError): AppError => {
  const errors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  const message = 'Validation failed';
  const appError = new AppError(message, 400);
  (appError as AppError & { errors: typeof errors }).errors = errors;

  return appError;
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response => {
  let error = err;

  // Log error
  logger.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Handle specific error types
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(error);
  } else if (error instanceof ZodError) {
    error = handleZodError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    error = new AppError('Invalid data provided', 400);
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    error = new AppError('Database connection failed', 503);
  }

  // Handle AppError
  if (error instanceof AppError) {
    return ApiResponse.error(
      res,
      error.message,
      error.statusCode,
      (error as AppError & { errors?: unknown }).errors
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // Handle validation errors from other libraries
  if (error.name === 'ValidationError') {
    return ApiResponse.badRequest(res, error.message);
  }

  // Handle syntax errors (malformed JSON)
  if (error instanceof SyntaxError && 'body' in error) {
    return ApiResponse.badRequest(res, 'Invalid JSON payload');
  }

  // Default to 500 internal server error
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : error.message;

  return ApiResponse.serverError(res, message);
};

/**
 * Handle 404 errors (route not found)
 */
export const notFoundHandler = (req: Request, res: Response): Response => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
