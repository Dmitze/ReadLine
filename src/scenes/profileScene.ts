import { Scenes } from 'telegraf';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { escapeHtml, getBookIdText } from '../utils/helpers';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { handleResult } from '../utils/resultHandler';
import { LIMITS } from '../constants/limits';
import { createUserManagementService } from '../services/UserManagementService';
import { db } from '../database/models';

const profileScene = new Scenes.BaseScene('PROFILE_SCENE');

profileScene.enter(async (ctx: BotContext) => {
   if (!ctx.from?.id) {
     await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
     return ctx.scene?.leave();
   }

   const userId = ctx.from.id;

   // Use UserManagementService to get profile data
   const userService = createUserManagementService(db);
   const profileResult = await userService.getUserProfile(userId);

   if (profileResult.isErr()) {
     logger.error('Failed to get user profile', profileResult.error);
     await ctx.reply('❌ Помилка при завантаженні профілю.');
     return ctx.scene?.leave();
   }

   const profile = profileResult.unwrap();

   // Fill in user info from Telegram context
   profile.firstName = escapeHtml(ctx.from.first_name || '');
   profile.lastName = escapeHtml(ctx.from.last_name || '');
   profile.username = ctx.from.username ? `@${escapeHtml(ctx.from.username)}` : 'не встановлено';

   // Format profile text using service
   const profileText = userService.formatProfileText(profile);

   const { Markup } = await import('telegraf');

   await ctx.reply(profileText, {
     parse_mode: 'HTML',
     reply_markup: Markup.inlineKeyboard([
       [{ text: '🤖 Персональні рекомендації', callback_data: 'show_personal_collection' }],
       [{ text: '🎯 AI Підбір книги', callback_data: 'start_ai_assistant' }],
       [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
       [{ text: '⬅️ Назад', callback_data: 'profile_back' }],
     ]).reply_markup,
   });

   logger.userAction(userId, 'view_profile');
 });

// Показати статистику
profileScene.action('show_stats', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  // Use UserManagementService to get stats
  const userService = createUserManagementService(db);
  const statsResult = await userService.getUserStats(userId);

  if (statsResult.isErr()) {
    logger.error('Failed to get user stats', statsResult.error);
    await ctx.reply('❌ Помилка при завантаженні статистики.');
    return;
  }

  const stats = statsResult.unwrap();
  const statsText = userService.formatDetailedStatsText(stats);

  await ctx.reply(statsText, { parse_mode: 'HTML' });
  logger.userAction(userId, 'view_stats');
});

// Запуск AI Підбору
profileScene.action('start_ai_assistant', async (ctx: BotContext) => {
  await ctx.answerCbQuery('🤖 Запускаю AI Підбір...');
  if (ctx.from?.id) {
    logger.userAction(ctx.from.id, 'start_ai_assistant_from_profile');
  }
  await ctx.scene?.leave();
  return ctx.scene?.enter('AI_ASSISTANT_SCENE');
});

// Назад
profileScene.action('profile_back', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene?.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('👋 Повертаємось до головного меню', {
    reply_markup: getMainMenuKeyboard(),
  });
});

// Обробник персональної підбірки (AI) - використовує розумні алгоритми
profileScene.action('show_personal_collection', async (ctx: BotContext) => {
  await ctx.answerCbQuery('🤖 Генерую персональну підбірку...');

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Помилка ідентифікації користувача');
    return;
  }

  await ctx.reply('🤖 Аналізую ваші вподобання та створюю персональну підбірку...');

  // Use UserManagementService to get personal collection
  const userService = createUserManagementService(db);
  const collectionResult = await userService.getPersonalCollection(userId, 5);

  if (collectionResult.isErr()) {
    logger.error('Failed to get personal collection', collectionResult.error);
    await ctx.reply('❌ Помилка при створенні персональної підбірки.');
    return;
  }

  const collectionData = collectionResult.unwrap();

  if (collectionData.books.length === 0) {
    await ctx.reply('😔 Не вдалося створити персональну підбірку. В каталозі поки немає книг.');
    return;
  }

  // Show appropriate message based on collection source
  let messageText = '📚 <b>Персональна підбірка для вас</b>\n\n';
  switch (collectionData.source) {
    case 'smart_recommendations':
      messageText += '🤖 Створено на основі ваших вподобань, тегів та рейтингів\n';
      break;
    case 'top_books':
      messageText += '🤖 На основі найкращих книг каталогу\n';
      break;
    case 'new_books':
      messageText += '🤖 Найновіші книги каталогу\n';
      break;
  }
  messageText += `📖 Знайдено ${collectionData.count} ${collectionData.count === 1 ? 'книгу' : 'книг'}`;

  await ctx.reply(messageText, { parse_mode: 'HTML' });

  // Показуємо книги
  const { formatBookCaption } = await import('../utils/helpers');
  const { isBookSaved } = await import('../database/models');

  for (const book of collectionData.books) {
    const caption = await formatBookCaption(book);
    const isSaved = await isBookSaved(userId, book.id!);
    const keyboard = getEnhancedBookKeyboard(book, isSaved);

    if (
      book.photo_file_id &&
      book.photo_file_id !== 'default_book_cover' &&
      book.photo_file_id.length > 20
    ) {
      await ctx
        .replyWithPhoto(book.photo_file_id, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        })
        .catch((photoError: Error) => {
          logger.debug('Photo error, sending as text');
          ctx.reply(caption, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
        });
    } else {
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }

    // Затримка між повідомленнями
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  logger.userAction(userId, 'ai_personal_collection', { booksFound: collectionData.count });
});

// Cleanup при виході зі сцени
profileScene.leave((ctx: BotContext) => {
  logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});

export default profileScene;
