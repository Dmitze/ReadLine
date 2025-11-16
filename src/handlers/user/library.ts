/**
 * Library Handlers
 * REFACTOR-009: Split userHandlers.ts
 * 
 * Обработчики для библиотеки пользователя
 */

import { Telegraf } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { BUTTONS, ERRORS } from '../../constants';
import { getSavedBooks } from '../../database/models';
import { displaySavedBooks } from '../../utils/bookDisplay';

/**
 * Register library handlers
 */
export function registerLibraryHandlers(bot: Telegraf<BotContext>): void {
  
  // Моя библиотека
  bot.hears(BUTTONS.MY_LIBRARY, async (ctx) => {
    try {
      const userId = ctx.from?.id;
      
      if (!userId) {
        await ctx.reply(ERRORS.USER_NOT_FOUND);
        return;
      }
      
      const savedBooks = await getSavedBooks(userId);
      
      if (savedBooks.length === 0) {
        await ctx.reply('💾 Ваша бібліотека порожня. Збережіть книги, щоб вони з\'явились тут.');
        return;
      }
      
      await displaySavedBooks(ctx, savedBooks);
      logger.userAction(userId, 'view_library');
    } catch (error) {
      logger.error('Error showing library', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.NO_SAVED_BOOKS);
    }
  });
}
