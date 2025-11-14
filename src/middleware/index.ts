/**
 * Middleware barrel export
 * REFACTOR-013: Rate Limiting
 * REFACTOR-015: CORS + Security Headers
 */

// REFACTOR-013: Rate Limiting Middleware
export {
  RateLimiter,
  PerUserRateLimiter,
  PerCommandRateLimiter,
  PerIPRateLimiter,
  GlobalRateLimiter,
  CompositeRateLimiter,
  MemoryRateLimitStore,
  createRateLimiters,
  type RateLimitConfig,
  type RateLimitStore,
  type RateLimitStats
} from './RateLimiter';

// REFACTOR-015: CORS + Security Headers
export {
  securityHeadersMiddleware,
  corsMiddleware,
  requestValidationMiddleware,
  xssPreventionMiddleware,
  createSecurityContextMiddleware,
  createSecurityMiddlewareStack,
  SecurityContext,
  type CORSConfig,
  type SecurityHeadersConfig,
  type UserSecurityContext
} from './SecurityHeaders';
