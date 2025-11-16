/**
 * Catalog Handlers
 * REFACTOR-009: Split userHandlers.ts
 *
 * Обработчики для каталога книг
 */

import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { BUTTONS, ERRORS, CONFIG } from '../../constants';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../utils/cache';
import {
  getGenres,
  getBooksByGenreWithPagination,
  getTopBooks,
  getMostDownloadedBooks,
} from '../../database/models';
import {
  getBooksWithAudio,
  getHighRatedBooks,
  getBooksSortedByTitle,
} from '../../database/catalogFunctions';
import { getAllTags, searchBooksByTag } from '../../database/tagFunctions';
import { getGenreKeyboard } from '../../keyboards/mainKeyboards';
import { formatBookCaption, getBookIdText } from '../../utils/helpers';

/**
 * Register catalog-related handlers
 */
export function registerCatalogHandlers(bot: Telegraf<BotContext>): void {
  // Каталог - главное меню
  bot.hears([BUTTONS.CATALOG_OLD, BUTTONS.CATALOG], async (ctx) => {
    try {
      await ctx.reply('📚 <b>КАТАЛОГ КНИГ</b>\n\n' + 'Оберіть спосіб перегляду:', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('📖 За жанрами', 'catalog_genres'),
            Markup.button.callback('⭐ За рейтингом', 'catalog_rating'),
          ],
          [
            Markup.button.callback('🆕 Новинки', 'catalog_new'),
            Markup.button.callback('🔤 За алфавітом', 'catalog_alpha'),
          ],
          [
            Markup.button.callback('🎧 З аудіо', 'catalog_audio'),
            Markup.button.callback('📥 За завантаженнями', 'catalog_downloads'),
          ],
          [Markup.button.callback('🏷️ За тегами', 'catalog_tags')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog');
    } catch (error) {
      logger.error('Error showing catalog', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.GENERIC);
    }
  });

  // Каталог по жанрам
  bot.action('catalog_genres', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const genres = await cache.getOrSet(CACHE_KEYS.GENRES, () => getGenres(), CACHE_TTL.LONG);

      if (!genres || genres.length === 0) {
        await ctx.editMessageText('❌ Виникла помилка при отриманні жанрів.');
        return;
      }

      await ctx.editMessageText('📖 <b>КАТАЛОГ ЗА ЖАНРАМИ</b>\n\nОберіть жанр:', {
        parse_mode: 'HTML',
        reply_markup: getGenreKeyboard(genres),
      });

      logger.userAction(ctx.from!.id, 'view_catalog_genres');
    } catch (error) {
      logger.error('Error showing genres catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Каталог по рейтингу
  bot.action('catalog_rating', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const books = await getHighRatedBooks(4, 10);

      if (books.length === 0) {
        await ctx.editMessageText('📭 Немає високорейтингових книг.');
        return;
      }

      let message = '⭐ <b>ВИСОКОРЕЙТИНГОВІ КНИГИ</b>\n\n';
      books.forEach((book, index) => {
        const rating = book.rating ? `⭐ ${book.rating.toFixed(1)}` : '⭐ Немає оцінок';
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n   ${rating}\n\n`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          ...books
            .slice(0, 10)
            .map((book) => [Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)]),
          [Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_rating');
    } catch (error) {
      logger.error('Error showing rating catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Каталог новинок
  bot.action('catalog_new', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const { getNewestBooks } = await import('../../database/models');
      const books = await cache.getOrSet('catalog_new', () => getNewestBooks(10), CACHE_TTL.SHORT);

      if (books.length === 0) {
        await ctx.editMessageText('📭 Немає нових книг.');
        return;
      }

      let message = '🆕 <b>НОВИНКИ</b>\n\n';
      books.forEach((book, index) => {
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          ...books
            .slice(0, 10)
            .map((book) => [Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)]),
          [Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_new');
    } catch (error) {
      logger.error('Error showing new books catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Каталог по тегам
  bot.action('catalog_tags', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const tags = await getAllTags();

      if (tags.length === 0) {
        await ctx.editMessageText('🏷️ Теги поки що не додані.');
        return;
      }

      let message = '🏷️ <b>КАТАЛОГ ЗА ТЕГАМИ</b>\n\n';
      message += 'Оберіть тег для перегляду книг:\n\n';

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          ...tags
            .slice(0, 20)
            .map((tag) => [Markup.button.callback(`#${tag.name}`, `view_tag_${tag.id}`)]),
          [Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_tags');
    } catch (error) {
      logger.error('Error showing tags catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Каталог по алфавиту
  bot.action('catalog_alpha', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const { books, total } = await getBooksSortedByTitle(10, 0);

      if (books.length === 0) {
        await ctx.editMessageText('📭 Немає книг.');
        return;
      }

      let message = '🔤 <b>КНИГИ ЗА АЛФАВІТОМ</b>\n\n';
      books.forEach((book, index) => {
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      if (total > 10) {
        message += `\nℹ️ Показано 10 з ${total} книг. Використовуйте пошук для інших книг.`;
      }

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          ...books
            .slice(0, 10)
            .map((book) => [Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)]),
          [Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_alpha');
    } catch (error) {
      logger.error('Error showing alphabetical catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Каталог аудиокниг
  bot.action('catalog_audio', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const books = await getBooksWithAudio(10);

      if (books.length === 0) {
        await ctx.editMessageText('🎧 Немає аудіокниг.');
        return;
      }

      let message = '🎧 <b>КНИГИ З АУДІО</b>\n\n';
      books.forEach((book, index) => {
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          ...books
            .slice(0, 10)
            .map((book) => [Markup.button.callback(`🎧 ${book.title}`, `view_book_${book.id}`)]),
          [Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_audio');
    } catch (error) {
      logger.error('Error showing audio catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Каталог по завантаженням
  bot.action('catalog_downloads', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const books = await getMostDownloadedBooks(10);

      if (books.length === 0) {
        await ctx.editMessageText('📭 Немає популярних книг.');
        return;
      }

      let message = '📥 <b>НАЙПОПУЛЯРНІШІ КНИГИ</b>\n\n';
      books.forEach((book, index) => {
        const downloads = book.downloads_count || 0;
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n   📥 ${downloads} завантажень\n\n`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          ...books
            .slice(0, 10)
            .map((book) => [Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)]),
          [Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_downloads');
    } catch (error) {
      logger.error('Error showing downloads catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Назад к каталогу
  bot.action('catalog_back', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      await ctx.editMessageText('📚 <b>КАТАЛОГ КНИГ</b>\n\n' + 'Оберіть спосіб перегляду:', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('📖 За жанрами', 'catalog_genres'),
            Markup.button.callback('⭐ За рейтингом', 'catalog_rating'),
          ],
          [
            Markup.button.callback('🆕 Новинки', 'catalog_new'),
            Markup.button.callback('🔤 За алфавітом', 'catalog_alpha'),
          ],
          [
            Markup.button.callback('🎧 З аудіо', 'catalog_audio'),
            Markup.button.callback('📥 За завантаженнями', 'catalog_downloads'),
          ],
          [Markup.button.callback('🏷️ За тегами', 'catalog_tags')],
        ]).reply_markup,
      });
    } catch (error) {
      logger.error('Error going back to catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Pagination для жанров
  bot.action(/genre_page_(.+)_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const genre = match[1];
      const page = parseInt(match[2], 10);
      const booksPerPage = 5;

      const { books, total } = await getBooksByGenreWithPagination(genre, page, booksPerPage);

      if (books.length === 0) {
        await ctx.answerCbQuery('❌ Книг не знайдено', { show_alert: true });
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = `📖 <b>Жанр: ${genre}</b>\n\n`;
      message += `Знайдено книг: ${total}\n`;
      message += `Сторінка ${page} з ${totalPages}\n\n`;

      books.forEach((book, index) => {
        message += `${(page - 1) * booksPerPage + index + 1}. <b>${book.title}</b>\n`;
        message += `   Автор: ${book.author}\n`;
        if (book.rating) {
          message += `   Рейтинг: ${'⭐'.repeat(Math.round(book.rating))}\n`;
        }
        message += '\n';
      });

      const keyboard = [];

      books.forEach((book) => {
        keyboard.push([Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)]);
      });

      const navButtons = [];
      if (page > 1) {
        navButtons.push(Markup.button.callback('⬅️ Назад', `genre_page_${genre}_${page - 1}`));
      }
      if (page < totalPages) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `genre_page_${genre}_${page + 1}`));
      }

      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ До жанрів', 'catalog_genres')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_genre_page', { genre, page });
    } catch (error) {
      logger.error('Error showing genre page', error, {
        userId: ctx.from?.id,
        match: ctx.match,
      });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Просмотр книг по тегу
  bot.action(/view_tag_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const tagId = parseInt(match[1], 10);
      const tags = await getAllTags();
      const tag = tags.find((t) => t.id === tagId);

      if (!tag) {
        await ctx.answerCbQuery('❌ Тег не знайдено', { show_alert: true });
        return;
      }

      const books = await searchBooksByTag(tag.name, 10);

      if (books.length === 0) {
        await ctx.editMessageText(`🏷️ За тегом #${tag.name} книг не знайдено.`, {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Назад до тегів', 'catalog_tags')],
          ]).reply_markup,
        });
        return;
      }

      let message = `🏷️ <b>Книги з тегом #${tag.name}</b>\n\n`;
      books.forEach((book, index) => {
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          ...books
            .slice(0, 10)
            .map((book) => [Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)]),
          [Markup.button.callback('⬅️ Назад до тегів', 'catalog_tags')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_tag_books', { tagId, tagName: tag.name });
    } catch (error) {
      logger.error('Error showing tag books', error, {
        userId: ctx.from?.id,
        match: ctx.match,
      });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
}
