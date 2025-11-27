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
  getBooksByGenre,
  getBooksByGenreWithPagination,
  getTopBooks,
  getMostDownloadedBooks,
} from '../../database/models';
import {
  getBooksWithAudio,
  getHighRatedBooks,
  getBooksSortedByTitle,
  getHighRatedBooksWithPagination,
  getNewestBooksWithPagination,
  getBooksWithAudioWithPagination,
  getMostDownloadedBooksWithPagination,
} from '../../database/catalogFunctions';
import { getAllTags, searchBooksByTag, searchBooksByTagWithPagination } from '../../database/tagFunctions';
import { getGenreKeyboard } from '../../keyboards/mainKeyboards';
import { formatBookCaption, getBookIdText } from '../../utils/helpers';

/**
 * Register catalog-related handlers
 */
export function registerCatalogHandlers(bot: Telegraf<BotContext>): void {
  // Каталог - главное меню
  bot.hears([BUTTONS.CATALOG_OLD, BUTTONS.CATALOG], async (ctx) => {
    try {
      await ctx.reply('📚 <b>КАТАЛОГ</b>\n\n' + 'Оберіть розділ:', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('📖 Книги', 'catalog_books'),
            Markup.button.callback('🎙️ Підкасти', 'catalog_podcasts'),
          ],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_main');
    } catch (error) {
      logger.error('Error showing catalog', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.GENERIC);
    }
  });

  // Каталог книг
  bot.action('catalog_books', async (ctx: BotContext) => {
    try {
      // ✅ ВИПРАВЛЕНО #8: Додано try-catch для callback query
      try {
        await ctx.answerCbQuery();
      } catch (cbError) {
        logger.debug('Failed to answer callback query', { error: cbError instanceof Error ? cbError.message : String(cbError) });
      }
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
          [Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back_main')],
        ]).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_books');
    } catch (error) {
      logger.error('Error showing catalog books', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Назад до головного каталогу
  bot.action('catalog_back_main', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      await ctx.editMessageText('📚 <b>КАТАЛОГ</b>\n\n' + 'Оберіть розділ:', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('📖 Книги', 'catalog_books'),
            Markup.button.callback('🎙️ Підкасти', 'catalog_podcasts'),
          ],
        ]).reply_markup,
      });
    } catch (error) {
      logger.error('Error going back to main catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Каталог по жанрам
  bot.action('catalog_genres', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      let genres = await cache.getOrSet(CACHE_KEYS.GENRES, () => getGenres(), CACHE_TTL.LONG);

      if (!genres || genres.length === 0) {
        await ctx.editMessageText('❌ Виникла помилка при отриманні жанрів.');
        return;
      }

      // Розділяємо жанри які зберігаються зі символом \n на окремі жанри
      genres = genres
        .flatMap((genre: string) => genre.split('\n').map((g: string) => g.trim()))
        .filter((genre: string) => genre.length > 0)
        .filter((genre: string, index: number, self: string[]) => self.indexOf(genre) === index); // Видаляємо дублікати

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

  // Обробник вибору жанру
  bot.action(/genre_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      // Отримуємо індекс жанру
      const genreIndex = parseInt(match[1], 10);
      
      // Отримуємо список жанрів з кешу
      let genres = await cache.getOrSet(CACHE_KEYS.GENRES, () => getGenres(), CACHE_TTL.LONG);
      
      // Розділяємо жанри які зберігаються зі символом \n на окремі жанри
      genres = genres
        .flatMap((genre: string) => genre.split('\n').map((g: string) => g.trim()))
        .filter((genre: string) => genre.length > 0)
        .filter((genre: string, index: number, self: string[]) => self.indexOf(genre) === index); // Видаляємо дублікати
      
      if (!genres || genreIndex >= genres.length) {
        await ctx.answerCbQuery('❌ Жанр не знайдено', { show_alert: true });
        return;
      }
      
      const genre = genres[genreIndex];
      const books = await getBooksByGenre(genre);

      if (books.length === 0) {
        await ctx.editMessageText(
          `📭 <b>Книги жанру "${genre}"</b>\n\nНа жаль, книг цього жанру ще немає.`,
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('⬅️ Назад до жанрів', 'catalog_genres')]
            ]).reply_markup
          }
        );
        return;
      }

      let message = `📖 <b>ЖАНР: ${genre.toUpperCase()}</b>\n\n`;
      message += `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}:\n\n`;

      const keyboard = books.slice(0, 10).map((book) => [
        Markup.button.callback(`📖 ${book.title} - ${book.author}`, `view_book_${book.id}`)
      ]);

      keyboard.push([Markup.button.callback('⬅️ Назад до жанрів', 'catalog_genres')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
      });

      logger.userAction(ctx.from!.id, 'view_genre_books', { genre, count: books.length });
    } catch (error) {
      logger.error('Error showing genre books', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Каталог по рейтингу
  bot.action('catalog_rating', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const booksPerPage = 5;
      const { books, total } = await getHighRatedBooksWithPagination(4, booksPerPage, 0);

      if (books.length === 0) {
        await ctx.editMessageText('📭 Немає високорейтингових книг.');
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '⭐ <b>ВИСОКОРЕЙТИНГОВІ КНИГИ</b>\n\n';
      message += `Сторінка 1 з ${totalPages}\n\n`;
      books.forEach((book, index) => {
        const rating = book.rating ? `⭐ ${book.rating.toFixed(1)}` : '⭐ Немає оцінок';
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n   ${rating}\n\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (totalPages > 1) {
        navButtons.push(Markup.button.callback('Вперед ➡️', 'rating_page_1'));
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
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

      const booksPerPage = 5;
      const { books, total } = await cache.getOrSet(
        'catalog_new_page_0',
        () => getNewestBooksWithPagination(booksPerPage, 0),
        CACHE_TTL.SHORT
      );

      if (books.length === 0) {
        await ctx.editMessageText('📭 Немає нових книг.');
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '🆕 <b>НОВИНКИ</b>\n\n';
      message += `Сторінка 1 з ${totalPages}\n\n`;
      books.forEach((book, index) => {
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (totalPages > 1) {
        navButtons.push(Markup.button.callback('Вперед ➡️', 'new_page_1'));
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_catalog_new');
    } catch (error) {
      logger.error('Error showing new books catalog', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Пагінація по завантаженням
  bot.action(/downloads_page_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const page = parseInt(match[1], 10);
      const booksPerPage = 5;
      const offset = page * booksPerPage;

      const { books, total } = await getMostDownloadedBooksWithPagination(booksPerPage, offset);

      if (books.length === 0) {
        await ctx.answerCbQuery('❌ Книг не знайдено', { show_alert: true });
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '📥 <b>НАЙПОПУЛЯРНІШІ КНИГИ</b>\n\n';
      message += `Сторінка ${page + 1} з ${totalPages}\n\n`;

      books.forEach((book, index) => {
        const downloads = book.downloads_count || 0;
        message += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}\n   📥 ${downloads} завантажень\n\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (page > 0) {
        navButtons.push(Markup.button.callback('⬅️ Назад', `downloads_page_${page - 1}`));
      }
      if (page + 1 < totalPages) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `downloads_page_${page + 1}`));
      }

      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ До каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_downloads_page', { page });
    } catch (error) {
      logger.error('Error showing downloads catalog page', error, { userId: ctx.from?.id });
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

      const booksPerPage = 5;
      const { books, total } = await getBooksSortedByTitle(booksPerPage, 0);

      if (books.length === 0) {
        await ctx.editMessageText('📭 Немає книг.');
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '🔤 <b>КНИГИ ЗА АЛФАВІТОМ</b>\n\n';
      message += `Сторінка 1 з ${totalPages}\n\n`;
      books.forEach((book, index) => {
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (totalPages > 1) {
        navButtons.push(Markup.button.callback('Вперед ➡️', 'alpha_page_1'));
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
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

      const booksPerPage = 5;
      const { books, total } = await getBooksWithAudioWithPagination(booksPerPage, 0);

      if (books.length === 0) {
        await ctx.editMessageText('🎧 Немає аудіокниг.');
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '🎧 <b>КНИГИ З АУДІО</b>\n\n';
      message += `Сторінка 1 з ${totalPages}\n\n`;
      books.forEach((book, index) => {
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`🎧 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (totalPages > 1) {
        navButtons.push(Markup.button.callback('Вперед ➡️', 'audio_page_1'));
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
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

      const booksPerPage = 5;
      const { books, total } = await getMostDownloadedBooksWithPagination(booksPerPage, 0);

      if (books.length === 0) {
        await ctx.editMessageText('📭 Немає популярних книг.');
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '📥 <b>НАЙПОПУЛЯРНІШІ КНИГИ</b>\n\n';
      message += `Сторінка 1 з ${totalPages}\n\n`;
      books.forEach((book, index) => {
        const downloads = book.downloads_count || 0;
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n   📥 ${downloads} завантажень\n\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (totalPages > 1) {
        navButtons.push(Markup.button.callback('Вперед ➡️', 'downloads_page_1'));
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
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

  // Пагінація по новинкам
  bot.action(/new_page_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const page = parseInt(match[1], 10);
      const booksPerPage = 5;
      const offset = page * booksPerPage;

      const { books, total } = await cache.getOrSet(
        `catalog_new_page_${page}`,
        () => getNewestBooksWithPagination(booksPerPage, offset),
        CACHE_TTL.SHORT
      );

      if (books.length === 0) {
        await ctx.answerCbQuery('❌ Книг не знайдено', { show_alert: true });
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '🆕 <b>НОВИНКИ</b>\n\n';
      message += `Сторінка ${page + 1} з ${totalPages}\n\n`;

      books.forEach((book, index) => {
        message += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (page > 0) {
        navButtons.push(Markup.button.callback('⬅️ Назад', `new_page_${page - 1}`));
      }
      if (page + 1 < totalPages) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `new_page_${page + 1}`));
      }

      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ До каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_new_page', { page });
    } catch (error) {
      logger.error('Error showing new books page', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Пагінація по алфавіту
  bot.action(/alpha_page_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const page = parseInt(match[1], 10);
      const booksPerPage = 5;
      const offset = page * booksPerPage;

      const { books, total } = await getBooksSortedByTitle(booksPerPage, offset);

      if (books.length === 0) {
        await ctx.answerCbQuery('❌ Книг не знайдено', { show_alert: true });
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '🔤 <b>КНИГИ ЗА АЛФАВІТОМ</b>\n\n';
      message += `Сторінка ${page + 1} з ${totalPages}\n\n`;

      books.forEach((book, index) => {
        message += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (page > 0) {
        navButtons.push(Markup.button.callback('⬅️ Назад', `alpha_page_${page - 1}`));
      }
      if (page + 1 < totalPages) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `alpha_page_${page + 1}`));
      }

      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ До каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_alpha_page', { page });
    } catch (error) {
      logger.error('Error showing alphabetical catalog page', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Пагінація по рейтингу
  bot.action(/rating_page_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const page = parseInt(match[1], 10);
      const booksPerPage = 5;
      const offset = page * booksPerPage;

      const { books, total } = await getHighRatedBooksWithPagination(4, booksPerPage, offset);

      if (books.length === 0) {
        await ctx.answerCbQuery('❌ Книг не знайдено', { show_alert: true });
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '⭐ <b>ВИСОКОРЕЙТИНГОВІ КНИГИ</b>\n\n';
      message += `Сторінка ${page + 1} з ${totalPages}\n\n`;

      books.forEach((book, index) => {
        const rating = book.rating ? `⭐ ${book.rating.toFixed(1)}` : '⭐ Немає оцінок';
        message += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}\n   ${rating}\n\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (page > 0) {
        navButtons.push(Markup.button.callback('⬅️ Назад', `rating_page_${page - 1}`));
      }
      if (page + 1 < totalPages) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `rating_page_${page + 1}`));
      }

      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ До каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_rating_page', { page });
    } catch (error) {
      logger.error('Error showing rating page', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Пагінація по аудіокнигам
  bot.action(/audio_page_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const page = parseInt(match[1], 10);
      const booksPerPage = 5;
      const offset = page * booksPerPage;

      const { books, total } = await getBooksWithAudioWithPagination(booksPerPage, offset);

      if (books.length === 0) {
        await ctx.answerCbQuery('❌ Книг не знайдено', { show_alert: true });
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = '🎧 <b>КНИГИ З АУДІО</b>\n\n';
      message += `Сторінка ${page + 1} з ${totalPages}\n\n`;

      books.forEach((book, index) => {
        message += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`🎧 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (page > 0) {
        navButtons.push(Markup.button.callback('⬅️ Назад', `audio_page_${page - 1}`));
      }
      if (page + 1 < totalPages) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `audio_page_${page + 1}`));
      }

      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ До каталогу', 'catalog_back')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_audio_page', { page });
    } catch (error) {
      logger.error('Error showing audio catalog page', error, { userId: ctx.from?.id });
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

      const booksPerPage = 5;
      const { books, total } = await searchBooksByTagWithPagination(tag.name, booksPerPage, 0);

      if (books.length === 0) {
        await ctx.editMessageText(`🏷️ За тегом #${tag.name} книг не знайдено.`, {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Назад до тегів', 'catalog_tags')],
          ]).reply_markup,
        });
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = `🏷️ <b>Книги з тегом #${tag.name}</b>\n\n`;
      message += `Сторінка 1 з ${totalPages}\n\n`;
      books.forEach((book, index) => {
        message += `${index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (totalPages > 1) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `tag_page_${tagId}_1`));
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ Назад до тегів', 'catalog_tags')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
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

  // Пагінація по тегам
  bot.action(/tag_page_(\d+)_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const tagId = parseInt(match[1], 10);
      const page = parseInt(match[2], 10);
      const booksPerPage = 5;
      const offset = page * booksPerPage;

      const tags = await getAllTags();
      const tag = tags.find((t) => t.id === tagId);

      if (!tag) {
        await ctx.answerCbQuery('❌ Тег не знайдено', { show_alert: true });
        return;
      }

      const { books, total } = await searchBooksByTagWithPagination(tag.name, booksPerPage, offset);

      if (books.length === 0) {
        await ctx.answerCbQuery('❌ Книг не знайдено', { show_alert: true });
        return;
      }

      const totalPages = Math.ceil(total / booksPerPage);

      let message = `🏷️ <b>Книги з тегом #${tag.name}</b>\n\n`;
      message += `Сторінка ${page + 1} з ${totalPages}\n\n`;

      books.forEach((book, index) => {
        message += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}\n`;
      });

      const keyboard = books.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
      ]);

      const navButtons = [];
      if (page > 0) {
        navButtons.push(Markup.button.callback('⬅️ Назад', `tag_page_${tagId}_${page - 1}`));
      }
      if (page + 1 < totalPages) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `tag_page_${tagId}_${page + 1}`));
      }

      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ До тегів', 'catalog_tags')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_tag_page', { tagId, page });
    } catch (error) {
      logger.error('Error showing tag page', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
}
