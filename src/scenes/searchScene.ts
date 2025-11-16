import { Scenes } from 'telegraf';
import { searchBooks, Book } from '../database/models';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { handleResult } from '../utils/resultHandler';
import { getBookIdText } from '../utils/helpers';

const SEARCH_LIMIT = 10;

const searchScene = new Scenes.BaseScene('SEARCH_SCENE');

searchScene.enter(async (ctx) => {
  const { Markup } = await import('telegraf');
  await ctx.reply('🔍 <b>Розширений пошук книг</b>\n\n' + 'Оберіть тип пошуку або введіть запит:', {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [
        { text: '📖 За назвою', callback_data: 'search_by_title' },
        { text: '👤 За автором', callback_data: 'search_by_author' },
      ],
      [
        { text: '📚 За жанром', callback_data: 'search_by_genre' },
        { text: '🔍 Загальний пошук', callback_data: 'search_general' },
      ],
      [{ text: '🤖 Розумний пошук (AI)', callback_data: 'search_ai' }],
      [{ text: '⬅️ Назад', callback_data: 'search_back' }],
    ]).reply_markup,
  });
});

// Обробники фільтрів
searchScene.action('search_by_title', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'title';
  await ctx.editMessageText(
    '📖 <b>Пошук за назвою</b>\n\n' + 'Введіть назву книги:\n\n' + '💡 <i>Приклад:</i> Кобзар',
    { parse_mode: 'HTML' }
  );
});

searchScene.action('search_by_author', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'author';
  await ctx.editMessageText(
    '👤 <b>Пошук за автором</b>\n\n' + "Введіть ім'я автора:\n\n" + '💡 <i>Приклад:</i> Шевченко',
    { parse_mode: 'HTML' }
  );
});

searchScene.action('search_by_genre', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'genre';
  await ctx.editMessageText(
    '📚 <b>Пошук за жанром</b>\n\n' + 'Введіть жанр:\n\n' + '💡 <i>Приклад:</i> Історична',
    { parse_mode: 'HTML' }
  );
});

searchScene.action('search_general', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'general';
  await ctx.editMessageText(
    '🔍 <b>Розумний пошук</b>\n\n' +
      'Введіть будь-який запит (назва, автор, жанр):\n\n' +
      '✨ <b>Можливості:</b>\n' +
      '• Пошук з помилками: "Кобзарь" → "Кобзар"\n' +
      '• Синоніми: "Sci-Fi" → "Фантастика"\n' +
      '• Автодоповнення при введенні\n\n' +
      '💡 Пошук буде виконано по всіх полях',
    { parse_mode: 'HTML' }
  );
});

searchScene.action('search_back', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene?.leave();
  const { Markup } = await import('telegraf');
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('👋 Повертаємось до головного меню', {
    reply_markup: getMainMenuKeyboard(),
  });
});

