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

   // Cleanup при виході зі сцени
profileScene.leave((ctx: BotContext) => {
  logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});

export default profileScene;
