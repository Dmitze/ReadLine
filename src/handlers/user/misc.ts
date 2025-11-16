/**
 * Miscellaneous Handlers
 * REFACTOR-009: Split userHandlers.ts
 *
 * Обработчики для профиля, помощи, обратной связи, AI, промокодов
 */

import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { BUTTONS, ERRORS } from '../../constants';

/**
 * Register miscellaneous handlers
 */
export function registerMiscHandlers(bot: Telegraf<BotContext>): void {
  // Промокод
  bot.hears('🎁 Отримати промокод', async (ctx: BotContext) => {
    try {
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.reply(ERRORS.USER_NOT_FOUND);
        return;
      }

      await ctx.scene.enter('PROMO_SCENE');
      logger.userAction(userId, 'get_promo');
    } catch (error) {
      logger.error('Error getting promo', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.GENERIC);
    }
  });

  // Профиль
  bot.hears([BUTTONS.PROFILE_OLD, BUTTONS.PROFILE], async (ctx: BotContext) => {
    await ctx.scene.enter('PROFILE_SCENE');
    logger.userAction(ctx.from!.id, 'view_profile');
  });

  // Обратная связь
  bot.hears(BUTTONS.FEEDBACK, async (ctx: BotContext) => {
    await ctx.scene.enter('FEEDBACK_SCENE');
    logger.userAction(ctx.from!.id, 'start_feedback');
  });

  // AI Ассистент
  bot.hears(BUTTONS.AI_ASSISTANT, async (ctx: BotContext) => {
    await ctx.scene.enter('AI_SCENE');
    logger.userAction(ctx.from!.id, 'start_ai');
  });

  // Помощь
  bot.hears(BUTTONS.HELP, async (ctx) => {
    const helpMessage = `
ℹ️ <b>ДОПОМОГА</b>

<b>Основні можливості:</b>
📖 <b>Каталог</b> - перегляд усіх книг за різними категоріями
🏆 <b>Топ книги</b> - найкращі книги за рейтингом
🆕 <b>Новинки</b> - нещодавно додані книги
💾 <b>Моя бібліотека</b> - ваші збережені книги
👤 <b>Профіль</b> - ваш профіль і налаштування
🤖 <b>AI Помічник</b> - розумний пошук і рекомендації
📞 <b>Зворотній зв'язок</b> - надішліть нам повідомлення

<b>Як знайти книгу:</b>
1️⃣ Через каталог - оберіть жанр або спосіб перегляду
2️⃣ Через пошук - використайте /search або команду пошуку
3️⃣ Через AI помічника - опишіть, що ви шукаєте

<b>Як зберегти книгу:</b>
❤️ Натисніть кнопку "💾 Зберегти" під описом книги
💔 Щоб видалити - натисніть кнопку знову

<b>Як завантажити:</b>
📥 Натисніть відповідну кнопку завантаження (PDF або аудіо)

<b>Команди:</b>
/start - перезапустити бота
/search - пошук книг
/help - ця довідка
/admin - панель адміністратора (тільки для адмінів)

<b>Питання? Проблема?</b>
Використайте кнопку "📞 Зворотній зв'язок" у головному меню
`;

    await ctx.reply(helpMessage, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('📖 Каталог', 'catalog_genres'),
          Markup.button.callback('🔍 Пошук', 'start_search'),
        ],
        [
          Markup.button.callback('🤖 AI Помічник', 'start_ai'),
          Markup.button.callback('👤 Профіль', 'view_profile'),
        ],
        [Markup.button.callback('🏠 На головну', 'home')],
      ]).reply_markup,
    });

    logger.userAction(ctx.from!.id, 'view_help');
  });

  // Actions для help
  bot.action('start_search', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.scene.enter('SEARCH_SCENE');
    } catch (error) {
      logger.error('Error starting search from help', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action('start_ai', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.scene.enter('AI_SCENE');
    } catch (error) {
      logger.error('Error starting AI from help', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action('view_profile', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.scene.enter('PROFILE_SCENE');
    } catch (error) {
      logger.error('Error viewing profile from help', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
}
