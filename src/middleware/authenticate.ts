import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { ApiResponse } from '../utils/apiResponse';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authenticate middleware - Verifies JWT token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ApiResponse.unauthorized(res, 'No token provided');
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      ApiResponse.unauthorized(res, 'No token provided');
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      ApiResponse.unauthorized(res, 'Invalid token');
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      ApiResponse.unauthorized(res, 'Token expired');
      return;
    }

    next(error);
  }
};

/**
 * Authorize middleware - Checks if user has required role(s)
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user exists (should be set by authenticate middleware)
    if (!req.user) {
      ApiResponse.unauthorized(res, 'Unauthorized');
      return;
    }

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      ApiResponse.forbidden(
        res,
        'You do not have permission to access this resource'
      );
      return;
    }

    next();
  };
};

/**
 * Optional authenticate - Does not fail if no token provided
 * Useful for routes that work differently for authenticated users
 */
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      next();
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // If token is invalid, continue without user
    next();
  }
};

/**
 * Verify user owns resource - Generic ownership check
 */
export const verifyOwnership = (userIdGetter: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.unauthorized(res, 'Unauthorized');
      return;
    }

    const resourceUserId = userIdGetter(req);

    // Allow if user is OWNER or if it's their own resource
    if (req.user.role === UserRole.OWNER || req.user.id === resourceUserId) {
      next();
      return;
    }

    ApiResponse.forbidden(res, 'You do not have permission to access this resource');
  };
};
