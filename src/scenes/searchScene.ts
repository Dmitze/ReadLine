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

// ✅ ВИПРАВЛЕНО БАГ #5: Видалено текстовий обробник
// Пошук тепер працює тільки через inline кнопки (search_by_title, search_by_author, search_by_genre, search_ai)

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
