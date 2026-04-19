import { Context, Middleware } from 'telegraf';
import { isAdmin } from '../database/models';
import { logger } from '../utils/logger';
import { ERRORS } from '../constants';

export const requireAdmin: Middleware<Context> = async (ctx, next) => {
  try {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply(ERRORS.NO_ADMIN_ACCESS);
      logger.warn('Auth attempt without user ID');
      return;
    }

    const isUserAdmin = await isAdmin(userId);

    if (!isUserAdmin) {
      await ctx.reply(ERRORS.NO_ADMIN_ACCESS);
      logger.warn('Unauthorized admin access attempt', { userId });
      return;
    }

    await next();
  } catch (error) {
    logger.error(
      'Error in admin middleware',
      error instanceof Error ? error : new Error(String(error)),
      { userId: ctx.from?.id }
    );
    await ctx.reply(ERRORS.GENERIC);
  }
};

export const logUserAction: Middleware<Context> = async (ctx, next) => {
  const userId = ctx.from?.id;
  const messageText = 'text' in ctx.message! ? ctx.message.text : 'non-text';

  logger.userAction(userId || 0, 'message', {
    type: ctx.updateType,
    text: messageText,
  });

  return next();
};

export const canReply: Middleware<Context> = async (ctx, next) => {
  try {
    if (!ctx.from) {
      logger.warn('Message without sender');
      return;
    }

    return next();
  } catch (error) {
    logger.error('Error in canReply middleware', error);
  }
};
