import { Telegraf } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { getMainMenuKeyboard } from '../../keyboards/mainKeyboards';
import { UX } from '../../constants';

export function registerNavigationHandlers(bot: Telegraf<BotContext>): void {
  bot.hears('⬅️ Назад', async (ctx) => {
    await ctx.reply(`<b>${UX.navBackTitle}</b>\n${UX.navBackBody}`, {
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(),
    });
  });

  bot.hears('🏠 На головну', async (ctx) => {
    await ctx.reply(`<b>${UX.navHomeTitle}</b>\n${UX.navHomeBody}`, {
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(),
    });
    logger.userAction(ctx.from!.id, 'go_home');
  });

  bot.action('home', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply(`<b>${UX.navHomeTitle}</b>\n${UX.navHomeBody}`, {
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(),
      });
      logger.userAction(ctx.from!.id, 'go_home_action');
    } catch (error) {
      logger.error('Error going home', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
}
