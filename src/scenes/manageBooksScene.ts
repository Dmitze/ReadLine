import { Scenes, Markup } from 'telegraf';
import { getAllBooks, deleteBook, getBookById } from '../database/models';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';

const manageBooksScene = new Scenes.BaseScene('MANAGE_BOOKS_SCENE');

manageBooksScene.enter(async (ctx: BotContext) => {
  try {
    const books = await getAllBooks();
    
    if (books.length === 0) {
      await ctx.reply('📭 В каталозі немає книг');
      return ctx.scene.leave();
    }
    
    // Показуємо меню фільтрів
    await ctx.reply(
      `📚 *Управління книгами*\n\n` +
      `Всього книг: ${books.length}\n\n` +
      `Оберіть спосіб пошуку:`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📚 За жанром', 'filter_by_genre')],
          [Markup.button.callback('🔍 Пошук за назвою', 'search_by_title')],
          [Markup.button.callback('📋 Показати всі (перші 10)', 'show_all_books')],
          [Markup.button.callback('✏️ Масове редагування', 'bulk_edit')],
          [Markup.button.callback('⬅️ Назад', 'back_to_admin')]
        ]).reply_markup
      }
    );
    
  } catch (error) {
    logger.error('Error in manage books scene', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка при завантаженні списку книг');
  }
});

// Фільтр за жанром
manageBooksScene.action('filter_by_genre', async (ctx: BotContext) => {
  try {
    await ctx.answerCbQuery();
    const { getGenres } = await import('../database/models');
    const genres = await getGenres();
    
    if (genres.length === 0) {
      await ctx.reply('📭 Немає жанрів');
      return;
    }
    
    // Створюємо кнопки для жанрів
    const keyboard = genres.map(genre => [
      Markup.button.callback(genre, `genre_filter_${genre}`)
    ]);
    keyboard.push([Markup.button.callback('⬅️ Назад', 'back_to_manage')]);
    
    await ctx.editMessageText(
      '📚 *Оберіть жанр:*',
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
      }
    );
    
  } catch (error) {
    logger.error('Error showing genres', error instanceof Error ? error : new Error(String(error)));
    await ctx.answerCbQuery('❌ Помилка');
  }
});

