import { Scenes, Markup } from 'telegraf';
import { askAI } from '../utils/aiHelper';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';

const aiScene = new Scenes.BaseScene('AI_SCENE');

aiScene.enter(async (ctx: BotContext) => {
  await ctx.reply(
    '<b>🤖 AI-ПОМІЧНИК ЧИТАЛЬНОГО ЗАЛУ</b>\n\n' +
    '<i>Розумний помічник для роботи з книгами та літературою</i>\n\n' +
    '<b>Я можу допомогти вам з:</b>\n' +
    '📚 <b>Рекомендаціями книг</b> - знайду ідеальну книгу для вас\n' +
    '🔍 <b>Пошуком книг</b> - опишіть, що вас цікавить\n' +
    '✍️ <b>Інформацією про авторів</b> - розповім про письменників\n' +
    '📖 <b>Поясненням жанрів</b> - допоможу розібратися в стилях\n' +
    '💡 <b>Питаннями про літературу</b> - відповідам на будь-які питання\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '<b>✍️ Напишіть ваше питання:</b>\n\n' +
    '<b>💡 Приклади запитань:</b>\n' +
    '• "Порекомендуй книгу про космос та пригоди"\n' +
    '• "Розкажи про жанр фантастика та його особливості"\n' +
    '• "Хто такий Тарас Шевченко та які його найкращі твори?"\n' +
    '• "Які книги подобаються любителям детективів?"\n' +
    '• "Дай топ 5 класичних романів"',
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
  const { withTimeout, retryOperation } = await import('../utils/errorHandler');
  const { CONFIG } = await import('../constants');
  
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
     () => retryOperation(() => askAI(question, ctx.from?.id), 2, 1000),
     CONFIG.AI_TIMEOUT_MS,
     'AI request timeout'
   );
   
   // Видаляємо "думаю" повідомлення (ігноруємо помилки)
   await ctx.deleteMessage(thinkingMsg.message_id).catch((err) => {
      logger.debug('Failed to delete thinking message', { error: err?.message });
    });
  
  // Відправляємо відповідь з Markdown форматуванням
  await ctx.reply(
    `🤖 AI-ПОМІЧНИК:\n\n${answer}\n\n` +
    '❓ Задайте ще питання або натисніть "⬅️ Назад до меню"',
    { parse_mode: 'Markdown' }
  );
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
