import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export class Database {
  static async connect(): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('Database connection error:', error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

export default prisma;
