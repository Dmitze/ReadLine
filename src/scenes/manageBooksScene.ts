import { Scenes, Markup } from 'telegraf';
import { getAllBooks, deleteBook, getBookById } from '../database/models';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { handleResult } from '../utils/resultHandler';
import { getBookIdText } from '../utils/helpers';
import { createBookManagementService } from '../services/BookManagementService';
import { db } from '../database/models';

/**
 * Інтерфейс для стану сцени управління книгами
 */
interface ManageBooksSceneState {
  selectedBooks: number[];
  selectedTags: number[];
  currentFilter?: string;
  searchQuery?: string;
}

const manageBooksScene = new Scenes.BaseScene('MANAGE_BOOKS_SCENE');

manageBooksScene.enter(async (ctx: BotContext) => {
  const books = await getAllBooks();

  if (books.length === 0) {
    await ctx.reply('📭 В каталозі немає книг');
    return ctx.scene.leave();
  }

  // Показуємо меню фільтрів
  await ctx.reply(
    '📚 *Управління книгами*\n\n' + `Всього книг: ${books.length}\n\n` + 'Оберіть спосіб пошуку:',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📚 За жанром', 'filter_by_genre')],
        [Markup.button.callback('🔍 Пошук за назвою', 'search_by_title')],
        [Markup.button.callback('📋 Показати всі (перші 10)', 'show_all_books')],
        [Markup.button.callback('✏️ Масове редагування', 'bulk_edit')],
        [Markup.button.callback('⬅️ Назад', 'back_to_admin')],
      ]).reply_markup,
    }
  );
});

// Фільтр за жанром
manageBooksScene.action('filter_by_genre', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  // ✅ ВИПРАВЛЕНО #27: кешування жанрів
  const { getGenres } = await import('../database/models');
  const { cache, CACHE_KEYS, CACHE_TTL } = await import('../utils/cache');
  const genres = await cache.getOrSet(CACHE_KEYS.GENRES, getGenres, CACHE_TTL.LONG);

  if (genres.length === 0) {
    await ctx.reply('📭 Немає жанрів');
    return;
  }

  // Створюємо кнопки для жанрів (використовуємо індекс замість повної назви)
  const keyboard = genres.map((genre, index) => [
    Markup.button.callback(genre, `genre_filter_${index}`),
  ]);
  keyboard.push([Markup.button.callback('⬅️ Назад', 'back_to_manage')]);

  await ctx.editMessageText('📚 *Оберіть жанр:*', {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
  });
});

// Показати книги за жанром
manageBooksScene.action(/genre_filter_(\d+)/, async (ctx: BotContext) => {
  const match = ctx.match;
  if (!match || !match[1]) {
    await ctx.answerCbQuery('❌ Помилка');
    return;
  }

  const genreIndex = parseInt(match[1]);

  // Отримуємо жанр за індексом
  const { getGenres } = await import('../database/models');
  const { cache, CACHE_KEYS, CACHE_TTL } = await import('../utils/cache');
  const genres = await cache.getOrSet(CACHE_KEYS.GENRES, getGenres, CACHE_TTL.LONG);

  const genre = genres[genreIndex];
  if (!genre) {
    await ctx.answerCbQuery('❌ Жанр не знайдено');
    return;
  }

  await ctx.answerCbQuery(`Завантаження книг жанру "${genre}"...`);

  const { getBooksByGenre } = await import('../database/models');
  const books = await getBooksByGenre(genre);

  if (books.length === 0) {
    await ctx.reply(`📭 Немає книг в жанрі "${genre}"`);
    return;
  }

  await ctx.reply(`📚 Знайдено ${books.length} книг в жанрі "${genre}":`);

  // Показуємо перші 10 книг
  const booksToShow = books.slice(0, 10);

  for (const book of booksToShow) {
    const bookText = `
📖 *${book.title}*${getBookIdText(book.id)}
👤 ${book.author}
⭐ ${book.rating || 0}/5
    `.trim();

    await ctx.reply(bookText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('✏️ Редагувати', `edit_book_${book.id}`),
          Markup.button.callback('🗑️ Видалити', `delete_book_${book.id}`),
        ],
      ]).reply_markup,
    });
  }

  if (books.length > 10) {
    await ctx.reply(
      `ℹ️ Показано 10 з ${books.length} книг. Використовуйте /find для пошуку конкретної книги.`
    );
  }
});

