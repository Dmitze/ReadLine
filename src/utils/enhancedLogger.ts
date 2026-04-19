import winston from 'winston';
import path from 'path';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message} `;
  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }
  return msg;
});

export const enhancedLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
  defaultMeta: {
    service: 'warriors-library-bot',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),

    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),

    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
  ],

  exitOnError: false,
});

enhancedLogger.exceptions.handle(
  new winston.transports.File({
    filename: path.join('logs', 'exceptions.log'),
  })
);

enhancedLogger.rejections.handle(
  new winston.transports.File({
    filename: path.join('logs', 'rejections.log'),
  })
);

export const loggers = {
  userAction: (userId: number, action: string, metadata?: object) => {
    enhancedLogger.info('User action', {
      userId,
      action,
      ...metadata,
      type: 'user_action',
    });
  },

  adminAction: (adminId: number, action: string, metadata?: object) => {
    enhancedLogger.info('Admin action', {
      adminId,
      action,
      ...metadata,
      type: 'admin_action',
    });
  },

  dbQuery: (query: string, duration: number, metadata?: object) => {
    enhancedLogger.debug('Database query', {
      query,
      duration,
      ...metadata,
      type: 'db_query',
    });
  },

  aiRequest: (userId: number, prompt: string, duration: number, metadata?: object) => {
    enhancedLogger.info('AI request', {
      userId,
      prompt: prompt.substring(0, 100),
      duration,
      ...metadata,
      type: 'ai_request',
    });
  },

  performance: (metric: string, value: number, metadata?: object) => {
    enhancedLogger.info('Performance metric', {
      metric,
      value,
      ...metadata,
      type: 'performance',
    });
  },

  security: (
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: object
  ) => {
    enhancedLogger.warn('Security event', {
      event,
      severity,
      ...metadata,
      type: 'security',
    });
  },
};

export default enhancedLogger;
