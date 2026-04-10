import { Scenes, Markup } from 'telegraf';
import { searchBooks, getBooksByGenre } from '../database/models';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { askAI } from '../utils/aiHelper';

const searchScene = new Scenes.BaseScene('SEARCH_SCENE');

searchScene.enter(async (ctx: BotContext) => {
  (ctx.scene as any).state.searchType = null;
  await showSearchTypeMenu(ctx, false);
});

const SEARCH_TYPE_PROMPTS: Record<string, string> = {
  title:
    '📖 <b>ПОШУК ЗА НАЗВОЮ</b>\n\nВведіть назву книги:\n\n💡 Приклад: <i>Кобзар</i>',
  author:
    '👤 <b>ПОШУК ЗА АВТОРОМ</b>\n\nВведіть ім\'я автора:\n\n💡 Приклад: <i>Шевченко</i>',
  genre:
    '📚 <b>ПОШУК ЗА ЖАНРОМ</b>\n\nВведіть жанр:\n\n💡 Приклад: <i>Фантастика</i>',
  general:
    '🔍 <b>ЗАГАЛЬНИЙ ПОШУК</b>\n\nВведіть будь-яке слово (назву, автора, жанр):\n\n💡 Знаходить навіть з помилками: "Кобзарь" → "Кобзар"',
  ai:
    '🤖 <b>РОЗУМНИЙ ПОШУК (AI)</b>\n\nОпишіть що ви шукаєте:\n\n💡 Приклади:\n• "Романтична книга про море"\n• "Детектив з крутою розв\'язкою"\n• "Щось легке для читання перед сном"',
};

const backToSearchTypeKeyboard = Markup.inlineKeyboard([
  [{ text: '⬅️ Змінити тип пошуку', callback_data: 'search_choose_type' }],
]).reply_markup;

async function showSearchTypeMenu(ctx: BotContext, edit = false) {
  const text = '🔍 <b>Розширений пошук книг</b>\n\nОберіть тип пошуку:';
  const keyboard = Markup.inlineKeyboard([
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
  ]).reply_markup;

  if (edit) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

for (const type of ['search_by_title', 'search_by_author', 'search_by_genre', 'search_general', 'search_ai']) {
  searchScene.action(type, async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const key = type.replace('search_by_', '').replace('search_', '');
    (ctx.scene as any).state.searchType = key === 'general' ? 'general' : key === 'ai' ? 'ai' : key;
    await ctx.editMessageText(SEARCH_TYPE_PROMPTS[key] ?? SEARCH_TYPE_PROMPTS['general'], {
      parse_mode: 'HTML',
      reply_markup: backToSearchTypeKeyboard,
    });
  });
}

searchScene.action('search_choose_type', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = null;
  await showSearchTypeMenu(ctx, true);
});

searchScene.action('search_back', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene?.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('🏠 Повернувся до головного меню:', {
    reply_markup: getMainMenuKeyboard(),
  });
});