// Пошук за назвою
manageBooksScene.action('search_by_title', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '🔍 *Пошук за назвою*\n\n' +
      'Введіть назву книги або частину назви:\n\n' +
      'Наприклад: `/find Кобзар`',
    { parse_mode: 'Markdown' }
  );
});

// Показати всі книги
manageBooksScene.action('show_all_books', async (ctx: BotContext) => {
  await ctx.answerCbQuery('Завантаження...');

  const books = await getAllBooks();
  const booksToShow = books.slice(0, 10);

  await ctx.reply(`📚 Показано ${booksToShow.length} з ${books.length} книг:`);

  for (const book of booksToShow) {
    const bookText = `
📖 *${book.title}*${getBookIdText(book.id)}
👤 ${book.author}
📚 ${book.genre}
⭐ ${book.rating || 0}/5
    `.trim();

    await ctx.reply(bookText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('✏️ Редагувати', `edit_book_${book.id}`),
          Markup.button.callback('🗑️ Видалити', `delete_book_${book.id}`),
        ],
      ]).reply_markup,
    });
  }

  if (books.length > 10) {
    await ctx.reply(
      `ℹ️ Показано 10 з ${books.length} книг. Використовуйте фільтри або /find для пошуку.`
    );
  }
});

// Назад до меню управління
manageBooksScene.action('back_to_manage', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene.reenter();
});

// Назад до адмін-панелі
manageBooksScene.action('back_to_admin', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene.leave();
  await ctx.reply('⬅️ Повертаємось до адмін-панелі');
});

// Обробка редагування книги
manageBooksScene.action(/edit_book_(\d+)/, async (ctx: BotContext) => {
  const match = ctx.match;
  if (!match || !match[1]) {
    logger.error('Edit book: no bookId in match', { match, userId: ctx.from?.id });
    await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
    return;
  }

  const bookId = parseInt(match[1]);
  logger.info('Edit book action triggered', { bookId, userId: ctx.from?.id });
  
  await ctx.answerCbQuery('Відкриваємо редагування...');

  // Переходимо до сцени редагування
  logger.info('Entering EDIT_BOOK_SCENE', { bookId, userId: ctx.from?.id });
  await ctx.scene.enter('EDIT_BOOK_SCENE', { bookId });
});

// Обробка видалення книги
manageBooksScene.action(/delete_book_(\d+)/, async (ctx: BotContext) => {
  const match = ctx.match;
  if (!match || !match[1]) {
    await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
    return;
  }

  const bookId = parseInt(match[1]);
  const book = await getBookById(bookId);

  if (!book) {
    await ctx.answerCbQuery('❌ Книга не знайдена');
    return;
  }

  await ctx.answerCbQuery();

  // Показуємо підтвердження
  await ctx.reply(
    '⚠️ <b>ПІДТВЕРДЖЕННЯ ВИДАЛЕННЯ</b>\n\n' +
      'Ви впевнені, що хочете видалити книгу?\n\n' +
      `📖 ${book.title}${getBookIdText(book.id)}\n` +
      `👤 ${book.author}\n\n` +
      '⚠️ Ця дія незворотна!',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('✅ Так, видалити', `confirm_delete_${bookId}`)],
        [Markup.button.callback('❌ Ні, залишити', 'cancel_delete')],
      ]).reply_markup,
    }
  );
});

// Підтвердження видалення
manageBooksScene.action(/confirm_delete_(\d+)/, async (ctx: BotContext) => {
  const match = ctx.match;
  if (!match || !match[1]) {
    await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
    return;
  }

  const bookId = parseInt(match[1]);
  const book = await getBookById(bookId);

  if (!book) {
    await ctx.answerCbQuery('❌ Книга не знайдена');
    return;
  }

  // Видаляємо книгу
  await deleteBook(bookId);

  await ctx.answerCbQuery('✅ Книгу видалено');
  await ctx.editMessageText(
    '✅ <b>Книгу видалено</b>\n\n' + `📖 ${book.title}${getBookIdText(book.id)}\n` + `👤 ${book.author}`,
    { parse_mode: 'HTML' }
  );

  logger.adminAction(ctx.from!.id, 'delete_book', { bookId, title: book.title });
});

