/**
 * Enhanced Logger with Winston
 * Production-ready structured logging
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Custom log format for console
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message} `;
  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }
  return msg;
});

// Create logger instance
export const enhancedLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: {
    service: 'readline-bot',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    // Error log
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
    
    // Console (development)
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
  ],
  
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions
enhancedLogger.exceptions.handle(
  new winston.transports.File({
    filename: path.join('logs', 'exceptions.log'),
  })
);

// Handle unhandled promise rejections
enhancedLogger.rejections.handle(
  new winston.transports.File({
    filename: path.join('logs', 'rejections.log'),
  })
);

// Helper methods
export const loggers = {
  // User action logging
  userAction: (userId: number, action: string, metadata?: object) => {
    enhancedLogger.info('User action', {
      userId,
      action,
      ...metadata,
      type: 'user_action',
    });
  },

  // Admin action logging
  adminAction: (adminId: number, action: string, metadata?: object) => {
    enhancedLogger.info('Admin action', {
      adminId,
      action,
      ...metadata,
      type: 'admin_action',
    });
  },

  // Database query logging
  dbQuery: (query: string, duration: number, metadata?: object) => {
    enhancedLogger.debug('Database query', {
      query,
      duration,
      ...metadata,
      type: 'db_query',
    });
  },

  // AI request logging
  aiRequest: (userId: number, prompt: string, duration: number, metadata?: object) => {
    enhancedLogger.info('AI request', {
      userId,
      prompt: prompt.substring(0, 100), // Truncate for privacy
      duration,
      ...metadata,
      type: 'ai_request',
    });
  },

  // Performance metric logging
  performance: (metric: string, value: number, metadata?: object) => {
    enhancedLogger.info('Performance metric', {
      metric,
      value,
      ...metadata,
      type: 'performance',
    });
  },

  // Security event logging
  security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: object) => {
    enhancedLogger.warn('Security event', {
      event,
      severity,
      ...metadata,
      type: 'security',
    });
  },
};

export default enhancedLogger;