// Обробник тексту — виконує пошук залежно від обраного типу
searchScene.on('text', async (ctx: BotContext) => {
  const searchType = (ctx.scene as any).state.searchType;
  const query = ctx.message.text.trim();

  if (!searchType) {
    await ctx.reply(
      '⚠️ Спочатку оберіть тип пошуку кнопками вище.',
      { parse_mode: 'HTML' }
    );
    return;
  }

  if (query.length < 2) {
    await ctx.reply('⚠️ Запит занадто короткий. Введіть мінімум 2 символи.');
    return;
  }

  const thinkingMsg = await ctx.reply('🔍 Шукаю...');

  try {
    // AI пошук
    if (searchType === 'ai') {
      const { isAIEnabled } = await import('../utils/aiHelper');
      if (!isAIEnabled()) {
        await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => {});
        await ctx.reply('❌ AI недоступний. Спробуйте загальний пошук.');
        return;
      }

      const prompt =
        `У нас є бібліотека книг. Користувач шукає: "${query}".\n` +
        `Визнач 3-5 коротких ключових слів (тільки назви книг або імена авторів або один жанр) для пошуку в базі даних SQLite. ` +
        `Відповідай ТІЛЬКИ списком через кому, без пояснень, без лапок. Наприклад: Козачка, Марко Вовчок, Фантастика`;
      const keywordsResponse = await askAI(prompt, ctx.from?.id);
      const keywords = keywordsResponse.text;

      await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => {});

      // Збираємо всі терміни для пошуку: оригінальний запит + ключові слова від AI
      const keywordList = [
        query, // завжди шукаємо сам запит користувача
        ...keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
      ].slice(0, 5);

      const seenIds = new Set<number>();
      const foundBooks: any[] = [];

      for (const kw of keywordList) {
        if (kw.length < 2) continue;
        const results = await searchBooks(kw, 5);
        for (const b of results) {
          if (!seenIds.has(b.id!)) {
            seenIds.add(b.id!);
            foundBooks.push(b);
          }
        }
        if (foundBooks.length >= 5) break;
      }

      if (foundBooks.length === 0) {
        await ctx.reply(
          `🤖 AI шукав за: <i>${keywordList.join(', ')}</i>\n\n😔 Нічого не знайдено в бібліотеці.\n\nСпробуйте загальний пошук.`,
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [{ text: '🔍 Загальний пошук', callback_data: 'search_general' }],
              [{ text: '⬅️ Змінити тип пошуку', callback_data: 'search_choose_type' }],
            ]).reply_markup,
          }
        );
        return;
      }

      await ctx.reply(
        `🤖 AI знайшов <b>${foundBooks.length}</b> ${foundBooks.length === 1 ? 'книгу' : 'книги'} за запитом "<i>${query}</i>":`,
        { parse_mode: 'HTML' }
      );

      for (const book of foundBooks.slice(0, 5)) {
        const { formatBookCaption } = await import('../utils/helpers');
        const { isBookSaved } = await import('../database/models');
        const caption = await formatBookCaption(book);
        const isSaved = ctx.from?.id ? await isBookSaved(ctx.from.id, book.id!) : false;
        const keyboard = getEnhancedBookKeyboard(book, isSaved);
        if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
          await ctx.replyWithPhoto(book.photo_file_id, { caption, parse_mode: 'HTML', reply_markup: keyboard });
        } else {
          await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard });
        }
      }

      await ctx.reply('🔍 Шукати ще?', {
        reply_markup: Markup.inlineKeyboard([
          [{ text: '🔍 Новий пошук', callback_data: 'search_new' }],
          [{ text: '⬅️ Назад до меню', callback_data: 'search_back' }],
        ]).reply_markup,
      });
      return;
    }

    // Звичайний пошук
    let books;
    if (searchType === 'genre') {
      books = await getBooksByGenre(query);
    } else if (searchType === 'title') {
      // Прямий пошук по назві — не обмежений загальним пошуком
      const { searchBooksByField } = await import('../database/tables/books');
      books = await searchBooksByField('title', query, 10);
    } else if (searchType === 'author') {
      // Прямий пошук по автору
      const { searchBooksByField } = await import('../database/tables/books');
      books = await searchBooksByField('author', query, 10);
    } else {
      // Загальний пошук по всіх полях
      books = await searchBooks(query, 10);
    }

    await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => {});

    if (!books || books.length === 0) {
      await ctx.reply(
        `😔 <b>Нічого не знайдено</b> за запитом "<i>${query}</i>"\n\n` +
        'Спробуйте інший запит або загальний пошук.',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [{ text: '🔍 Новий пошук', callback_data: 'search_new' }],
            [{ text: '⬅️ Назад', callback_data: 'search_back' }],
          ]).reply_markup,
        }
      );
      return;
    }

    await ctx.reply(
      `✅ <b>Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}</b> за запитом "<i>${query}</i>":`,
      { parse_mode: 'HTML' }
    );

    // Показуємо перші 5 книг
    for (const book of books.slice(0, 5)) {
      const { formatBookCaption } = await import('../utils/helpers');
      const { isBookSaved } = await import('../database/models');
      const caption = await formatBookCaption(book);
      const isSaved = ctx.from?.id ? await isBookSaved(ctx.from.id, book.id!) : false;
      const keyboard = getEnhancedBookKeyboard(book, isSaved);

      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
        await ctx.replyWithPhoto(book.photo_file_id, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      } else {
        await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    }

    if (books.length > 5) {
      await ctx.reply(`📚 Показано 5 з ${books.length}. Уточніть запит для кращих результатів.`);
    }

    // Кнопка нового пошуку
    await ctx.reply('🔍 Шукати ще?', {
      reply_markup: Markup.inlineKeyboard([
        [{ text: '🔍 Новий пошук', callback_data: 'search_new' }],
        [{ text: '⬅️ Назад до меню', callback_data: 'search_back' }],
      ]).reply_markup,
    });

    logger.userAction(ctx.from?.id || 0, 'search', { query, type: searchType, results: books.length });
  } catch (error) {
    await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => {});
    logger.error('Search error', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка пошуку. Спробуйте ще раз.');
  }
});

// Новий пошук — повертає до вибору типу
searchScene.action('search_new', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = null;
  await showSearchTypeMenu(ctx, false);
});

export default searchScene;
