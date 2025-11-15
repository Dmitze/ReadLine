import { Scenes } from 'telegraf';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';

const feedbackScene = new Scenes.BaseScene('FEEDBACK_SCENE');

feedbackScene.enter(async (ctx) => {
  const { Markup } = await import('telegraf');
  await ctx.reply(
    '📞 *ЗВОРОТНІЙ ЗВ\'ЯЗОК*\n\n' +
    'Ви можете надіслати повідомлення адміністратору.\n\n' +
    '💬 Напишіть ваше повідомлення, питання або пропозицію.\n' +
    'Адміністратор отримає його одразу і зв\'яжеться з вами.\n\n' +
    '📝 Що можна писати:\n' +
    '• Питання про книги\n' +
    '• Скарги або проблеми\n' +
    '• Пропозиції покращень\n' +
    '• Запити на додавання книг\n\n' +
    '✍️ Напишіть ваше повідомлення:',
    { 
      parse_mode: 'Markdown',
      reply_markup: Markup.keyboard([['⬅️ Назад до меню']]).resize().reply_markup
    }
  );
});

feedbackScene.on('text', async (ctx: BotContext) => {
  if (!('text' in ctx.message)) {
    await ctx.reply('❌ Будь ласка, надішліть текстове повідомлення.');
    return;
  }
  const userId = ctx.from?.id;
  const userName = ctx.from?.first_name || 'Користувач';
  const userUsername = ctx.from?.username;
  const message = ctx.message.text;
  
  if (!message || message.length < 3) {
    await ctx.reply('⚠️ Повідомлення занадто коротке. Будь ласка, напишіть більше деталей.');
    return;
  }
  
  if (!userId) {
    await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
    return ctx.scene?.leave();
  }
  
  // Зберігаємо повідомлення в БД
   const { addFeedbackMessage, getAllAdmins } = await import('../database/models');
   
   await addFeedbackMessage({
     user_id: userId,
     user_name: userName,
     user_username: userUsername,
     message: message
   }).then((feedbackId) => {
     logger.info('Feedback message saved', { feedbackId, userId });
   }).catch((dbError) => {
     logger.error('Error saving feedback to DB', dbError instanceof Error ? dbError : new Error(String(dbError)), { userId });
   });
  
  // Отримуємо всіх адмінів
  const admins = await getAllAdmins();
  
  if (admins.length === 0) {
    await ctx.reply(
      '✅ *Повідомлення збережено!*\n\n' +
      'Ваше повідомлення збережено в системі.\n' +
      'Адміністратор переглянеце його найближчим часом і зв\'яжеться з вами.\n\n' +
      '📱 Очікуйте відповіді в приватних повідомленнях.',
      { parse_mode: 'Markdown' }
    );
    return ctx.scene?.leave();
  }
  
  // Формуємо повідомлення для адміна
  // Екрануємо спецсимволи Markdown
  const escapeMarkdown = (text: string) => {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  };
  
  const safeName = escapeMarkdown(userName);
  const safeUsername = userUsername ? escapeMarkdown(userUsername) : '';
  const safeMessage = escapeMarkdown(message);
  
  const adminMessage = 
    '📞 *НОВЕ ПОВІДОМЛЕННЯ ЗВОРОТНОГО ЗВ\'ЯЗКУ*\n\n' +
    `👤 Від: ${safeName}\n` +
    `🆔 User ID: \`${userId}\`\n` +
    `📱 Username: ${userUsername ? '@' + safeUsername : 'немає'}\n\n` +
    '💬 *Повідомлення:*\n' +
    `"${safeMessage}"\n\n` +
    `📅 Дата: ${escapeMarkdown(new Date().toLocaleString('uk-UA'))}`;
  
  // Відправляємо всім адмінам
  let sentCount = 0;
  for (const admin of admins) {
    await ctx.telegram.sendMessage(admin.user_id, adminMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '💬 Відповісти',
              url: `tg://user?id=${userId}`
            }
          ]
        ]
      }
    }).then(() => {
      sentCount++;
    }).catch((error) => {
      logger.error('Error sending to admin', error instanceof Error ? error : new Error(String(error)), { adminId: admin.user_id });
    });
  }
  
  if (sentCount > 0) {
    await ctx.reply(
      '✅ *Повідомлення надіслано!*\n\n' +
      `Ваше повідомлення отримали ${sentCount} адміністратор${sentCount > 1 ? 'и' : ''}.\n` +
      'Очікуйте відповіді найближчим часом.\n\n' +
      '📱 Адміністратор може зв\'язатися з вами через приватні повідомлення.',
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      '✅ *Повідомлення збережено!*\n\n' +
      'Не вдалося надіслати адміністраторам напряму, але ваше повідомлення збережено в системі.\n' +
      'Адміністратор переглянеце його в панелі управління і зв\'яжеться з вами.\n\n' +
      '📱 Очікуйте відповіді в приватних повідомленнях.',
      { parse_mode: 'Markdown' }
    );
  }
  
  // Повертаємось до головного меню після відправки
  await ctx.scene?.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('🏠 Повертаємось до головного меню', {
    reply_markup: getMainMenuKeyboard()
  });
  return;
});

// Обробка скасування
feedbackScene.command('cancel', async (ctx: BotContext) => {
  const { Markup } = await import('telegraf');
  await ctx.reply('❌ Відправка повідомлення скасована.', {
    reply_markup: Markup.removeKeyboard().reply_markup
  });
  return ctx.scene?.leave();
});

// Обробка кнопки "Назад"
feedbackScene.hears('⬅️ Назад до меню', async (ctx: BotContext) => {
  await ctx.scene?.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('👋 Повертаємось до головного меню', {
    reply_markup: getMainMenuKeyboard()
  });
  return;
});

// Обробка команди /cancel
feedbackScene.hears('/cancel', async (ctx: BotContext) => {
  await ctx.scene?.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('❌ Відправка повідомлення скасована', {
    reply_markup: getMainMenuKeyboard()
  });
  return;
});

export default feedbackScene;