// Скасування видалення
manageBooksScene.action('cancel_delete', async (ctx: BotContext) => {
  await ctx.answerCbQuery('Скасовано');
  await ctx.editMessageText('❌ Видалення скасовано');
});

// Команда для пошуку книги
manageBooksScene.command('find', async (ctx) => {
  const searchTerm = ctx.message.text.replace('/find', '').trim();

  if (searchTerm.length < 2) {
    await ctx.reply('❌ Введіть мінімум 2 символи для пошуку');
    return;
  }

  const { searchBooks } = await import('../database/models');
  const books = await searchBooks(searchTerm, 5);

  if (books.length === 0) {
    await ctx.reply('📭 Книги не знайдені');
    return;
  }

  await ctx.reply(`🔍 Знайдено ${books.length} книг:`);

  for (const book of books) {
    const bookText = `
  📖 *${book.title}*${getBookIdText(book.id)}
  👤 ${book.author}
  📚 ${book.genre}
     `.trim();

    await ctx.reply(bookText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('✏️ Редагувати', `edit_book_${book.id}`),
          Markup.button.callback('🗑️ Видалити', `delete_book_${book.id}`),
        ],
      ]).reply_markup,
    });
  }
});

// Масове редагування - показати всі книги з чекбоксами
manageBooksScene.action('bulk_edit', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  const books = await getAllBooks();

  if (books.length === 0) {
    await ctx.reply('📭 Немає книг для редагування');
    return;
  }

  // Зберігаємо вибрані книги в state
  const state = ctx.scene.state as ManageBooksSceneState;
  if (!state.selectedBooks) {
    state.selectedBooks = [];
  }

  // Показуємо перші 10 книг з кнопками вибору
  const bookButtons = books
    .slice(0, 10)
    .map((book) => [
      Markup.button.callback(`☐ ${book.title} (${book.author})`, `bulk_select_${book.id}`),
    ]);

  bookButtons.push([
    Markup.button.callback('✅ Готово (0 обрано)', 'bulk_edit_actions'),
    Markup.button.callback('❌ Скасувати', 'back_to_admin'),
  ]);

  await ctx.reply(
    '📚 *МАСОВЕ РЕДАГУВАННЯ*\n\n' + 'Оберіть книги для редагування:\n' + '(показано перші 10 книг)',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(bookButtons).reply_markup,
    }
  );
});

// Вибір книги для масового редагування
manageBooksScene.action(/bulk_select_(\d+)/, async (ctx: BotContext) => {
  const bookId = parseInt(ctx.match[1]);
  const state = ctx.scene.state as ManageBooksSceneState;

  if (!state.selectedBooks) {
    state.selectedBooks = [];
  }

  // Перевіряємо чи книга вже вибрана
  const index = state.selectedBooks.indexOf(bookId);
  if (index > -1) {
    state.selectedBooks.splice(index, 1);
    await ctx.answerCbQuery('❌ Книгу видалено з вибору');
  } else {
    state.selectedBooks.push(bookId);
    await ctx.answerCbQuery('✅ Книгу додано до вибору');
  }

  // Оновлюємо повідомлення
  const books = await getAllBooks();
  const bookButtons = books.slice(0, 10).map((book) => {
    const isSelected = book.id ? state.selectedBooks.includes(book.id) : false;
    return [
      Markup.button.callback(
        `${isSelected ? '☑' : '☐'} ${book.title} (${book.author})`,
        `bulk_select_${book.id}`
      ),
    ];
  });

  bookButtons.push([
    Markup.button.callback(`✅ Готово (${state.selectedBooks.length} обрано)`, 'bulk_edit_actions'),
    Markup.button.callback('❌ Скасувати', 'back_to_admin'),
  ]);

  await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(bookButtons).reply_markup);
});

