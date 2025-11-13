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
    `✉️ <b>ВІДПОВІДЬ НА ПОВІДОМЛЕННЯ</b>\n\n` +
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

// ✅ ВИПРАВЛЕНО #15: покращена обробка блокування бота
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
    
    // Намагаємось надіслати повідомлення користувачу
    try {
      await ctx.telegram.sendMessage(
        state.userId!,
        `📬 <b>ВІДПОВІДЬ ВІД АДМІНІСТРАТОРА</b>\n\n` +
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
      
    } catch (sendError: any) {
      // Детальна обробка помилок Telegram API
      const errorMessage = sendError?.message || String(sendError);
      const errorCode = sendError?.response?.error_code;
      
      // Перевіряємо різні типи помилок
      const isBotBlocked = errorMessage.includes('bot was blocked by the user') || 
                          errorMessage.includes('user is deactivated') ||
                          errorMessage.includes('chat not found') ||
                          errorCode === 403;
      
      const isChatDeleted = errorMessage.includes('chat not found') || errorCode === 400;
      
      logger.error('Error sending reply to user', sendError instanceof Error ? sendError : new Error(String(sendError)), {
        userId: state.userId,
        isBotBlocked,
        isChatDeleted,
        errorCode
      });
      
      if (isBotBlocked) {
        await ctx.reply(
          `⚠️ <b>Відповідь збережена в БД</b>\n\n` +
          `❌ Користувач заблокував бота.\n` +
          `Повідомлення не доставлено, але збережено в системі.`,
          { parse_mode: 'Markdown' }
        );
      } else if (isChatDeleted) {
        await ctx.reply(
          `⚠️ <b>Відповідь збережена в БД</b>\n\n` +
          `❌ Чат з користувачем не знайдено (можливо видалив акаунт).\n` +
          `Повідомлення не доставлено.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(
          `⚠️ <b>Відповідь збережена в БД</b>\n\n` +
          `❌ Помилка при надсиланні:\n` +
          `${errorMessage.substring(0, 150)}`,
          { parse_mode: 'Markdown' }
        );
      }
    }
    
    return ctx.scene.leave();
    
  } catch (error) {
    logger.error('Error saving reply', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Виникла помилка при збереженні відповіді. Спробуйте ще раз.');
  }
});

// Cleanup при виході зі сцени
replyFeedbackScene.leave((ctx: BotContext) => {
  const state = ctx.scene.state as ReplyState;
  if (state) {
    delete state.feedbackId;
    delete state.userId;
    delete state.userName;
    delete state.originalMessage;
  }
  logger.debug('ReplyFeedbackScene cleanup completed', { userId: ctx.from?.id });
});

export default replyFeedbackScene;
