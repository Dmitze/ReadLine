import { Telegraf } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import { rateLimitMessage, rateLimitCallback, rateLimitCommand } from '../middleware/rateLimit';

export function setupMiddleware(bot: Telegraf<BotContext>) {
  bot.use(async (ctx, next) => {
    logger.info('Processing update', { updateId: ctx.update.update_id });
    await next();
  });

  bot.use(rateLimitMessage);
  bot.use(rateLimitCommand);
  bot.on('callback_query', rateLimitCallback);

  bot.use(async (ctx, next) => {
    if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text;

      if (text === '/start') {
        if (ctx.scene) {
          await ctx.scene.leave();
        }
        return next();
      }

      if (text === '/cancel') {
        if (ctx.scene) {
          await ctx.scene.leave();
          await ctx.reply('❌ Дію скасовано. Ви повернулися в головне меню.');
          return;
        }
      }
    }

    return next();
  });
}