// Показати дії для масового редагування
manageBooksScene.action('bulk_edit_actions', async (ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;

  if (!state.selectedBooks || state.selectedBooks.length === 0) {
    await ctx.answerCbQuery('⚠️ Оберіть хоча б одну книгу');
    return;
  }

  await ctx.answerCbQuery();

  await ctx.reply(
    '📚 *МАСОВЕ РЕДАГУВАННЯ*\n\n' +
      `Обрано книг: ${state.selectedBooks.length}\n\n` +
      'Оберіть дію:',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('✅ Зробити доступними', 'bulk_make_available')],
        [Markup.button.callback('❌ Зробити недоступними', 'bulk_make_unavailable')],
        [Markup.button.callback('🏷️ Додати теги', 'bulk_add_tags')],
        [Markup.button.callback('🗑️ Видалити книги', 'bulk_delete')],
        [Markup.button.callback('⬅️ Назад', 'bulk_edit')],
      ]).reply_markup,
    }
  );
});

// Зробити книги доступними
manageBooksScene.action('bulk_make_available', async (ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;

  // ✅ ВИПРАВЛЕНО #7: додано підтвердження перед bulk edit
  await ctx.answerCbQuery();
  await ctx.reply(
    '⚠️ *ПІДТВЕРДЖЕННЯ*\n\n' +
      `Ви впевнені, що хочете зробити доступними ${state.selectedBooks.length} ${state.selectedBooks.length === 1 ? 'книгу' : 'книг'}?\n\n` +
      'Ця дія змінить статус всіх обраних книг.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Так, підтверджую', callback_data: 'confirm_bulk_available' }],
          [{ text: '❌ Ні, скасувати', callback_data: 'bulk_edit_actions' }],
        ],
      },
    }
  );
});

// Підтвердження bulk_make_available
manageBooksScene.action('confirm_bulk_available', async (ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;
  await ctx.answerCbQuery('⏳ Оновлюю...');

  const bookService = createBookManagementService(db);
  const result = await bookService.bulkUpdateAvailability(state.selectedBooks, true, ctx.from?.id);

  if (result.isOk()) {
    const data = result.unwrap();
    if (data.success) {
      await ctx.editMessageText(
        '✅ *Успішно оновлено!*\n\n' +
          `${data.count} ${data.count === 1 ? 'книга' : 'книг'} тепер доступні`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.editMessageText(
        '❌ *Помилка при оновленні*\n\n' +
          (data.errors.length > 0 ? data.errors.join('\n') : 'Невідома помилка'),
        { parse_mode: 'Markdown' }
      );
    }
  } else {
    await ctx.editMessageText(
      '❌ *Помилка при оновленні*\n\n' +
        result.error.message,
      { parse_mode: 'Markdown' }
    );
  }

  state.selectedBooks = [];
});

// Зробити книги недоступними
manageBooksScene.action('bulk_make_unavailable', async (ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;

  // ✅ ВИПРАВЛЕНО #7: додано підтвердження
  await ctx.answerCbQuery();
  await ctx.reply(
    '⚠️ *ПІДТВЕРДЖЕННЯ*\n\n' +
      `Ви впевнені, що хочете зробити НЕДОСТУПНИМИ ${state.selectedBooks.length} ${state.selectedBooks.length === 1 ? 'книгу' : 'книг'}?\n\n` +
      '⚠️ Користувачі не зможуть їх знайти та завантажити!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Так, підтверджую', callback_data: 'confirm_bulk_unavailable' }],
          [{ text: '❌ Ні, скасувати', callback_data: 'bulk_edit_actions' }],
        ],
      },
    }
  );
});