// Показати книги за жанром
manageBooksScene.action(/genre_filter_(.+)/, async (ctx: BotContext) => {
  try {
    const match = ctx.match;
    if (!match || !match[1]) {
      await ctx.answerCbQuery('❌ Помилка');
      return;
    }
    
    const genre = match[1];
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
📖 *${book.title}*
👤 ${book.author}
⭐ ${book.rating || 0}/5
      `.trim();
      
      await ctx.reply(bookText, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('✏️ Редагувати', `edit_book_${book.id}`),
            Markup.button.callback('🗑️ Видалити', `delete_book_${book.id}`)
          ]
        ]).reply_markup
      });
    }
    
    if (books.length > 10) {
      await ctx.reply(`ℹ️ Показано 10 з ${books.length} книг. Використовуйте /find для пошуку конкретної книги.`);
    }
    
  } catch (error) {
    logger.error('Error filtering by genre', error instanceof Error ? error : new Error(String(error)));
    await ctx.answerCbQuery('❌ Помилка');
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
  try {
    await ctx.answerCbQuery('Завантаження...');
    
    const books = await getAllBooks();
    const booksToShow = books.slice(0, 10);
    
    await ctx.reply(`📚 Показано ${booksToShow.length} з ${books.length} книг:`);
    
    for (const book of booksToShow) {
      const bookText = `
📖 *${book.title}*
👤 ${book.author}
📚 ${book.genre}
⭐ ${book.rating || 0}/5
      `.trim();
      
      await ctx.reply(bookText, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('✏️ Редагувати', `edit_book_${book.id}`),
            Markup.button.callback('🗑️ Видалити', `delete_book_${book.id}`)
          ]
        ]).reply_markup
      });
    }
    
    if (books.length > 10) {
      await ctx.reply(`ℹ️ Показано 10 з ${books.length} книг. Використовуйте фільтри або /find для пошуку.`);
    }
    
  } catch (error) {
    logger.error('Error showing all books', error instanceof Error ? error : new Error(String(error)));
    await ctx.answerCbQuery('❌ Помилка');
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
  try {
    const match = ctx.match;
    if (!match || !match[1]) {
      await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
      return;
    }
    
    const bookId = parseInt(match[1]);
    await ctx.answerCbQuery('Відкриваємо редагування...');
    
    // Переходимо до сцени редагування
    await ctx.scene.enter('EDIT_BOOK_SCENE', { bookId });
  } catch (error) {
    logger.error('Error entering edit scene', error instanceof Error ? error : new Error(String(error)));
    await ctx.answerCbQuery('❌ Помилка');
  }
});

// Обробка видалення книги
manageBooksScene.action(/delete_book_(\d+)/, async (ctx: BotContext) => {
  try {
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
      `⚠️ *ПІДТВЕРДЖЕННЯ ВИДАЛЕННЯ*\n\n` +
      `Ви впевнені, що хочете видалити книгу?\n\n` +
      `📖 ${book.title}\n` +
      `👤 ${book.author}\n\n` +
      `⚠️ Ця дія незворотна!`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('✅ Так, видалити', `confirm_delete_${bookId}`)],
          [Markup.button.callback('❌ Ні, залишити', 'cancel_delete')]
        ]).reply_markup
      }
    );
    
  } catch (error) {
    logger.error('Error preparing delete', error instanceof Error ? error : new Error(String(error)));
    await ctx.answerCbQuery('❌ Помилка');
  }
});

// Підтвердження видалення
manageBooksScene.action(/confirm_delete_(\d+)/, async (ctx: BotContext) => {
  try {
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
      `✅ *Книгу видалено*\n\n` +
      `📖 ${book.title}\n` +
      `👤 ${book.author}`,
      { parse_mode: 'Markdown' }
    );
    
    logger.adminAction(ctx.from!.id, 'delete_book', { bookId, title: book.title });
    
  } catch (error) {
    logger.error('Error deleting book', error instanceof Error ? error : new Error(String(error)));
    await ctx.answerCbQuery('❌ Помилка при видаленні');
  }
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
  
  try {
    const { searchBooks } = await import('../database/models');
    const books = await searchBooks(searchTerm, 5);
    
    if (books.length === 0) {
      await ctx.reply('📭 Книги не знайдені');
      return;
    }
    
    await ctx.reply(`🔍 Знайдено ${books.length} книг:`);
    
    for (const book of books) {
      const bookText = `
📖 *${book.title}*
👤 ${book.author}
📚 ${book.genre}
      `.trim();
      
      await ctx.reply(bookText, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('✏️ Редагувати', `edit_book_${book.id}`),
            Markup.button.callback('🗑️ Видалити', `delete_book_${book.id}`)
          ]
        ]).reply_markup
      });
    }
    
  } catch (error) {
    logger.error('Error searching books', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка при пошуку');
  }
});

// Масове редагування - показати всі книги з чекбоксами
manageBooksScene.action('bulk_edit', async (ctx: BotContext) => {
  try {
    await ctx.answerCbQuery();
    const books = await getAllBooks();
    
    if (books.length === 0) {
      await ctx.reply('📭 Немає книг для редагування');
      return;
    }
    
    // Зберігаємо вибрані книги в state
    const state = ctx.scene.state as any;
    state.selectedBooks = [];
    
    // Показуємо перші 10 книг з кнопками вибору
    const bookButtons = books.slice(0, 10).map(book => [
      Markup.button.callback(
        `☐ ${book.title} (${book.author})`,
        `bulk_select_${book.id}`
      )
    ]);
    
    bookButtons.push([
      Markup.button.callback('✅ Готово (0 обрано)', 'bulk_edit_actions'),
      Markup.button.callback('❌ Скасувати', 'back_to_admin')
    ]);
    
    await ctx.reply(
      `📚 *МАСОВЕ РЕДАГУВАННЯ*\n\n` +
      `Оберіть книги для редагування:\n` +
      `(показано перші 10 книг)`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(bookButtons).reply_markup
      }
    );
    
  } catch (error) {
    logger.error('Error in bulk edit', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка');
  }
});

// Вибір книги для масового редагування
manageBooksScene.action(/bulk_select_(\d+)/, async (ctx: BotContext) => {
  try {
    const bookId = parseInt(ctx.match[1]);
    const state = ctx.scene.state as any;
    
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
    const bookButtons = books.slice(0, 10).map(book => {
      const isSelected = state.selectedBooks.includes(book.id);
      return [
        Markup.button.callback(
          `${isSelected ? '☑' : '☐'} ${book.title} (${book.author})`,
          `bulk_select_${book.id}`
        )
      ];
    });
    
    bookButtons.push([
      Markup.button.callback(
        `✅ Готово (${state.selectedBooks.length} обрано)`,
        'bulk_edit_actions'
      ),
      Markup.button.callback('❌ Скасувати', 'back_to_admin')
    ]);
    
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(bookButtons).reply_markup);
    
  } catch (error) {
    logger.error('Error selecting book', error instanceof Error ? error : new Error(String(error)));
  }
});

// Показати дії для масового редагування
manageBooksScene.action('bulk_edit_actions', async (ctx: BotContext) => {
  try {
    const state = ctx.scene.state as any;
    
    if (!state.selectedBooks || state.selectedBooks.length === 0) {
      await ctx.answerCbQuery('⚠️ Оберіть хоча б одну книгу');
      return;
    }
    
    await ctx.answerCbQuery();
    
    await ctx.reply(
      `📚 *МАСОВЕ РЕДАГУВАННЯ*\n\n` +
      `Обрано книг: ${state.selectedBooks.length}\n\n` +
      `Оберіть дію:`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('✅ Зробити доступними', 'bulk_make_available')],
          [Markup.button.callback('❌ Зробити недоступними', 'bulk_make_unavailable')],
          [Markup.button.callback('🏷️ Додати теги', 'bulk_add_tags')],
          [Markup.button.callback('⬅️ Назад', 'bulk_edit')]
        ]).reply_markup
      }
    );
    
  } catch (error) {
    logger.error('Error showing bulk actions', error instanceof Error ? error : new Error(String(error)));
  }
});

// Зробити книги доступними
manageBooksScene.action('bulk_make_available', async (ctx: BotContext) => {
  try {
    const state = ctx.scene.state as any;
    await ctx.answerCbQuery('⏳ Оновлюю...');
    
    const { updateBook } = await import('../database/models');
    
    for (const bookId of state.selectedBooks) {
      await updateBook(bookId, { is_available: true });
    }
    
    await ctx.reply(
      `✅ *Успішно оновлено!*\n\n` +
      `${state.selectedBooks.length} ${state.selectedBooks.length === 1 ? 'книга' : 'книг'} тепер доступні`,
      { parse_mode: 'Markdown' }
    );
    
    logger.info('Bulk update: made available', { 
      adminId: ctx.from?.id, 
      count: state.selectedBooks.length 
    });
    
    state.selectedBooks = [];
    
  } catch (error) {
    logger.error('Error bulk making available', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка при оновленні');
  }
});

// Зробити книги недоступними
manageBooksScene.action('bulk_make_unavailable', async (ctx: BotContext) => {
  try {
    const state = ctx.scene.state as any;
    await ctx.answerCbQuery('⏳ Оновлюю...');
    
    const { updateBook } = await import('../database/models');
    
    for (const bookId of state.selectedBooks) {
      await updateBook(bookId, { is_available: false });
    }
    
    await ctx.reply(
      `✅ *Успішно оновлено!*\n\n` +
      `${state.selectedBooks.length} ${state.selectedBooks.length === 1 ? 'книга' : 'книг'} тепер недоступні`,
      { parse_mode: 'Markdown' }
    );
    
    logger.info('Bulk update: made unavailable', { 
      adminId: ctx.from?.id, 
      count: state.selectedBooks.length 
    });
    
    state.selectedBooks = [];
    
  } catch (error) {
    logger.error('Error bulk making unavailable', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка при оновленні');
  }
});

// Додати теги до кількох книг
manageBooksScene.action('bulk_add_tags', async (ctx: BotContext) => {
  try {
    await ctx.answerCbQuery();
    
    const { getAllTags } = await import('../database/tagFunctions');
    const allTags = await getAllTags();
    
    if (allTags.length === 0) {
      await ctx.reply('🏷️ Немає доступних тегів. Спочатку створіть теги.');
      return;
    }
    
    const state = ctx.scene.state as any;
    state.selectedTags = [];
    
    // Створюємо кнопки з тегами
    const tagButtons = [];
    for (let i = 0; i < allTags.length; i += 2) {
      const row = [
        Markup.button.callback(allTags[i].name, `bulk_tag_${allTags[i].id}`)
      ];
      if (i + 1 < allTags.length) {
        row.push(Markup.button.callback(allTags[i + 1].name, `bulk_tag_${allTags[i + 1].id}`));
      }
      tagButtons.push(row);
    }
    
    tagButtons.push([
      Markup.button.callback('✅ Додати теги', 'bulk_apply_tags'),
      Markup.button.callback('❌ Скасувати', 'bulk_edit_actions')
    ]);
    
    await ctx.reply(
      `🏷️ *ДОДАТИ ТЕГИ*\n\n` +
      `Оберіть теги для додавання до ${state.selectedBooks.length} ${state.selectedBooks.length === 1 ? 'книги' : 'книг'}:`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(tagButtons).reply_markup
      }
    );
    
  } catch (error) {
    logger.error('Error showing tags', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка');
  }
});

// Вибір тегу
manageBooksScene.action(/bulk_tag_(\d+)/, async (ctx: BotContext) => {
  try {
    const tagId = parseInt(ctx.match[1]);
    const state = ctx.scene.state as any;
    
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
        Markup.button.callback(
          `${isSelected1 ? '✅ ' : ''}${tag1.name}`,
          `bulk_tag_${tag1.id}`
        )
      ];
      if (i + 1 < allTags.length) {
        const tag2 = allTags[i + 1];
        const isSelected2 = state.selectedTags.includes(tag2.id);
        row.push(
          Markup.button.callback(
            `${isSelected2 ? '✅ ' : ''}${tag2.name}`,
            `bulk_tag_${tag2.id}`
          )
        );
      }
      tagButtons.push(row);
    }
    
    tagButtons.push([
      Markup.button.callback('✅ Додати теги', 'bulk_apply_tags'),
      Markup.button.callback('❌ Скасувати', 'bulk_edit_actions')
    ]);
    
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(tagButtons).reply_markup);
    
  } catch (error) {
    logger.error('Error selecting tag', error instanceof Error ? error : new Error(String(error)));
  }
});

// Застосувати теги до книг
manageBooksScene.action('bulk_apply_tags', async (ctx: BotContext) => {
  try {
    const state = ctx.scene.state as any;
    
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
      `✅ *Успішно додано!*\n\n` +
      `${state.selectedTags.length} ${state.selectedTags.length === 1 ? 'тег' : 'теги'} додано до ` +
      `${state.selectedBooks.length} ${state.selectedBooks.length === 1 ? 'книги' : 'книг'}`,
      { parse_mode: 'Markdown' }
    );
    
    logger.info('Bulk update: added tags', { 
      adminId: ctx.from?.id, 
      booksCount: state.selectedBooks.length,
      tagsCount: state.selectedTags.length
    });
    
    state.selectedBooks = [];
    state.selectedTags = [];
    
  } catch (error) {
    logger.error('Error applying tags', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка при додаванні тегів');
  }
});

export default manageBooksScene;
