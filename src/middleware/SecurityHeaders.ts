import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';

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

const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: "default-src 'self'",
  crossOriginResourcePolicy: 'cross-origin',
  crossOriginOpenerPolicy: 'same-origin-allow-popups',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN',
  xPoweredBy: false,
};

export function securityHeadersMiddleware(config: SecurityHeadersConfig = {}) {
  const mergedConfig = { ...DEFAULT_SECURITY_HEADERS, ...config };

  return async (ctx: BotContext, next: () => Promise<void>) => {
    (ctx as any).securityHeaders = {
      contentSecurityPolicy: mergedConfig.contentSecurityPolicy,
      crossOriginResourcePolicy: mergedConfig.crossOriginResourcePolicy,
      crossOriginOpenerPolicy: mergedConfig.crossOriginOpenerPolicy,
      referrerPolicy: mergedConfig.referrerPolicy,
      strictTransportSecurity: mergedConfig.strictTransportSecurity,
      xContentTypeOptions: mergedConfig.xContentTypeOptions,
      xFrameOptions: mergedConfig.xFrameOptions,
    };

    await next();
  };
}

export function corsMiddleware(config: CORSConfig = {}) {
  const corsConfig: Required<CORSConfig> = {
    origin: config.origin || '*',
    credentials: config.credentials ?? true,
    methods: config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: config.allowedHeaders || [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: config.exposedHeaders || ['Content-Length', 'X-JSON-Response'],
    maxAge: config.maxAge || 86400,
  };

  return async (ctx: BotContext, next: () => Promise<void>) => {
    (ctx as any).cors = {
      origin: corsConfig.origin,
      credentials: corsConfig.credentials,
      allowedMethods: corsConfig.methods,
      allowedHeaders: corsConfig.allowedHeaders,
      exposedHeaders: corsConfig.exposedHeaders,
      maxAge: corsConfig.maxAge,
    };

    await next();
  };
}

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

export function requestValidationMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const { LIMITS } = await import('../constants/limits');

    const callbackData = (ctx.callbackQuery as any)?.data;
    if (callbackData && typeof callbackData === 'string') {
      if (callbackData.length > LIMITS.MAX_CALLBACK_DATA_LENGTH) {
        logger.warn('⚠️ Large callback_query data detected', {
          length: callbackData.length,
          limit: LIMITS.MAX_CALLBACK_DATA_LENGTH,
        });
        await ctx.answerCbQuery('❌ Дані занадто великі');
        return;
      }
    }

    const messageText = (ctx.message as any)?.text;
    if (messageText && typeof messageText === 'string') {
      if (messageText.length > LIMITS.MESSAGE_MAX) {
        logger.warn('⚠️ Large message text detected', {
          length: messageText.length,
          limit: LIMITS.MESSAGE_MAX,
        });
        await ctx.reply(`⚠️ Повідомлення занадто велике. Максимум ${LIMITS.MESSAGE_MAX} символів.`);
        return;
      }
    }

    const userInput = [messageText, callbackData, (ctx as any).session?.userInput].filter(Boolean);

    for (const input of userInput) {
      if (input && hasSQLInjectionPattern(input as string)) {
        logger.warn(`⚠️ Potential SQL injection detected: ${input}`);
        (ctx as any).isBlocked = true;
        await ctx.reply('❌ Некоректний запит.');
        return;
      }
    }

    await next();
  };
}

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
    /(\bselect\b.*\bfrom\b)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

export function xssPreventionMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const messageText = (ctx.message as any)?.text;
    if (messageText && typeof messageText === 'string') {
      const isXSSDetected = checkXSSPatterns(messageText);
      if (isXSSDetected) {
        logger.warn(`⚠️ Potential XSS detected: ${messageText}`);
        (ctx as any).isBlocked = true;
        await ctx.reply('❌ Некоректний формат повідомлення.');
        return;
      }
    }

    await next();
  };
}

function checkXSSPatterns(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

export interface UserSecurityContext {
  userId: number;
  lastActivity: Date;
  requestCount: number;
  isBlocked: boolean;
  suspiciousActivities: number;
}

export class SecurityContext {
  private users: Map<number, UserSecurityContext> = new Map();

  checkUser(userId: number): UserSecurityContext {
    let context = this.users.get(userId);

    if (!context) {
      context = {
        userId,
        lastActivity: new Date(),
        requestCount: 0,
        isBlocked: false,
        suspiciousActivities: 0,
      };
      this.users.set(userId, context);
    }

    return context;
  }

  recordSuspiciousActivity(userId: number): void {
    const context = this.checkUser(userId);
    context.suspiciousActivities++;

    if (context.suspiciousActivities >= 3) {
      context.isBlocked = true;
      logger.warn(`⚠️ User ${userId} blocked due to suspicious activity`);
    }
  }

  incrementRequest(userId: number): void {
    const context = this.checkUser(userId);
    context.requestCount++;
    context.lastActivity = new Date();
  }

  unblockUser(userId: number): void {
    const context = this.users.get(userId);
    if (context) {
      context.isBlocked = false;
      context.suspiciousActivities = 0;
      logger.info(`✅ User ${userId} unblocked`);
    }
  }

  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    for (const [userId, context] of this.users.entries()) {
      if (context.lastActivity.getTime() < cutoff) {
        this.users.delete(userId);
      }
    }
  }
}

export function createSecurityContextMiddleware(securityContext: SecurityContext) {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      await next();
      return;
    }

    const userContext = securityContext.checkUser(userId);

    if (userContext.isBlocked) {
      logger.warn(`⚠️ Blocked user ${userId} attempted access`);
      return;
    }

    securityContext.incrementRequest(userId);

    (ctx as any).securityContext = userContext;

    await next();
  };
}

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

    apply: (bot: { use: (middleware: unknown) => void }) => {
      bot.use(corsMiddleware(config?.cors));
      bot.use(securityHeadersMiddleware(config?.headers));
      bot.use(createSecurityContextMiddleware(securityContext));
      bot.use(requestValidationMiddleware());
      bot.use(xssPreventionMiddleware());
    },

    getSecurityContext: () => securityContext,
  };
}