// Підтвердження bulk_make_unavailable
manageBooksScene.action('confirm_bulk_unavailable', async (ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;
  await ctx.answerCbQuery('⏳ Оновлюю...');

  const bookService = createBookManagementService(db);
  const result = await bookService.bulkUpdateAvailability(state.selectedBooks, false, ctx.from?.id);

  if (result.isOk()) {
    const data = result.unwrap();
    if (data.success) {
      await ctx.editMessageText(
        '✅ *Успішно оновлено!*\n\n' +
          `${data.count} ${data.count === 1 ? 'книга' : 'книг'} тепер недоступні`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.editMessageText(
        '❌ *Помилка при оновленні*\n\n' +
          (data.errors.length > 0 ? data.errors.join('\n') : 'Невідома помилка'),
        { parse_mode: 'Markdown' }
      );
    }
  } else {
    await ctx.editMessageText(
      '❌ *Помилка при оновленні*\n\n' +
        result.error.message,
      { parse_mode: 'Markdown' }
    );
  }

  state.selectedBooks = [];
});

// Додати теги до кількох книг
manageBooksScene.action('bulk_add_tags', async (ctx: BotContext) => {
  await ctx.answerCbQuery();

  const { getAllTags } = await import('../database/tagFunctions');
  const allTags = await getAllTags();

  if (allTags.length === 0) {
    await ctx.reply('🏷️ Немає доступних тегів. Спочатку створіть теги.');
    return;
  }

  const state = ctx.scene.state as ManageBooksSceneState;
  if (!state.selectedTags) {
    state.selectedTags = [];
  }

  // Створюємо кнопки з тегами
  const tagButtons = [];
  for (let i = 0; i < allTags.length; i += 2) {
    const row = [Markup.button.callback(allTags[i].name, `bulk_tag_${allTags[i].id}`)];
    if (i + 1 < allTags.length) {
      row.push(Markup.button.callback(allTags[i + 1].name, `bulk_tag_${allTags[i + 1].id}`));
    }
    tagButtons.push(row);
  }

  tagButtons.push([
    Markup.button.callback('✅ Додати теги', 'bulk_apply_tags'),
    Markup.button.callback('❌ Скасувати', 'bulk_edit_actions'),
  ]);

  await ctx.reply(
    '🏷️ *ДОДАТИ ТЕГИ*\n\n' +
      `Оберіть теги для додавання до ${state.selectedBooks.length} ${state.selectedBooks.length === 1 ? 'книги' : 'книг'}:`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(tagButtons).reply_markup,
    }
  );
});

// Вибір тегу
manageBooksScene.action(/bulk_tag_(\d+)/, async (ctx: BotContext) => {
  const tagId = parseInt(ctx.match[1]);
  const state = ctx.scene.state as ManageBooksSceneState;

  if (!state.selectedTags) {
    state.selectedTags = [];
  }

  const index = state.selectedTags.indexOf(tagId);
  if (index > -1) {
    state.selectedTags.splice(index, 1);
    await ctx.answerCbQuery('❌ Тег видалено');
  } else {
    state.selectedTags.push(tagId);
    await ctx.answerCbQuery('✅ Тег додано');
  }

  // Оновлюємо кнопки
  const { getAllTags } = await import('../database/tagFunctions');
  const allTags = await getAllTags();

  const tagButtons = [];
  for (let i = 0; i < allTags.length; i += 2) {
    const tag1 = allTags[i];
    const isSelected1 = state.selectedTags.includes(tag1.id);
    const row = [
      Markup.button.callback(`${isSelected1 ? '✅ ' : ''}${tag1.name}`, `bulk_tag_${tag1.id}`),
    ];
    if (i + 1 < allTags.length) {
      const tag2 = allTags[i + 1];
      const isSelected2 = state.selectedTags.includes(tag2.id);
      row.push(
        Markup.button.callback(`${isSelected2 ? '✅ ' : ''}${tag2.name}`, `bulk_tag_${tag2.id}`)
      );
    }
    tagButtons.push(row);
  }

  tagButtons.push([
    Markup.button.callback('✅ Додати теги', 'bulk_apply_tags'),
    Markup.button.callback('❌ Скасувати', 'bulk_edit_actions'),
  ]);

  await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(tagButtons).reply_markup);
});

