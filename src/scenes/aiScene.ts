import { Scenes, Markup } from 'telegraf';
import { isAIEnabled, askAI } from '../utils/aiHelper';
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
  const { withTimeout, retryOperation, sendErrorToUser } = await import('../utils/errorHandler');
  const { CONFIG } = await import('../constants');
  
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
    
    const thinkingMsg = await ctx.reply('🤔 Думаю...');
    
    // Використовуємо withTimeout з константою
    const answer = await withTimeout(
      () => retryOperation(() => askAI(question), 2, 1000),
      CONFIG.AI_TIMEOUT_MS,
      'AI request timeout'
    );
    
    // Видаляємо "думаю" повідомлення
    try {
      await ctx.deleteMessage(thinkingMsg.message_id);
    } catch {}
    
    // Відправляємо відповідь (без parse_mode щоб уникнути помилок з спецсимволами)
    await ctx.reply(
      `🤖 AI-ПОМІЧНИК:\n\n${answer}\n\n` +
      '❓ Задайте ще питання або натисніть "⬅️ Назад до меню"'
    );
    
  } catch (error) {
    logger.error('Error in AI scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
    await sendErrorToUser(ctx, error, 
      '❌ Помилка AI. Спробуйте перефразувати питання або спробуйте пізніше.'
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
