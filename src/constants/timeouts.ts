/**
 * Timeout Constants
 * REFACTOR-011: Replace Magic Numbers
 * 
 * Всі timeout значення в мілісекундах
 */

export const TIMEOUTS = {
  // Database operations
  DATABASE_BUSY: 3000,           // SQLite busy_timeout
  DATABASE_QUERY: 5000,          // General query timeout
  DATABASE_TRANSACTION: 10000,   // Transaction timeout
  
  // Message operations  
  MESSAGE_DELETE_DELAY: 300,     // Delay before deleting messages
  MESSAGE_SEND_DELAY: 500,       // Delay between sending messages
  TYPING_INDICATOR: 2000,        // Typing indicator duration
  
  // AI operations
  AI_REQUEST: 30000,             // AI API request timeout
  AI_SEARCH: 10000,              // AI search timeout
  
  // Cache
  CACHE_TTL: 300000,             // 5 minutes cache TTL
  CACHE_CLEANUP: 600000,         // 10 minutes cache cleanup interval
  CACHE_SHORT: 60000,            // 1 minute short cache
  
  // HTTP/API
  API_REQUEST: 5000,             // API request timeout
  HTTP_TIMEOUT: 10000,           // HTTP request timeout
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 60000,      // 1 minute rate limit window
  
  // Retry delays
  RETRY_INITIAL: 500,            // Initial retry delay
  RETRY_MAX: 10000,              // Maximum retry delay
  
  // Queue operations
  QUEUE_PROCESS_DELAY: 500,      // Delay between queue processing
  QUEUE_CLEANUP: 3000,           // Queue cleanup delay
} as const;

/**
 * Helper to convert seconds to milliseconds
 */
export const seconds = (n: number): number => n * 1000;

/**
 * Helper to convert minutes to milliseconds
 */
export const minutes = (n: number): number => n * 60 * 1000;

/**
 * Helper to convert hours to milliseconds
 */
export const hours = (n: number): number => n * 60 * 60 * 1000;
