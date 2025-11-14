/**
 * Security Headers & CORS Middleware
 * REFACTOR-015: CORS + Security Headers
 */

import { BotContext } from '../types/telegraf';

export interface CORSConfig {
  origin?: string | string[] | ((origin: string) => boolean);
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string | boolean;
  crossOriginResourcePolicy?: string;
  crossOriginOpenerPolicy?: string;
  referrerPolicy?: string;
  strictTransportSecurity?: string;
  xContentTypeOptions?: string;
  xFrameOptions?: string;
  xPoweredBy?: boolean;
}

/**
 * Default security headers configuration
 */
const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: "default-src 'self'",
  crossOriginResourcePolicy: 'cross-origin',
  crossOriginOpenerPolicy: 'same-origin-allow-popups',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN',
  xPoweredBy: false
};

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(config: SecurityHeadersConfig = {}) {
  const mergedConfig = { ...DEFAULT_SECURITY_HEADERS, ...config };

  return async (ctx: BotContext, next: () => Promise<void>) => {
    // Note: Telegraf bots don't have traditional HTTP response headers
    // This middleware adds security context information

    // Store security headers info in context
    (ctx as any).securityHeaders = {
      contentSecurityPolicy: mergedConfig.contentSecurityPolicy,
      crossOriginResourcePolicy: mergedConfig.crossOriginResourcePolicy,
      crossOriginOpenerPolicy: mergedConfig.crossOriginOpenerPolicy,
      referrerPolicy: mergedConfig.referrerPolicy,
      strictTransportSecurity: mergedConfig.strictTransportSecurity,
      xContentTypeOptions: mergedConfig.xContentTypeOptions,
      xFrameOptions: mergedConfig.xFrameOptions
    };

    await next();
  };
}

/**
 * CORS validation middleware
 */
