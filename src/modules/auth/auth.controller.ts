import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../middleware/errorHandler';
import authService from './auth.service';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.validation';

class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Register user
    const result = await authService.register(validatedData);

    return ApiResponse.created(res, result, 'User registered successfully');
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Get user agent and IP address
    const userAgent = req.get('user-agent');
    const ipAddress = req.ip;

    // Login user
    const result = await authService.login(validatedData, userAgent, ipAddress);

    return ApiResponse.success(res, result, 'Login successful');
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Get user agent and IP address
    const userAgent = req.get('user-agent');
    const ipAddress = req.ip;

    // Refresh token
    const tokens = await authService.refreshToken(refreshToken, userAgent, ipAddress);

    return ApiResponse.success(res, tokens, 'Token refreshed successfully');
  });

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Logout user
    await authService.logout(refreshToken);

    return ApiResponse.success(res, null, 'Logout successful');
  });

  /**
   * Get current user
   * GET /api/v1/auth/me
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    // User is attached by authenticate middleware
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Unauthorized');
    }

    // Get user details
    const user = await authService.getUserById(req.user.id);

    return ApiResponse.success(res, user, 'User retrieved successfully');
  });
}

export default new AuthController();
