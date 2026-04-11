import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from '../utils/logger';

interface SocketData {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

let io: SocketIOServer;

/**
 * Initialize Socket.IO server
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(','),
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;

      // Attach user data to socket
      (socket.data as SocketData).user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      return next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const userData = (socket.data as SocketData).user;
    logger.info(`Socket connected: ${socket.id}`, {
      userId: userData?.id,
      email: userData?.email,
    });

    // Handle station room join
    socket.on('join_station', (data: { stationId: string }) => {
      const roomName = `station:${data.stationId}`;
      socket.join(roomName);
      logger.info(`Socket ${socket.id} joined room: ${roomName}`);

      socket.emit('joined_station', {
        stationId: data.stationId,
        message: 'Successfully joined station room',
      });
    });

    // Handle station room leave
    socket.on('leave_station', (data: { stationId: string }) => {
      const roomName = `station:${data.stationId}`;
      socket.leave(roomName);
      logger.info(`Socket ${socket.id} left room: ${roomName}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized successfully');
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};