// Застосувати теги до книг
manageBooksScene.action('bulk_apply_tags', async (ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;

  if (!state.selectedTags || state.selectedTags.length === 0) {
    await ctx.answerCbQuery('⚠️ Оберіть хоча б один тег');
    return;
  }

  await ctx.answerCbQuery('⏳ Додаю теги...');

  const { addBookTag } = await import('../database/tagFunctions');

  for (const bookId of state.selectedBooks) {
    for (const tagId of state.selectedTags) {
      await addBookTag(bookId, tagId);
    }
  }

  await ctx.reply(
    '✅ *Успішно додано!*\n\n' +
      `${state.selectedTags.length} ${state.selectedTags.length === 1 ? 'тег' : 'теги'} додано до ` +
      `${state.selectedBooks.length} ${state.selectedBooks.length === 1 ? 'книги' : 'книг'}`,
    { parse_mode: 'Markdown' }
  );

  logger.info('Bulk update: added tags', {
    adminId: ctx.from?.id,
    booksCount: state.selectedBooks.length,
    tagsCount: state.selectedTags.length,
  });

  state.selectedBooks = [];
  state.selectedTags = [];
});

// ✅ ВИПРАВЛЕНО #22: cleanup при виході зі сцени для запобігання memory leak
manageBooksScene.leave((ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;

  // Очищаємо всі тимчасові дані
  if (state) {
    state.selectedBooks = [];
    state.selectedTags = [];
    delete state.currentFilter;
    delete state.searchQuery;
  }

  logger.debug('Manage books scene cleanup completed', { userId: ctx.from?.id });
});

// ✅ ВИПРАВЛЕНО #12: Масове видалення книг
manageBooksScene.action('bulk_delete', async (ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;

  if (!state.selectedBooks || state.selectedBooks.length === 0) {
    await ctx.answerCbQuery('⚠️ Оберіть хоча б одну книгу');
    return;
  }

  await ctx.answerCbQuery();

  // Отримуємо назви книг для підтвердження
  const bookNames = await Promise.all(
    state.selectedBooks.map(async (id: number) => {
      const book = await getBookById(id);
      if (!book) {
        return `• Книга #${id}`;
      }
      return `• ${book.title}`;
    })
  );

  await ctx.reply(
    '⚠️ *УВАГА! ВИДАЛЕННЯ КНИГ*\n\n' +
      `Ви збираєтесь видалити ${state.selectedBooks.length} книг:\n\n` +
      `${bookNames.slice(0, 10).join('\n')}` +
      `${state.selectedBooks.length > 10 ? `\n... та ще ${state.selectedBooks.length - 10} книг` : ''}\n\n` +
      '⚠️ *Ця дія незворотна!*\n' +
      'Всі дані про ці книги будуть видалені назавжди.\n\n' +
      'Ви впевнені?',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🗑️ Так, видалити назавжди', callback_data: 'confirm_bulk_delete' }],
          [{ text: '❌ Ні, скасувати', callback_data: 'bulk_edit_actions' }],
        ],
      },
    }
  );
});

// Підтвердження масового видалення
manageBooksScene.action('confirm_bulk_delete', async (ctx: BotContext) => {
  const state = ctx.scene.state as ManageBooksSceneState;

  if (!state.selectedBooks || state.selectedBooks.length === 0) {
    await ctx.answerCbQuery('⚠️ Немає обраних книг');
    return;
  }

  await ctx.answerCbQuery('🗑️ Видаляю книги...');

  const bookService = createBookManagementService(db);
  const result = await bookService.bulkDeleteBooks(state.selectedBooks, ctx.from?.id);

  const totalBooks = state.selectedBooks.length;
  let deletedCount = 0;
  let failedCount = 0;

  if (result.isOk()) {
    const data = result.unwrap();
    deletedCount = data.count;
    failedCount = data.errors.length;
  }

  // Очищаємо вибір
  state.selectedBooks = [];

  await ctx.reply(
    '✅ *ВИДАЛЕННЯ ЗАВЕРШЕНО*\n\n' +
      '📊 Результати:\n' +
      `• Видалено: ${deletedCount} книг\n` +
      `${failedCount > 0 ? `• Помилки: ${failedCount} книг\n` : ''}` +
      `• Всього оброблено: ${totalBooks} книг`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Повернутись до управління', 'back_to_admin')],
      ]).reply_markup,
    }
  );
});

export default manageBooksScene;
