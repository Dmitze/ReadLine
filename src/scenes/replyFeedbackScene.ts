import { Scenes, Markup } from 'telegraf';
import { addAdminReply } from '../database/models';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';

interface ReplyState {
  feedbackId?: number;
  userId?: number;
  userName?: string;
  originalMessage?: string;
}

const replyFeedbackScene = new Scenes.BaseScene<BotContext>('REPLY_FEEDBACK_SCENE');

replyFeedbackScene.enter(async (ctx: BotContext) => {
  const state = ctx.scene.state as ReplyState;
  
  if (!state.feedbackId || !state.userId) {
    await ctx.reply('❌ Помилка: не вдалося отримати дані повідомлення.');
    return ctx.scene.leave();
  }
  
  await ctx.reply(
    `✉️ *ВІДПОВІДЬ НА ПОВІДОМЛЕННЯ*\n\n` +
    `👤 Від: ${state.userName || 'Користувач'}\n` +
    `💬 Повідомлення:\n"${state.originalMessage}"\n\n` +
    `📝 Введіть вашу відповідь:`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.keyboard([['❌ Скасувати']]).resize().reply_markup
    }
  );
});

replyFeedbackScene.hears('❌ Скасувати', async (ctx: BotContext) => {
  await ctx.reply('❌ Відповідь скасована.');
  return ctx.scene.leave();
});

replyFeedbackScene.on('text', async (ctx: BotContext) => {
  const state = ctx.scene.state as ReplyState;
  const replyText = 'text' in ctx.message ? ctx.message.text : '';
  
  if (!replyText || replyText.trim().length === 0) {
    await ctx.reply('❌ Відповідь не може бути порожньою. Спробуйте ще раз.');
    return;
  }
  
  try {
    // Зберігаємо відповідь в БД
    await addAdminReply(state.feedbackId!, replyText);
    
    // Надсилаємо відповідь користувачу
    try {
      await ctx.telegram.sendMessage(
        state.userId!,
        `📬 *ВІДПОВІДЬ ВІД АДМІНІСТРАТОРА*\n\n` +
        `💬 Ваше повідомлення:\n"${state.originalMessage}"\n\n` +
        `✉️ Відповідь:\n${replyText}\n\n` +
        `Дякуємо за звернення!`,
        { parse_mode: 'Markdown' }
      );
      
      await ctx.reply(
        `✅ *Відповідь надіслана!*\n\n` +
        `👤 Користувач: ${state.userName}\n` +
        `✉️ Ваша відповідь:\n"${replyText}"`,
        { parse_mode: 'Markdown' }
      );
      
      logger.info('Admin replied to feedback', { 
        feedbackId: state.feedbackId, 
        userId: state.userId,
        adminId: ctx.from?.id 
      });
      
    } catch (sendError) {
      logger.error('Error sending reply to user', sendError instanceof Error ? sendError : new Error(String(sendError)));
      await ctx.reply(
        `⚠️ Відповідь збережена в БД, але не вдалося надіслати користувачу.\n` +
        `Можливо користувач заблокував бота.`
      );
    }
    
    return ctx.scene.leave();
    
  } catch (error) {
    logger.error('Error saving reply', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Виникла помилка при збереженні відповіді. Спробуйте ще раз.');
  }
});

export default replyFeedbackScene;
