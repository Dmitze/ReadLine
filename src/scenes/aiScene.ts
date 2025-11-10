import { Scenes, Markup } from 'telegraf';
import { isAIEnabled, askAI, getBookRecommendations } from '../utils/aiHelper';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';

const aiScene = new Scenes.BaseScene('AI_SCENE');

aiScene.enter(async (ctx: BotContext) => {
  if (!isAIEnabled()) {
    await ctx.reply(
      '❌ *AI-помічник недоступний*\n\n' +
      'Для використання AI-помічника адміністратор повинен додати `GEMINI_API_KEY` в `.env` файл.\n\n' +
      '💡 Як налаштувати:\n' +
      '1. Отримайте API ключ на https://makersuite.google.com/app/apikey\n' +
      '2. Додайте в .env: `GEMINI_API_KEY=ваш_ключ`\n' +
      '3. Перезапустіть бота',
      { parse_mode: 'Markdown' }
    );
    return ctx.scene?.leave();
  }
  
  await ctx.reply(
    '🤖 *AI-ПОМІЧНИК АКТИВОВАНО*\n\n' +
    'Я можу допомогти вам з:\n' +
    '📚 Рекомендаціями книг\n' +
    '🔍 Пошуком книг за описом\n' +
    '✍️ Інформацією про авторів\n' +
    '📖 Поясненням жанрів\n' +
    '💡 Відповідями на питання про літературу\n\n' +
    '✍️ *Напишіть ваше питання:*\n\n' +
    '💡 *Приклади:*\n' +
    '• "Порекомендуй книгу про космос"\n' +
    '• "Розкажи про жанр фантастика"\n' +
    '• "Хто такий Тарас Шевченко?"',
    { 
      parse_mode: 'Markdown',
      reply_markup: Markup.keyboard([['⬅️ Назад до меню']]).resize().reply_markup
    }
  );
});

// Обробка команди /cancel та кнопки "Назад"
aiScene.command('cancel', async (ctx: BotContext) => {
  await ctx.scene?.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('👋 Вихід з AI-помічника', {
    reply_markup: getMainMenuKeyboard()
  });
  return;
});

aiScene.hears('⬅️ Назад до меню', async (ctx: BotContext) => {
  await ctx.scene?.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('👋 Повертаємось до головного меню', {
    reply_markup: getMainMenuKeyboard()
  });
  return;
});

aiScene.on('text', async (ctx: BotContext) => {
  try {
    if (!('text' in ctx.message)) {
      await ctx.reply('❌ Будь ласка, надішліть текстове повідомлення.');
      return;
    }
    const question = ctx.message.text;
    
    if (!question || question.length < 3) {
      await ctx.reply('⚠️ Питання занадто коротке. Напишіть більше деталей.');
      return;
    }
    
    // Показуємо що обробляємо
    await ctx.reply('🤔 Думаю...');
    
    // Отримуємо відповідь від AI
    const aiResponse = await askAI(question);
    
    // Відправляємо відповідь
    await ctx.reply(
      `🤖 *AI-ПОМІЧНИК:*\n\n${aiResponse}\n\n` +
      '❓ Задайте ще питання або натисніть "⬅️ Назад до меню"',
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    logger.error('Error in AI scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
    const errorMessage = error instanceof Error ? error.message : String(error);
    await ctx.reply(
      '❌ *Помилка AI:*\n' +
      `${errorMessage}\n\n` +
      'Спробуйте:\n' +
      '• Перефразувати питання\n' +
      '• Зробити питання коротшим\n' +
      '• Спробувати пізніше',
      { parse_mode: 'Markdown' }
    );
  }
});

// Обробка інших команд
aiScene.on('message', async (ctx) => {
  await ctx.reply(
    '❓ Будь ласка, напишіть текстове питання.\n' +
    'Або натисніть "⬅️ Назад до меню" для виходу.'
  );
});

export default aiScene;
