import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from '../config/env';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create format for development (colorized and pretty)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Create format for production (JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine which format to use
const logFormat = env.NODE_ENV === 'production' ? productionFormat : developmentFormat;

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: env.LOG_LEVEL,
  }),
];

// Add file transports only in production or if LOG_FILE_PATH is set
if (env.NODE_ENV === 'production' || env.LOG_FILE_PATH) {
  // Error logs
  transports.push(
    new DailyRotateFile({
      level: 'error',
      dirname: env.LOG_FILE_PATH,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.json(),
    })
  );

  // Combined logs (all levels)
  transports.push(
    new DailyRotateFile({
      dirname: env.LOG_FILE_PATH,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.json(),
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  levels,
  level: env.LOG_LEVEL,
  format: logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(env.LOG_FILE_PATH, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(env.LOG_FILE_PATH, 'rejections.log'),
    }),
  ],
});

// Create a stream object for Morgan HTTP logger integration
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
