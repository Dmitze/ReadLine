/**
 * Book Display Utilities - функції для показу книг
 * Усуває дублювання коду в handlers
 */

import { Context } from 'telegraf';
import { Book } from '../database/models';
import { formatBookCaption } from './helpers';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { CONFIG } from '../constants';
import { logger } from './logger';

export interface DisplayBooksOptions {
  title?: string;
  subtitle?: string;
  isSaved?: boolean;
  showIndex?: boolean;
  indexPrefix?: string;
}

/**
 * Показати список книг користувачу
 */
export async function displayBookList(
  ctx: Context,
  books: Book[],
  options: DisplayBooksOptions = {}
): Promise<void> {
  const {
    title,
    subtitle,
    isSaved = false,
    showIndex = false,
    indexPrefix = '',
  } = options;

  try {
    // Показати заголовок якщо є
     if (title) {
       let headerText = `<b>${title}</b>`;
       if (subtitle) {
         headerText += `\n\n${subtitle}`;
       }
       await ctx.reply(headerText, { parse_mode: 'HTML' });
     }

    // Показати кожну книгу
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

/**
 * Показати одну книгу
 * ✅ ОПТИМІЗОВАНО: можна передати теги для batch loading
 */
export async function displaySingleBook(
  ctx: Context,
  book: Book,
  options: {
    isSaved?: boolean;
    index?: number;
    indexPrefix?: string;
    tags?: Array<{name: string}>;
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

/**
 * Показати повідомлення коли книг немає
 */
export async function displayNoBooks(
  ctx: Context,
  message: string = '📭 Книг не знайдено.'
): Promise<void> {
  await ctx.reply(message);
  logger.debug('Displayed no books message', { message });
}

/**
 * Показати топ книги компактним списком
 */
export async function displayTopBooks(
  ctx: Context,
  books: Book[],
  limit: number = CONFIG.MAX_TOP_BOOKS
): Promise<void> {
  if (books.length === 0) {
    await displayNoBooks(
      ctx,
      '📭 Поки що немає оцінених книг.\n\nБудьте першим хто оцінить книги! ⭐'
    );
    return;
  }

  const { Markup } = await import('telegraf');
  const limitedBooks = books.slice(0, limit);
  
  await ctx.reply(
     `🏆 <b>ТОП-${limitedBooks.length} КНИГ ЗА РЕЙТИНГОМ</b>\n\n` +
     `Найкращі книги нашої бібліотеки за оцінками читачів:\n\n` +
     `Оберіть книгу для детального перегляду:`,
     { parse_mode: 'HTML' }
   );
  
  // Створюємо кнопки для кожної книги
  const keyboard = limitedBooks.map((book, index) => [
    Markup.button.callback(
      `${index + 1}. ⭐${book.rating?.toFixed(1) || '0.0'} ${book.title} - ${book.author}`,
      `view_book_${book.id}`
    )
  ]);
  
  // Додаємо кнопку "Назад"
  keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);
  
  await ctx.reply(
     '📚 <b>Список топ книг:</b>',
     {
       parse_mode: 'HTML',
       reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
     }
   );
}

/**
 * Показати нові книги компактним списком
 */
export async function displayNewBooks(
  ctx: Context,
  books: Book[],
  limit: number = CONFIG.MAX_NEW_BOOKS
): Promise<void> {
  if (books.length === 0) {
    await displayNoBooks(ctx, '📭 Книг ще немає в бібліотеці.');
    return;
  }

  const { Markup } = await import('telegraf');
  const limitedBooks = books.slice(0, limit);
  
  await ctx.reply(
    `🆕 <b>НОВИНКИ БІБЛІОТЕКИ</b>\n\n` +
    `Останні ${limitedBooks.length} додані ${limitedBooks.length === 1 ? 'книга' : 'книг'}:\n\n` +
    `Оберіть книгу для детального перегляду:`,
    { parse_mode: 'HTML' }
  );
  
  // Створюємо кнопки для кожної книги
  const keyboard = limitedBooks.map((book, index) => [
    Markup.button.callback(
      `${index + 1}. 📖 ${book.title} - ${book.author}`,
      `view_book_${book.id}`
    )
  ]);
  
  // Додаємо кнопку "Назад"
  keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);
  
  await ctx.reply(
     '📚 <b>Список новинок:</b>',
     {
       parse_mode: 'HTML',
       reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
     }
   );
}

/**
 * Показати збережені книги
 */
export async function displaySavedBooks(
  ctx: Context,
  books: Book[]
): Promise<void> {
  if (books.length === 0) {
    await ctx.reply(
      '💾 <b>Ваша бібліотека порожня</b>\n\n' +
      'Зберігайте цікаві книги натискаючи кнопку 💾 ЗБЕРЕГТИ при перегляді книги.\n\n' +
      'Збережені книги завжди будуть доступні тут для швидкого доступу!',
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Показуємо компактний список з кнопками
  const { Markup } = await import('telegraf');
  
  await ctx.reply(
    `💾 <b>МОЯ БІБЛІОТЕКА</b>\n\n` +
    `У вас збережено ${books.length} ${books.length === 1 ? 'книга' : 'книг'}:\n\n` +
    `Оберіть книгу для перегляду:`,
    { parse_mode: 'HTML' }
  );
  
  // Створюємо кнопки для кожної книги (по 1 в рядок)
  const keyboard = books.slice(0, 20).map((book, index) => [
    Markup.button.callback(
      `${index + 1}. ${book.title} - ${book.author}`,
      `view_saved_book_${book.id}`
    )
  ]);
  
  // Додаємо кнопку "Назад"
  keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);
  
  await ctx.reply(
     '📚 <b>Список книг:</b>',
     {
       parse_mode: 'HTML',
       reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
     }
   );
  
  if (books.length > 20) {
    await ctx.reply(`ℹ️ Показано 20 з ${books.length} книг. Використовуйте пошук для інших книг.`);
  }
}

/**
 * Показати результати пошуку
 */
export async function displaySearchResults(
  ctx: Context,
  books: Book[],
  searchTerm: string
): Promise<void> {
  if (books.length === 0) {
     await ctx.reply(
       `📭 <b>Нічого не знайдено</b>\n\n` +
       `За запитом "${searchTerm}" книг не знайдено.\n\n` +
       `💡 <b>Спробуйте:</b>\n` +
       `• Використати інші ключові слова\n` +
       `• Перевірити правильність назви\n` +
       `• Шукати за автором або жанром\n` +
       `• Скоротити запит (мінімум 2 символи)`,
       { parse_mode: 'HTML' }
     );
     return;
   }

  const resultsText = books.length === CONFIG.MAX_SEARCH_RESULTS
    ? `Показано перші ${books.length} результатів`
    : `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}`;

  await displayBookList(ctx, books, {
    title: `🔍 РЕЗУЛЬТАТИ ПОШУКУ`,
    subtitle: `Запит: "${searchTerm}"\n${resultsText}`,
  });
}
