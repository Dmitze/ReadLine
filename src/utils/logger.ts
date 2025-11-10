/**
 * Logger Service - централізоване логування
 * Замінює console.log/console.error по всьому проекту
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    const formatted = this.formatMessage(level, message, meta);

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.log(`🔍 ${formatted}`);
        }
        break;
      case LogLevel.INFO:
        console.log(`ℹ️ ${formatted}`);
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${formatted}`);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${formatted}`);
        break;
    }
  }

  /**
   * Debug логи - тільки в development
   */
  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Інформаційні логи
   */
  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Попередження
   */
  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Помилки
   */
  error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...meta,
    } : { error, ...meta };

    this.log(LogLevel.ERROR, message, errorMeta);
  }

  /**
   * Логування запитів користувачів
   */
  userAction(userId: number, action: string, details?: any): void {
    this.info(`User action: ${action}`, {
      userId,
      ...details,
    });
  }

  /**
   * Логування адмін дій
   */
  adminAction(adminId: number, action: string, details?: any): void {
    this.warn(`Admin action: ${action}`, {
      adminId,
      ...details,
    });
  }

  /**
   * Логування database queries (debug)
   */
  dbQuery(query: string, params?: any[]): void {
    this.debug('Database query', { query, params });
  }

  /**
   * Логування AI запитів
   */
  aiRequest(userId: number, question: string, response: string): void {
    this.info('AI request', {
      userId,
      questionLength: question.length,
      responseLength: response.length,
    });
  }
}

// Singleton instance
export const logger = new Logger();

// Експортуємо також клас для можливого extends
export { Logger, LogLevel };
