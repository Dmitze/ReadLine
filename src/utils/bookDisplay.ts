import { Context } from 'telegraf';
import { Book } from '../database/models';
import { formatBookCaption } from './helpers';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { CONFIG, UX } from '../constants';
import { escapeHtml } from './helpers';
import { logger } from './logger';

function truncateInlineLabel(text: string, max = 50): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export interface DisplayBooksOptions {
  title?: string;
  subtitle?: string;
  isSaved?: boolean;
  showIndex?: boolean;
  indexPrefix?: string;
}

export async function displayBookList(
  ctx: Context,
  books: Book[],
  options: DisplayBooksOptions = {}
): Promise<void> {
  const { title, subtitle, isSaved = false, showIndex = false, indexPrefix = '' } = options;

  try {
    // Показати заголовок якщо є
    if (title) {
      let headerText = `<b>${title}</b>`;
      if (subtitle) {
        headerText += `\n\n${subtitle}`;
      }
      await ctx.reply(headerText, { parse_mode: 'HTML' });
    }

    for (const [index, book] of books.entries()) {
      await displaySingleBook(ctx, book, {
        isSaved,
        index: showIndex ? index + 1 : undefined,
        indexPrefix,
      });
    }

    logger.debug('Displayed book list', {
      count: books.length,
      title,
    });
  } catch (error) {
    logger.error('Error displaying book list', error, {
      booksCount: books.length,
      title,
    });
    throw error;
  }
}

export async function displaySingleBook(
  ctx: Context,
  book: Book,
  options: {
    isSaved?: boolean;
    index?: number;
    indexPrefix?: string;
    tags?: Array<{ name: string }>;
  } = {}
): Promise<void> {
  const { isSaved = false, index, indexPrefix = '', tags } = options;

  try {
    // Формуємо caption з тегами якщо є
    let caption = '';
    if (index !== undefined) {
      caption = `${indexPrefix}#${index}\n\n`;
    }
    caption += await formatBookCaption(book, tags);

    // Формуємо keyboard
    const keyboard = getEnhancedBookKeyboard(book, isSaved);

    // Відправляємо повідомлення
    if (book.photo_file_id && book.photo_file_id !== CONFIG.DEFAULT_BOOK_COVER) {
      await ctx.replyWithPhoto(book.photo_file_id, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }

    logger.debug('Displayed single book', {
      bookId: book.id,
      title: book.title,
    });
  } catch (error) {
    logger.error('Error displaying single book', error, {
      bookId: book.id,
      title: book.title,
    });
    throw error;
  }
}

export async function displayNoBooks(
  ctx: Context,
  message: string = '📭 Книг не знайдено.'
): Promise<void> {
  await ctx.reply(message);
  logger.debug('Displayed no books message', { message });
}

export async function displayTopBooks(
  ctx: Context,
  books: Book[],
  limit: number = CONFIG.MAX_TOP_BOOKS
): Promise<void> {
  if (books.length === 0) {
    await displayNoBooks(ctx, UX.emptyTop);
    return;
  }

  const { Markup } = await import('telegraf');
  const limitedBooks = books.slice(0, limit);

  const keyboard = limitedBooks.map((book, index) => [
    Markup.button.callback(
      truncateInlineLabel(`${index + 1}. ⭐${book.rating?.toFixed(1) ?? '—'} · ${book.title}`),
      `view_book_${book.id}`
    ),
  ]);

  keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);

  const header =
    `🏆 <b>${UX.topListTitle}</b>\n` +
    `<i>${limitedBooks.length} із ${books.length} · ${UX.listOpenCardHint}</i>`;

  await ctx.reply(header, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
  });
}

export async function displayNewBooks(
  ctx: Context,
  books: Book[],
  limit: number = CONFIG.MAX_NEW_BOOKS
): Promise<void> {
  if (books.length === 0) {
    await displayNoBooks(ctx, UX.emptyNew);
    return;
  }

  const { Markup } = await import('telegraf');
  const limitedBooks = books.slice(0, limit);

  const keyboard = limitedBooks.map((book, index) => [
    Markup.button.callback(
      truncateInlineLabel(`${index + 1}. 📖 ${book.title} · ${book.author}`),
      `view_book_${book.id}`
    ),
  ]);

  keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);

  const noun = limitedBooks.length === 1 ? 'книга' : limitedBooks.length < 5 ? 'книги' : 'книг';
  const header =
    `🆕 <b>${UX.newListTitle}</b>\n` +
    `<i>Останні ${limitedBooks.length} ${noun} · ${UX.listOpenCardHint}</i>`;

  await ctx.reply(header, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
  });
}

export async function displaySavedBooks(ctx: Context, books: Book[]): Promise<void> {
  if (books.length === 0) {
    await ctx.reply(UX.emptyLibraryHtml, { parse_mode: 'HTML' });
    return;
  }

  const { Markup } = await import('telegraf');

  const shown = books.slice(0, CONFIG.MAX_SAVED_BOOKS_DISPLAY);
  const keyboard = shown.map((book, index) => [
    Markup.button.callback(
      truncateInlineLabel(`${index + 1}. ${book.title} · ${book.author}`),
      `view_saved_book_${book.id}`
    ),
  ]);

  keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);

  const extra =
    books.length > CONFIG.MAX_SAVED_BOOKS_DISPLAY
      ? `\n\n<i>Показано ${CONFIG.MAX_SAVED_BOOKS_DISPLAY} з ${books.length}. Решту знайдіть через пошук.</i>`
      : '';

  const noun = books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг';
  const header =
    `💾 <b>${UX.savedListTitle}</b>\n` +
    `<i>${books.length} ${noun} · ${UX.listOpenCardHint}</i>${extra}`;

  await ctx.reply(header, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
  });
}

export async function displaySearchResults(
  ctx: Context,
  books: Book[],
  searchTerm: string
): Promise<void> {
  if (books.length === 0) {
    await ctx.reply(UX.searchEmptyHtml(escapeHtml(searchTerm)), { parse_mode: 'HTML' });
    return;
  }

  const resultsText =
    books.length === CONFIG.MAX_SEARCH_RESULTS
      ? `Показано перші ${books.length} результатів`
      : `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}`;

  await displayBookList(ctx, books, {
    title: '🔍 РЕЗУЛЬТАТИ ПОШУКУ',
    subtitle: `Запит: "${searchTerm}"\n${resultsText}`,
  });
}
