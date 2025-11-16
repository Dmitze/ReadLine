import { Telegraf } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import { rateLimitMessage, rateLimitCallback, rateLimitCommand } from '../middleware/rateLimit';
import { getMainMenuKeyboard } from '../keyboards/mainKeyboards';

export function setupMiddleware(bot: Telegraf<BotContext>) {
  bot.use(async (ctx, next) => {
    logger.info('Processing update', { updateId: ctx.update.update_id });
    await next();
  });

  bot.use(rateLimitMessage);
  bot.use(rateLimitCommand);
  bot.on('callback_query', rateLimitCallback);

  // 🔥 КРИТИЧНО: Middleware що ЗАВЖДИ додає головне меню
  bot.use(async (ctx, next) => {
    // Зберігаємо оригінальний метод reply
    const originalReply = ctx.reply.bind(ctx);

    // Перевизначаємо reply щоб завжди додавати головне меню
    ctx.reply = async (text: string, extra?: any) => {
      // Якщо вже є reply_markup, не змінюємо його (для inline клавіатур)
      if (extra?.reply_markup && extra.reply_markup.inline_keyboard) {
        return originalReply(text, extra);
      }

      // Інакше додаємо головне меню
      return originalReply(text, {
        ...extra,
        reply_markup: extra?.reply_markup || getMainMenuKeyboard(),
      });
    };

    await next();
  });

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
