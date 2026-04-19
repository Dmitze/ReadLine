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
    '✉️ <b>ВІДПОВІДЬ НА ПОВІДОМЛЕННЯ</b>\n\n' +
      `👤 Від: ${state.userName || 'Користувач'}\n` +
      `💬 Повідомлення:\n"${state.originalMessage}"\n\n` +
      '📝 Введіть вашу відповідь:\n\n' +
      '💡 Або використовуйте /cancel для скасування',
    {
      parse_mode: 'HTML',
    }
  );
});

replyFeedbackScene.on('text', async (ctx: BotContext) => {
  const state = ctx.scene.state as ReplyState;
  const replyText = 'text' in ctx.message ? ctx.message.text : '';

  if (!replyText || replyText.trim().length === 0) {
    await ctx.reply('❌ Відповідь не може бути порожньою. Спробуйте ще раз.');
    return;
  }

  // Зберігаємо відповідь в БД
  await addAdminReply(state.feedbackId!, replyText);

  // Намагаємось надіслати повідомлення користувачу
  await ctx.telegram
    .sendMessage(
      state.userId!,
      '📬 <b>ВІДПОВІДЬ ВІД АДМІНІСТРАТОРА</b>\n\n' +
        `💬 Ваше повідомлення:\n"${state.originalMessage}"\n\n` +
        `✉️ Відповідь:\n${replyText}\n\n` +
        'Дякуємо за звернення!',
      { parse_mode: 'Markdown' }
    )
    .then(async () => {
      await ctx.reply(
        '✅ *Відповідь надіслана!*\n\n' +
          `👤 Користувач: ${state.userName}\n` +
          `✉️ Ваша відповідь:\n"${replyText}"`,
        { parse_mode: 'Markdown' }
      );

      logger.info('Admin replied to feedback', {
        feedbackId: state.feedbackId,
        userId: state.userId,
        adminId: ctx.from?.id,
      });
    })
    .catch(async (sendError: any) => {
      const errorMessage = sendError?.message || String(sendError);
      const errorCode = sendError?.response?.error_code;

      const isBotBlocked =
        errorMessage.includes('bot was blocked by the user') ||
        errorMessage.includes('user is deactivated') ||
        errorMessage.includes('chat not found') ||
        errorCode === 403;

      const isChatDeleted = errorMessage.includes('chat not found') || errorCode === 400;

      logger.error(
        'Error sending reply to user',
        sendError instanceof Error ? sendError : new Error(String(sendError)),
        {
          userId: state.userId,
          isBotBlocked,
          isChatDeleted,
          errorCode,
        }
      );

      if (isBotBlocked) {
        await ctx.reply(
          '⚠️ <b>Відповідь збережена в БД</b>\n\n' +
            '❌ Користувач заблокував бота.\n' +
            'Повідомлення не доставлено, але збережено в системі.',
          { parse_mode: 'Markdown' }
        );
      } else if (isChatDeleted) {
        await ctx.reply(
          '⚠️ <b>Відповідь збережена в БД</b>\n\n' +
            '❌ Чат з користувачем не знайдено (можливо видалив акаунт).\n' +
            'Повідомлення не доставлено.',
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(
          '⚠️ <b>Відповідь збережена в БД</b>\n\n' +
            '❌ Помилка при надсиланні:\n' +
            `${errorMessage.substring(0, 150)}`,
          { parse_mode: 'Markdown' }
        );
      }
    });

  return ctx.scene.leave();
});

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
