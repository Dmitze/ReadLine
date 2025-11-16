/**
 * User Validation Utilities
 * ✅ ВИПРАВЛЕНО #6: централізована валідація user_id
 */

import { Context } from 'telegraf';
import { logger } from './logger';

/**
 * Валідує та отримує userId з контексту
 * @param ctx Telegraf контекст
 * @returns userId або null якщо невалідний
 */
export const validateUserId = (ctx: Context): number | null => {
  const userId = ctx.from?.id;

  if (!userId || typeof userId !== 'number' || userId <= 0) {
    logger.warn('Invalid user ID', {
      userId,
      from: ctx.from,
      updateType: ctx.updateType,
    });
    return null;
  }

  return userId;
};

/**
 * Middleware для валідації userId з автоматичною відповіддю
 * @param ctx Telegraf контекст
 * @param next Наступний middleware
 */
export const requireValidUserId = async (ctx: Context, next: () => Promise<void>) => {
  const userId = validateUserId(ctx);

  if (!userId) {
    await ctx.reply(
      '❌ Помилка ідентифікації користувача. Спробуйте перезапустити бота командою /start'
    );
    return;
  }

  // Додаємо userId до контексту для зручності
  (ctx as any).userId = userId;

  return next();
};

/**
 * Перевіряє чи userId валідний та відповідає на помилку
 * @param ctx Telegraf контекст
 * @returns true якщо валідний, false якщо ні (та відправлено повідомлення про помилку)
 */
export const checkUserIdOrReply = async (ctx: Context): Promise<boolean> => {
  const userId = validateUserId(ctx);

  if (!userId) {
    await ctx.reply(
      '❌ Помилка ідентифікації користувача. Спробуйте перезапустити бота командою /start'
    );
    return false;
  }

  return true;
};
