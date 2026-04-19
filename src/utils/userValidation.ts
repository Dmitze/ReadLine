import { Context } from 'telegraf';
import { logger } from './logger';

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

export const requireValidUserId = async (ctx: Context, next: () => Promise<void>) => {
  const userId = validateUserId(ctx);

  if (!userId) {
    await ctx.reply(
      '❌ Помилка ідентифікації користувача. Спробуйте перезапустити бота командою /start'
    );
    return;
  }

  (ctx as any).userId = userId;

  return next();
};

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
