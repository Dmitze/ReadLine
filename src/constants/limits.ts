/**
 * Limit Constants
 * REFACTOR-011: Replace Magic Numbers
 *
 * Всі ліміти та обмеження
 */

export const LIMITS = {
  // Pagination
  BOOKS_PER_PAGE: 5,
  SEARCH_RESULTS: 10,
  DISPLAY_LIMIT: 10,
  MAX_DISPLAY: 20,

  // Items per request
  TOP_BOOKS: 10,
  NEW_BOOKS: 10,
  POPULAR_BOOKS: 10,
  RECOMMENDATIONS: 10,
  TAGS_LIMIT: 10,

  // Wizard steps
  ADD_BOOK_STEPS_TOTAL: 12, // Нові кроки: ISBN, Language, Physical availability (без кількості), File formats (до 3)

  // User limits
  SAVED_BOOKS_MAX: 20,
  MAX_REVIEWS_PER_USER: 100,

  // Text length
  TITLE_MIN: 2,
  TITLE_MAX: 200,
  AUTHOR_MIN: 2,
  AUTHOR_MAX: 100,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 1000,
  COMMENT_MIN: 10,
  COMMENT_MAX: 500,
  REVIEW_MAX: 500,
  MESSAGE_MAX: 4000,
  TAG_MIN: 2,
  TAG_MAX: 50,
  PROMO_CODE_MAX: 20,

  // Input validation limits
  MAX_CALLBACK_DATA_LENGTH: 64,
  MAX_USERNAME_LENGTH: 32,
  MAX_FIRST_NAME_LENGTH: 64,
  MAX_LAST_NAME_LENGTH: 64,
  MAX_GENRE_LENGTH: 50,
  MAX_URL_LENGTH: 2048,
  MAX_ARRAY_SIZE: 100,
  MAX_OBJECT_DEPTH: 10,

  // Token/Key validation
  BOT_TOKEN_MIN: 20,
  API_KEY_MIN: 20,
  FILE_ID_MIN: 20,

  // File sizes (in bytes)
  PHOTO_MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  FILE_MAX_SIZE: 50 * 1024 * 1024, // 50 MB
  AUDIO_MAX_SIZE: 20 * 1024 * 1024, // 20 MB

  // Database
  BATCH_SIZE: 500,
  MAX_QUERY_METRICS: 10000,
  SLOW_QUERY_THRESHOLD: 100, // ms
  LARGE_TABLE_THRESHOLD: 10000, // rows

  // Processing
  AI_BATCH_SIZE: 3,

  // Rate limiting
  RATE_LIMIT_MAX_REQUESTS: 20,
  RATE_LIMIT_SEARCH: 20,
  RATE_LIMIT_ADD_BOOK: 10,
  RATE_LIMIT_COMMAND: 10,

  // Rating
  RATING_MIN: 1,
  RATING_MAX: 5,
  RATING_DECIMALS: 1, // Round to 0.1

  // Statistics
  MAX_ANALYTICS_SIZE: 500,
  ANALYTICS_RETENTION: 30, // days

  // Queue
  MAX_QUEUE_SIZE: 1000,
  QUEUE_BATCH_SIZE: 10,

  // Logging
  MAX_LOG_FILES: 10,
  LOG_MAX_SIZE: 10 * 1024 * 1024, // 10 MB

  // Timeouts (in milliseconds)
  AI_SEARCH_TIMEOUT: 10000,
  AI_REQUEST_TIMEOUT: 30000,
  CACHE_DEFAULT_TTL: 3600000, // 1 hour
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  CLEANUP_INTERVAL: 300000, // 5 minutes
} as const;

/**
 * Percentage constants
 */
export const PERCENTAGES = {
  ANALYTICS_CLEANUP_THRESHOLD: 0.2, // 20%
  JITTER_AMOUNT: 0.1, // 10%
  CACHE_HIT_TARGET: 0.8, // 80%
} as const;

/**
 * Discount values (percentage)
 */
export const DISCOUNTS = {
  SEASONAL: 20,
  STUDENT: 10,
  LOYALTY: 15,
  PROMO: 10,
} as const;