searchScene.on('text', async (ctx: BotContext) => {
  // Валідація типу повідомлення
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('❌ Будь ласка, надішліть текст для пошуку.');
    return ctx.scene?.leave();
  }

  const searchTerm = ctx.message.text.trim();
  const searchType = (ctx.scene as any).state?.searchType || 'general';

  // Перевірка на кнопку "Назад"
  if (searchTerm === '⬅️ Назад до меню') {
    const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
    await ctx.reply('👋 Повертаємось до головного меню', {
      reply_markup: getMainMenuKeyboard(),
    });
    return ctx.scene?.leave();
  }

  // ✅ ВИПРАВЛЕНО #4: валідація довжини пошукового запиту з константами
  const { CONFIG } = await import('../constants');
  if (searchTerm.length < CONFIG.MIN_SEARCH_LENGTH) {
    await ctx.reply(
      `❌ Пошуковий запит занадто короткий. Введіть мінімум ${CONFIG.MIN_SEARCH_LENGTH} символи.`
    );
    return;
  }

  if (searchTerm.length > CONFIG.MAX_SEARCH_LENGTH) {
    await ctx.reply(
      `❌ Пошуковий запит занадто довгий. Максимум ${CONFIG.MAX_SEARCH_LENGTH} символів.\n\n` +
        'Спробуйте скоротити запит або використати ключові слова.'
    );
    return;
  }

  logger.info('Search request', { searchTerm, userId: ctx.from?.id, searchType });

  // Якщо це AI пошук
  if (searchType === 'ai') {
    await ctx.reply('🤖 Аналізую ваш запит та шукаю книги...');

    // ✅ ВИПРАВЛЕНО #13: визначаємо userId для персоналізації
    const userId = ctx.from?.id;

    const { naturalLanguageSearch } = await import('../utils/aiHelper');
    const { db } = await import('../database/models');

    // ✅ ВИПРАВЛЕНО #2: використовуємо константу для ліміту
    const { CONFIG } = await import('../constants');
    const allBooks = await new Promise<Book[]>((resolve, reject) => {
      db.all(
        `SELECT * FROM books WHERE is_available = 1 ORDER BY rating DESC, downloads_count DESC LIMIT ${CONFIG.AI_MAX_BOOKS}`,
        [],
        (err, rows: Book[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    if (allBooks.length === 0) {
      await ctx.reply('📭 На жаль, в бібліотеці поки немає книг');
      return ctx.scene?.leave();
    }

    // Попереджаємо якщо обмежили
    if (allBooks.length === CONFIG.AI_MAX_BOOKS) {
      await ctx.reply(
        `⚠️ Пошук обмежено першими ${CONFIG.AI_MAX_BOOKS} найпопулярніших книг для швидкості`
      );
    }

    // ✅ ВИПРАВЛЕНО #13: AI пошук з персоналізацією
    const books = await naturalLanguageSearch(searchTerm, allBooks, userId);

    if (books.length === 0) {
      await ctx.reply(
        '😔 Не знайдено книг за вашим запитом.\n\n' +
          'Спробуйте:\n' +
          '• Описати інакше\n' +
          '• Використати інші ключові слова\n' +
          '• Звичайний пошук'
      );
      return ctx.scene?.leave();
    }

    await ctx.reply(
      `✨ *AI знайшов ${books.length} ${books.length === 1 ? 'книгу' : books.length < 5 ? 'книги' : 'книг'}*\n\n` +
        `Запит: "${searchTerm}"`,
      { parse_mode: 'Markdown' }
    );

    // Показуємо результати
    const { isBookSaved } = await import('../database/models');

    for (const book of books) {
      const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
      const caption =
        `📖 *${book.title}*${getBookIdText(book.id).replace(/\n/g, '\n')}\n` +
        `👤 ${book.author}\n` +
        `📚 ${book.genre}\n\n` +
        `${book.description?.substring(0, 150) || 'Немає опису'}...`;

      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
        await ctx
          .replyWithPhoto(book.photo_file_id, {
            caption,
            parse_mode: 'Markdown',
            reply_markup: getEnhancedBookKeyboard(book, isSaved),
          })
          .catch(async () => {
            await ctx.reply(caption, {
              parse_mode: 'Markdown',
              reply_markup: getEnhancedBookKeyboard(book, isSaved),
            });
          });
      } else {
        await ctx.reply(caption, {
          parse_mode: 'Markdown',
          reply_markup: getEnhancedBookKeyboard(book, isSaved),
        });
      }

      // Затримка
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    logger.userAction(ctx.from?.id || 0, 'ai_search', {
      query: searchTerm,
      booksFound: books.length,
    });

    return ctx.scene?.leave();
  }

  // Простий пошук через models.searchBooks
  let books: Book[] = [];
  let searchTypeText = '';

  // Використовуємо базову функцію пошуку з models.ts
  books = await searchBooks(searchTerm, SEARCH_LIMIT);

  switch (searchType) {
    case 'title':
      searchTypeText = '📖 за назвою';
      break;
    case 'author':
      searchTypeText = '👤 за автором';
      break;
    case 'genre':
      searchTypeText = '📚 за жанром';
      break;
    default:
      searchTypeText = '🔍 загальний';
  }

  logger.info('Search results', { booksFound: books.length });

  if (books.length === 0) {
    const noResultsMessage =
      '📭 <b>За вашим запитом нічого не знайдено</b>\n\n' +
      `Пошуковий запит: "${searchTerm}"\n\n` +
      '<b>🔍 Спробуйте:</b>\n' +
      '• Перевірити правопис\n' +
      '• Використати менш конкретні слова\n' +
      '• Скористатися каталогом за жанрами\n' +
      '• Спробувати інший пошук';

    await ctx.reply(noResultsMessage, { parse_mode: 'HTML' });
    return ctx.scene?.leave();
  }

  const resultsMessage =
    `<b>🔍 Результати пошуку ${searchTypeText}</b>\n\n` +
    `Знайдено: ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}\n` +
    `Запит: "${searchTerm}"`;

  await ctx.reply(resultsMessage, { parse_mode: 'HTML' });

  const { isBookSaved } = await import('../database/models');
  const userId = ctx.from?.id;

  for (const book of books) {
    const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
    const caption = `📖 <b>${book.title}</b>${getBookIdText(book.id)}\n👤 Автор: ${book.author}\n📚 Жанр: ${book.genre}\n📝 ${book.description?.substring(0, 100) || 'Немає опису'}...`;

    if (
      book.photo_file_id &&
      book.photo_file_id !== 'default_book_cover' &&
      book.photo_file_id.length > 20
    ) {
      await ctx
        .replyWithPhoto(book.photo_file_id, {
          caption,
          parse_mode: 'HTML',
          reply_markup: getEnhancedBookKeyboard(book, isSaved),
        })
        .catch(async () => {
          await ctx.reply(caption, {
            parse_mode: 'HTML',
            reply_markup: getEnhancedBookKeyboard(book, isSaved),
          });
        });
    } else {
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        reply_markup: getEnhancedBookKeyboard(book, isSaved),
      });
    }

    // Невелика затримка між повідомленнями
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (books.length === SEARCH_LIMIT) {
    await ctx.reply(
      `ℹ️ Показано перші ${SEARCH_LIMIT} результатів.\n` +
        'Уточніть пошуковий запит для більш точних результатів.'
    );
  }

  logger.userAction(ctx.from?.id || 0, 'search_completed', {
    searchTerm,
    searchType,
    resultsCount: books.length,
  });

  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('🔍 Пошук завершено', {
    reply_markup: getMainMenuKeyboard(),
  });

  return ctx.scene?.leave();
});

// Обробник AI пошуку (Завдання 33)
searchScene.action('search_ai', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'ai';
  await ctx.editMessageText(
    '🤖 *Розумний пошук (AI)*\n\n' +
      'Опишіть що шукаєте своїми словами:\n\n' +
      '💡 *Приклади:*\n' +
      '• "книги про кохання в Києві"\n' +
      '• "детективи з несподіваною розв\'язкою"\n' +
      '• "щось легке для відпочинку"\n' +
      '• "книги як у Толкіена"',
    { parse_mode: 'Markdown' }
  );
});

export default searchScene;
