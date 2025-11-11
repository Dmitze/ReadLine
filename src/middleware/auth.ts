/**
 * Auth Middleware - перевірка прав доступу
 */

import { Context, Middleware } from 'telegraf';
import { isAdmin } from '../database/models';
import { logger } from '../utils/logger';
import { ERRORS } from '../constants';

/**
 * Middleware для перевірки чи користувач є адміном
 * ✅ ВИПРАВЛЕНО #12: правильна блокування не-адмінів
 */
export const requireAdmin: Middleware<Context> = async (ctx, next) => {
  try {
    const userId = ctx.from?.id;
    
    if (!userId) {
      await ctx.reply(ERRORS.NO_ADMIN_ACCESS);
      logger.warn('Auth attempt without user ID');
      return; // ✅ Блокуємо виконання, не викликаємо next()
    }
    
    const isUserAdmin = await isAdmin(userId);
    
    if (!isUserAdmin) {
      await ctx.reply(ERRORS.NO_ADMIN_ACCESS);
      logger.warn('Unauthorized admin access attempt', { userId });
      return; // ✅ Блокуємо виконання, не викликаємо next()
    }
    
    // ✅ Тільки для адмінів викликаємо next()
    return next();
  } catch (error) {
    logger.error('Error in admin middleware', error, { userId: ctx.from?.id });
    await ctx.reply(ERRORS.GENERIC);
    // ✅ Не викликаємо next() при помилці
  }
};

/**
 * Middleware для логування дій користувачів
 */
export const logUserAction: Middleware<Context> = async (ctx, next) => {
  const userId = ctx.from?.id;
  const messageText = 'text' in ctx.message! ? ctx.message.text : 'non-text';
  
  logger.userAction(userId || 0, 'message', {
    type: ctx.updateType,
    text: messageText,
  });
  
  return next();
};

/**
 * Middleware для перевірки чи бот може відповісти користувачу
 */
export const canReply: Middleware<Context> = async (ctx, next) => {
  try {
    // Перевіряємо чи можемо відправити повідомлення
    if (!ctx.from) {
      logger.warn('Message without sender');
      return;
    }
    
    return next();
  } catch (error) {
    logger.error('Error in canReply middleware', error);
  }
};
