import { Scenes, Markup } from 'telegraf';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { escapeHtml } from '../utils/helpers';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { createUserManagementService } from '../services/UserManagementService';
import { db } from '../database/models';
import { getUserBookOrders } from '../database/bookOrderFunctions';

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
       await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
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
     [{ text: '📋 Мої замовлення', callback_data: 'show_my_orders' }],
     [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
     [{ text: '⬅️ Назад', callback_data: 'profile_back' }],
   ]).reply_markup,
   });

   logger.userAction(userId, 'view_profile');
});

// Персональні рекомендації
profileScene.action('show_personal_collection', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const userService = createUserManagementService(db);
  const result = await userService.getPersonalCollection(userId, 5);

  if (result.isErr() || result.unwrap().books.length === 0) {
    await ctx.reply('📚 Поки що рекомендацій немає. Збережіть більше книг!');
    return;
  }

  const { books, source } = result.unwrap();
  const sourceLabel =
    source === 'smart_recommendations'
      ? '🤖 Персональні рекомендації на основі ваших вподобань'
      : source === 'top_books'
        ? '🏆 Популярні книги'
        : '🆕 Нові надходження';

  await ctx.reply(`<b>${sourceLabel}</b>`, { parse_mode: 'HTML' });

  for (const book of books) {
    const caption = `📖 <b>${escapeHtml(book.title)}</b>\n👤 ${escapeHtml(book.author || '')}\n📚 ${escapeHtml(book.genre || '')}`;
    const replyMarkup = getEnhancedBookKeyboard(book, false);
    if (book.photo_url) {
      await ctx.replyWithPhoto(book.photo_url, { caption, parse_mode: 'HTML', reply_markup: replyMarkup });
    } else {
      await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: replyMarkup });
    }
  }
});

// AI підбір книги
profileScene.action('start_ai_assistant', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('AI_SCENE');
});

// Мої замовлення
profileScene.action('show_my_orders', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const orders = await getUserBookOrders(userId);

    if (orders.length === 0) {
      await ctx.reply('📋 У вас ще немає замовлень.');
      return;
    }

    let text = '📋 <b>Ваші замовлення:</b>\n\n';
    orders.forEach((order, i) => {
      text += `${i + 1}. 📖 <b>${escapeHtml(order.book_title)}</b>\n`;
      text += `   👤 ${escapeHtml(order.book_author)}\n`;
      text += `   📅 ${order.created_at ? new Date(order.created_at).toLocaleDateString('uk-UA') : '—'}\n\n`;
    });

    await ctx.reply(text, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Failed to get user orders', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Не вдалося завантажити замовлення.');
  }
});

// Детальна статистика
profileScene.action('show_stats', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const userService = createUserManagementService(db);
  const result = await userService.getUserStats(userId);

  if (result.isErr()) {
    await ctx.reply('❌ Не вдалося завантажити статистику.');
    return;
  }

  const statsText = userService.formatDetailedStatsText(result.unwrap());
  await ctx.reply(statsText, { parse_mode: 'HTML' });
});

// Назад до головного меню
profileScene.action('profile_back', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('🏠 Головне меню', { reply_markup: getMainMenuKeyboard() });
});

// Cleanup при виході зі сцени
profileScene.leave((ctx: BotContext) => {
  logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});

export default profileScene;
