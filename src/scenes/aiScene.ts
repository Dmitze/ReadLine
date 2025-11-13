import { Scenes, Markup } from 'telegraf';
import { isAIEnabled, askAI } from '../utils/aiHelper';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';

const aiScene = new Scenes.BaseScene('AI_SCENE');

aiScene.enter(async (ctx: BotContext) => {
  if (!isAIEnabled()) {
     await ctx.reply(
       '❌ <b>AI-помічник недоступний</b>\n\n' +
       'Для використання AI-помічника адміністратор повинен додати <code>GEMINI_API_KEY</code> в <code>.env</code> файл.\n\n' +
       '💡 Як налаштувати:\n' +
       '1. Отримайте API ключ на https://makersuite.google.com/app/apikey\n' +
       '2. Додайте в .env: <code>GEMINI_API_KEY=ваш_ключ</code>\n' +
       '3. Перезапустіть бота',
       { parse_mode: 'HTML' }
     );
     return ctx.scene?.leave();
   }
  
  await ctx.reply(
    '🤖 <b>AI-ПОМІЧНИК АКТИВОВАНО</b>\n\n' +
    'Я можу допомогти вам з:\n' +
    '📚 Рекомендаціями книг\n' +
    '🔍 Пошуком книг за описом\n' +
    '✍️ Інформацією про авторів\n' +
    '📖 Поясненням жанрів\n' +
    '💡 Відповідями на питання про літературу\n\n' +
    '✍️ <b>Напишіть ваше питання:</b>\n\n' +
    '💡 <b>Приклади:</b>\n' +
    '• "Порекомендуй книгу про космос"\n' +
    '• "Розкажи про жанр фантастика"\n' +
    '• "Хто такий Тарас Шевченко?"',
    { 
      parse_mode: 'HTML',
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

// Cleanup при виході зі сцени
aiScene.leave((ctx: BotContext) => {
  logger.debug('AIScene cleanup completed', { userId: ctx.from?.id });
});

export default aiScene;