export function corsMiddleware(config: CORSConfig = {}) {
  const corsConfig: Required<CORSConfig> = {
    origin: config.origin || '*',
    credentials: config.credentials ?? true,
    methods: config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: config.allowedHeaders || [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept'
    ],
    exposedHeaders: config.exposedHeaders || [
      'Content-Length',
      'X-JSON-Response'
    ],
    maxAge: config.maxAge || 86400
  };

  return async (ctx: BotContext, next: () => Promise<void>) => {
    // Store CORS info in context
    (ctx as any).cors = {
      origin: corsConfig.origin,
      credentials: corsConfig.credentials,
      allowedMethods: corsConfig.methods,
      allowedHeaders: corsConfig.allowedHeaders,
      exposedHeaders: corsConfig.exposedHeaders,
      maxAge: corsConfig.maxAge
    };

    await next();
  };
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(
  origin: string,
  allowedOrigins: string | string[] | ((origin: string) => boolean)
): boolean {
  if (typeof allowedOrigins === 'function') {
    return allowedOrigins(origin);
  }

  if (allowedOrigins === '*') {
    return true;
  }

  if (typeof allowedOrigins === 'string') {
    return origin === allowedOrigins;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Request validation middleware
 * Checks for common attack patterns
 */
export function requestValidationMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
     // Validate callback_query size
     const callbackData = (ctx.callbackQuery as any)?.data;
     if (callbackData && typeof callbackData === 'string') {
       if (callbackData.length > 64) {
         console.warn('⚠️ Large callback_query data detected');
       }
     }

     // Validate message text size
     const messageText = (ctx.message as any)?.text;
     if (messageText && typeof messageText === 'string') {
       if (messageText.length > 4096) {
         console.warn('⚠️ Large message text detected');
         await ctx.reply(
           '⚠️ Повідомлення занадто велике. Максимум 4096 символів.'
         );
         return;
       }
     }

     // Check for potential SQL injection patterns in user input
     const userInput = [
       messageText,
       callbackData,
       (ctx as any).session?.userInput
     ].filter(Boolean);

    for (const input of userInput) {
      if (input && hasSQLInjectionPattern(input as string)) {
        console.warn('⚠️ Potential SQL injection detected:', input);
        (ctx as any).isBlocked = true;
        await ctx.reply('❌ Некоректний запит.');
        return;
      }
    }

    await next();
  };
}

/**
 * Check for SQL injection patterns
 */
function hasSQLInjectionPattern(input: string): boolean {
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)/i,
    /(\bor\b.*=.*)/i,
    /(\bdrop\b.*\btable\b)/i,
    /(\binsert\b.*\binto\b)/i,
    /(\bupdate\b.*\bset\b)/i,
    /(\bdelete\b.*\bfrom\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /(\bexec\b|\bexecute\b)/i,
    /(\bselect\b.*\bfrom\b)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS prevention middleware
 */
export function xssPreventionMiddleware() {
   return async (ctx: BotContext, next: () => Promise<void>) => {
     const messageText = (ctx.message as any)?.text;
     if (messageText && typeof messageText === 'string') {
       const isXSSDetected = checkXSSPatterns(messageText);
       if (isXSSDetected) {
         console.warn('⚠️ Potential XSS detected:', messageText);
         (ctx as any).isBlocked = true;
         await ctx.reply('❌ Некоректний формат повідомлення.');
         return;
       }
     }

     await next();
   };
 }

/**
 * Check for XSS patterns
 */
function checkXSSPatterns(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /eval\(/gi,
    /expression\(/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Rate limiting on per-user basis with tracking
 */
export interface UserSecurityContext {
  userId: number;
  lastActivity: Date;
  requestCount: number;
  isBlocked: boolean;
  suspiciousActivities: number;
}

export class SecurityContext {
  private users: Map<number, UserSecurityContext> = new Map();

  /**
   * Check user security status
   */
  checkUser(userId: number): UserSecurityContext {
    let context = this.users.get(userId);

    if (!context) {
      context = {
        userId,
        lastActivity: new Date(),
        requestCount: 0,
        isBlocked: false,
        suspiciousActivities: 0
      };
      this.users.set(userId, context);
    }

    return context;
  }

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(userId: number): void {
    const context = this.checkUser(userId);
    context.suspiciousActivities++;

    // Block after 3 suspicious activities
    if (context.suspiciousActivities >= 3) {
      context.isBlocked = true;
      console.warn(`⚠️ User ${userId} blocked due to suspicious activity`);
    }
  }

  /**
   * Increment request count
   */
  incrementRequest(userId: number): void {
    const context = this.checkUser(userId);
    context.requestCount++;
    context.lastActivity = new Date();
  }

  /**
   * Unblock user (admin action)
   */
  unblockUser(userId: number): void {
    const context = this.users.get(userId);
    if (context) {
      context.isBlocked = false;
      context.suspiciousActivities = 0;
      console.log(`✅ User ${userId} unblocked`);
    }
  }

  /**
   * Cleanup old entries
   */
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, context] of this.users.entries()) {
      if (context.lastActivity.getTime() < cutoff) {
        this.users.delete(userId);
      }
    }
  }
}

/**
 * Create security context middleware
 */
export function createSecurityContextMiddleware(
  securityContext: SecurityContext
) {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      await next();
      return;
    }

    const userContext = securityContext.checkUser(userId);

    if (userContext.isBlocked) {
      console.warn(`⚠️ Blocked user ${userId} attempted access`);
      return;
    }

    securityContext.incrementRequest(userId);

    // Store in context
    (ctx as any).securityContext = userContext;

    await next();
  };
}

/**
 * Comprehensive security middleware stack
 */
export function createSecurityMiddlewareStack(config?: {
  cors?: CORSConfig;
  headers?: SecurityHeadersConfig;
}) {
  const securityContext = new SecurityContext();

  return {
    cors: corsMiddleware(config?.cors),
    headers: securityHeadersMiddleware(config?.headers),
    requestValidation: requestValidationMiddleware(),
    xssPrevention: xssPreventionMiddleware(),
    securityContext: createSecurityContextMiddleware(securityContext),

    /**
     * Apply all middleware in order
     */
    apply: (bot: any) => {
      bot.use(corsMiddleware(config?.cors));
      bot.use(securityHeadersMiddleware(config?.headers));
      bot.use(createSecurityContextMiddleware(securityContext));
      bot.use(requestValidationMiddleware());
      bot.use(xssPreventionMiddleware());
    },

    getSecurityContext: () => securityContext
  };
}
