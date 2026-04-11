import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import {
  RegisterDto,
  LoginDto,
  AuthTokens,
  AuthResponse,
  JwtPayload,
  UserInfo,
} from './auth.types';

class AuthService {
  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Check phone uniqueness if provided
    if (dto.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (existingPhone) {
        throw new AppError('User with this phone number already exists', 409);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || UserRole.CUSTOMER,
      },
    });

    logger.info(`New user registered: ${user.email} (${user.role})`);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact support', 403);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in: ${user.email}`);

    // Generate tokens
    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    token: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthTokens> {
    // Verify refresh token
    try {
      jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Check if refresh token exists in database and not revoked
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshToken || refreshToken.isRevoked) {
      throw new AppError('Invalid or revoked refresh token', 401);
    }

    // Check if token is expired
    if (new Date() > refreshToken.expiresAt) {
      throw new AppError('Refresh token expired', 401);
    }

    // Check if user is active
    if (!refreshToken.user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { isRevoked: true },
    });

    logger.info(`Token refreshed for user: ${refreshToken.user.email}`);

    // Generate new tokens
    return this.generateTokens(refreshToken.user, userAgent, ipAddress);
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(token: string): Promise<void> {
    // Find and revoke refresh token
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (refreshToken && !refreshToken.isRevoked) {
      await prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: { isRevoked: true },
      });

      logger.info(`User logged out, token revoked: ${refreshToken.userId}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserInfo> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    return this.sanitizeUser(user);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthTokens> {
    // Create JWT payload
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = jwt.sign(
      payload,
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY } as jwt.SignOptions
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      payload,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY } as jwt.SignOptions
    );

    // Calculate expiry date for refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Save refresh token to database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): UserInfo {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Clean up expired refresh tokens (cron job)
   */
  async cleanupExpiredTokens(): Promise<void> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 7 days old
        ],
      },
    });

    logger.info(`Cleaned up ${result.count} expired/revoked refresh tokens`);
  }
}

export default new AuthService();
