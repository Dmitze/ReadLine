/**
 * Safe Callback Query Handler
 * ✅ ВИПРАВЛЕНО #8: Єдине місце для безпечної обробки callback queries
 *
 * Запобігає помилкам при обробці callback queries, які можуть бути вже відповідані або застарілі
 */

import { BotContext } from '../types/telegraf';
import { logger } from './logger';

/**
 * Безпечно відповідає на callback query з логуванням помилок
 */
export async function safeAnswerCbQuery(
  ctx: BotContext,
  notification?: string,
  options?: { show_alert?: boolean }
): Promise<void> {
  try {
    await ctx.answerCbQuery(notification, options);
  } catch (error) {
    logger.debug('Failed to answer callback query', {
      error: error instanceof Error ? error.message : String(error),
      userId: ctx.from?.id,
      callbackQueryId: ctx.callbackQuery?.id,
    });
    // Не кидаємо помилку - це нормально, якщо запит вже оброблений
  }
}

/**
 * Альтернатива для обробника callback queries з автоматичною безпечною обробкою
 */
export function createSafeCallbackHandler(
  handler: (ctx: BotContext) => Promise<void>
): (ctx: BotContext) => Promise<void> {
  return async (ctx: BotContext) => {
    try {
      // Спочатку відповідаємо на callback query
      await safeAnswerCbQuery(ctx);
      // Потім виконуємо основний обробник
      await handler(ctx);
    } catch (error) {
      logger.error('Error in callback handler', error instanceof Error ? error : new Error(String(error)), {
        userId: ctx.from?.id,
        action: ctx.callbackQuery?.data,
      });
      try {
        await ctx.reply('❌ Виникла помилка при обробці запиту. Спробуйте ще раз.');
      } catch (replyError) {
        logger.error('Failed to send error message', replyError instanceof Error ? replyError : new Error(String(replyError)));
      }
    }
  };
}
