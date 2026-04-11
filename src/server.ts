import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';

import { env } from './config/env';
import { Database } from './config/database';
import { logger } from './utils/logger';
import { ApiResponse } from './utils/apiResponse';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import stationRoutes from './modules/stations/station.routes';

class Server {
  private app: Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  /**
   * Configure Express middleware
   */
  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(
      cors({
        origin: env.CORS_ORIGIN.split(','),
        credentials: true,
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookie parser
    this.app.use(cookieParser());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use('/api', limiter);

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  /**
   * Configure API routes
   */
  private configureRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'FuelTech Africa API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // API root
    this.app.get('/api', (_req: Request, res: Response) => {
      return ApiResponse.success(
        res,
        {
          name: 'FuelTech Africa API',
          version: env.API_VERSION || 'v1',
          description: 'Plateforme de digitalisation des stations-service en Afrique',
        },
        'Welcome to FuelTech Africa API'
      );
    });

    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/stations', stationRoutes);

    // 404 handler
    this.app.use(notFoundHandler);
  }

  /**
   * Configure error handling
   */
  private configureErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Connect to database
      await Database.connect();

      // Start listening
      const PORT = env.PORT || 3000;

      this.app.listen(PORT, () => {
        logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 FuelTech Africa API Server                          ║
║                                                           ║
║   Environment: ${env.NODE_ENV.padEnd(42)} ║
║   Port:        ${String(PORT).padEnd(42)} ║
║   URL:         http://localhost:${PORT}${' '.repeat(23)} ║
║                                                           ║
║   Health:      http://localhost:${PORT}/health${' '.repeat(17)} ║
║   API Docs:    http://localhost:${PORT}/api${' '.repeat(20)} ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down server...');

    try {
      await Database.disconnect();
      logger.info('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();

// Handle process termination
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  server.shutdown();
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  server.shutdown();
});

// Start the server
server.start();

export default server;
