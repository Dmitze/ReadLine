/**
 * Navigation Handlers
 * REFACTOR-009: Split userHandlers.ts
 *
 * Обработчики навигации (назад, home)
 */

import { Telegraf } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { getMainMenuKeyboard } from '../../keyboards/mainKeyboards';

/**
 * Register navigation handlers
 */
export function registerNavigationHandlers(bot: Telegraf<BotContext>): void {
  // Назад к главному меню
  bot.hears('⬅️ Назад', async (ctx) => {
    await ctx.reply('🗡️ Вертаємось на головну базу! ⚔️\n\nОбери свою наступну битву:', {
      reply_markup: getMainMenuKeyboard(),
    });
  });

  // На главную
  bot.hears('🏠 На головну', async (ctx) => {
    await ctx.reply('🗡️ Головна База ⚔️\n\nОбери дію:', {
      reply_markup: getMainMenuKeyboard(),
    });
    logger.userAction(ctx.from!.id, 'go_home');
  });

  // Action: home
  bot.action('home', async (ctx) => {
    try {
      await ctx.answerCbQuery('🗡️ Обертаємось...');
      await ctx.reply('🗡️ Головна База ⚔️\n\nОбери дію:', {
        reply_markup: getMainMenuKeyboard(),
      });
      logger.userAction(ctx.from!.id, 'go_home_action');
    } catch (error) {
      logger.error('Error going home', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при переміщенні');
    }
  });
}
