import { Response } from 'express';

interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  timestamp: string;
}

interface PaginatedResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  pagination: PaginationMeta;
  timestamp: string;
}

/**
 * Standardized API Response utility class
 */
export class ApiResponse {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200
  ): Response<SuccessResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message = 'Error',
    statusCode = 500,
    errors?: unknown
  ): Response<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T,
    pagination: PaginationMeta,
    message = 'Success',
    statusCode = 200
  ): Response<PaginatedResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send created response (201)
   */
  static created<T>(res: Response, data: T, message = 'Resource created successfully'): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(res: Response, message = 'Bad request', errors?: unknown): Response {
    return ApiResponse.error(res, message, 400, errors);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return ApiResponse.error(res, message, 401);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(res: Response, message = 'Forbidden'): Response {
    return ApiResponse.error(res, message, 403);
  }

  /**
   * Send not found response (404)
   */
  static notFound(res: Response, message = 'Resource not found'): Response {
    return ApiResponse.error(res, message, 404);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(res: Response, message = 'Conflict', errors?: unknown): Response {
    return ApiResponse.error(res, message, 409, errors);
  }

  /**
   * Send internal server error response (500)
   */
  static serverError(res: Response, message = 'Internal server error', errors?: unknown): Response {
    return ApiResponse.error(res, message, 500, errors);
  }
}

/**
 * Helper to calculate pagination metadata
 */
export const calculatePagination = (
  totalItems: number,
  page: number,
  pageSize: number
): PaginationMeta => {
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    currentPage: page,
    pageSize,
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
};
