import { Scenes } from 'telegraf';
import { searchBooks, Book } from '../database/models';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { handleResult } from '../utils/resultHandler';
import { getBookIdText } from '../utils/helpers';
import { LIMITS } from '../constants/limits';

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
    '📖 <b>ПОШУК ЗА НАЗВОЮ</b>\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Введіть назву легенди яку шукаєш:\n\n' +
      '💡 Приклад: Кобзар',
    { parse_mode: 'HTML' }
  );
});

searchScene.action('search_by_author', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'author';
  await ctx.editMessageText(
    '👤 <b>ПОШУК ЗА АВТОРОМ</b>\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      "Введіть ім'я скальда-автора:\n\n" +
      '💡 Приклад: Шевченко',
    { parse_mode: 'HTML' }
  );
});

searchScene.action('search_by_genre', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'genre';
  await ctx.editMessageText(
    '📚 <b>ПОШУК ЗА ЖАНРОМ (БИТВОЮ)</b>\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Введіть тип битви яку хочеш пережити:\n\n' +
      '💡 Приклад: Історична',
    { parse_mode: 'HTML' }
  );
});

searchScene.action('search_general', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'general';
  await ctx.editMessageText(
    '🔍 <b>ПОВНИЙ ПОШУК</b>\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Введи будь-яке слово (назву, імя автора, жанр):\n\n' +
      '✨ <b>СУПЕРСИЛИ РОЗВІДКИ:</b>\n' +
      '⚔️ Знаходить навіть з помилками: "Кобзарь" → "Кобзар"\n' +
      '🗡️ Розуміє синоніми: "Sci-Fi" → "Фантастика"\n' +
      '📚 Автодоповнення при введенні\n\n' +
      '💡 Розвідка шукає по всіх полях книги',
    { parse_mode: 'HTML' }
  );
});

searchScene.action('search_back', async (ctx: BotContext) => {
  await ctx.answerCbQuery('⚔️ Повернення на базу');
  await ctx.scene?.leave();
  const { Markup } = await import('telegraf');
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('🗡️ Повернувся на базу! Обери наступну битву:', {
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
    '🤖 <b>AI РОЗВІДКА</b>\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Розповідь AI Мудреці про яку легенду ти шукаєш:\n\n' +
      '💡 <b>ПРИКЛАДИ:</b>\n' +
      '⚔️ "Романтичні битви у древньому Києві"\n' +
      '🗡️ "Детективи з крутою розв\'язкою"\n' +
      '📚 "Щось легке для відпочинку увечері"\n' +
      '📖 "Легенди як у Толкіена"',
    { parse_mode: 'HTML' }
  );
});

export default searchScene;
