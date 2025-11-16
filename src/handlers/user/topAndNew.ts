/**
 * Top and New Books Handlers
 * REFACTOR-009: Split userHandlers.ts
 * 
 * Обработчики для топ книг и новинок
 */

import { Telegraf } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { BUTTONS, ERRORS, CONFIG } from '../../constants';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../utils/cache';
import { getTopBooks, getNewestBooks } from '../../database/models';
import { displayTopBooks, displayNewBooks } from '../../utils/bookDisplay';

/**
 * Register top and new books handlers
 */
export function registerTopAndNewHandlers(bot: Telegraf<BotContext>): void {
  
  // Топ книги
  bot.hears(['🏆 Топ книги', BUTTONS.TOP_BOOKS], async (ctx) => {
    try {
      const topBooks = await cache.getOrSet(
        CACHE_KEYS.TOP_BOOKS,
        () => getTopBooks(CONFIG.MAX_TOP_BOOKS),
        CACHE_TTL.MEDIUM
      );
      
      await displayTopBooks(ctx, topBooks);
      logger.userAction(ctx.from!.id, 'view_top_books');
    } catch (error) {
      logger.error('Error showing top books', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.NO_TOP_BOOKS);
    }
  });
  
  // Новинки
  bot.hears(BUTTONS.NEW_BOOKS, async (ctx) => {
    try {
      const newBooks = await getNewestBooks(5);
      
      if (newBooks.length === 0) {
        await ctx.reply('📭 В бібліотеці поки що немає книг.');
        return;
      }
      
      await displayNewBooks(ctx, newBooks);
      logger.userAction(ctx.from!.id, 'view_new_books');
    } catch (error) {
      logger.error('Error showing new books', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.NO_NEW_BOOKS);
    }
  });
}
