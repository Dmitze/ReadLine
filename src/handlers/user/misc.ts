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
import {
  hasUserReceivedPromoCode,
  getAvailablePromoCodeForUser,
  markPromoCodeAsUsed,
  getUserPromoCode,
  returnPromoCode,
} from '../../database/promoCodeFunctions';

/**
 * Register miscellaneous handlers
 */
export function registerMiscHandlers(bot: Telegraf<BotContext>): void {
  // Промокод - початкове повідомлення
  bot.hears('🎁 Отримати промокод', async (ctx: BotContext) => {
    try {
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.reply(ERRORS.USER_NOT_FOUND);
        return;
      }

      // Показуємо детальну інформацію про Yakaboo Unlimited
      await ctx.reply(
        `🎁 <b>ПРОМОКОД YAKABOO UNLIMITED</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n\n` +
          `📚 <b>Що таке Yakaboo Unlimited?</b>\n\n` +
          `Це платна підписка від Yakaboo, яка відкриває доступ до великої бібліотеки ` +
          `електронних та аудіокниг у мобільному застосунку.\n\n` +
          `✅ <b>Що входить:</b>\n` +
          `• Понад 75 000 електронних книг та аудіокниг\n` +
          `• 150+ українських і світових видавництв\n` +
          `• Синхронізація прогресу між пристроями\n` +
          `• Мобільний застосунок (iOS/Android)\n` +
          `• Різні жанри: художня література, нон-фікшн, бізнес, дитячі книги\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎯 <b>ПРОМОКОД дає безкоштовний доступ до підписки!</b>\n\n` +
          `⚠️ <b>ВАЖЛИВО:</b>\n` +
          `• Промокод розрахований на ОДНУ БЕЗКОШТОВНУ реєстрацію\n` +
          `• Один промокод = одна людина\n` +
          `• Використати можна ТІЛЬКИ ОДИН РАЗ\n\n` +
          `💡 <b>Якщо не зареєструєшся на сайті Yakaboo:</b>\n` +
          `Ти можеш повернути промокод тією ж командою "🎁 Отримати промокод" ` +
          `і він стане доступним для інших.\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n\n` +
          `❓ <b>Чи точно тобі потрібен промокод?</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('✅ Так, отримати промокод', 'confirm_get_promocode')],
            [Markup.button.callback('🔄 Повернути промокод', 'return_promocode')],
            [Markup.button.callback('❌ Ні, скасувати', 'cancel_promocode')],
          ]).reply_markup,
        }
      );

      logger.userAction(userId, 'view_promocode_info');
    } catch (error) {
      logger.error('Error showing promocode info', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.GENERIC);
    }
  });

  // Кнопка: Так, отримати промокод
  bot.action('confirm_get_promocode', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.editMessageText('❌ Помилка: не вдалося ідентифікувати користувача');
        return;
      }

      // Перевіряємо чи користувач вже отримував промокод
      const hasReceived = await hasUserReceivedPromoCode(userId);

      if (hasReceived) {
        await ctx.editMessageText(
          '⚠️ <b>Ви вже отримували промокод раніше!</b>\n\n' +
            'Якщо ви не використали його, ви можете повернути промокод кнопкою нижче.',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Повернути промокод', 'return_promocode')],
              [Markup.button.callback('🏠 На головну', 'home')],
            ]).reply_markup,
          }
        );
        return;
      }

      // Отримуємо доступний промокод
      const promoCode = await getAvailablePromoCodeForUser();

      if (!promoCode) {
        await ctx.editMessageText(
          '😔 <b>Промокоди закінчилися</b>\n\n' +
            'На жаль, зараз немає доступних промокодів. Спробуйте пізніше або зверніться до адміністратора.',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback("📞 Зворотній зв'язок", 'feedback')],
              [Markup.button.callback('🏠 На головну', 'home')],
            ]).reply_markup,
          }
        );
        return;
      }

      // Позначаємо промокод як використаний
      await markPromoCodeAsUsed(userId, promoCode.id!);

      // Відправляємо промокод користувачу
      await ctx.editMessageText(
        `🎉 <b>ВАШ ПРОМОКОД YAKABOO UNLIMITED</b>\n\n` +
          `🎫 Код: <code>${promoCode.code}</code>\n` +
          `<i>(натисніть щоб скопіювати)</i>\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n\n` +
          `📱 <b>Як активувати:</b>\n` +
          `1️⃣ Завантажте застосунок Yakaboo (iOS/Android)\n` +
          `2️⃣ Зареєструйтесь або увійдіть в акаунт\n` +
          `3️⃣ Введіть промокод у розділі підписки\n` +
          `4️⃣ Насолоджуйтесь 75 000+ книгами! 📚\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ <b>Пам'ятайте:</b>\n` +
          `• Промокод діє для ОДНОЇ реєстрації\n` +
          `• Якщо НЕ використали - поверніть його!\n` +
          `• Інші зможуть ним скористатися\n\n` +
          `💡 Щоб повернути промокод, натисніть:\n` +
          `"🎁 Отримати промокод" → "🔄 Повернути промокод"`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('📖 Відкрити каталог', 'catalog')],
            [Markup.button.callback('🏠 На головну', 'home')],
          ]).reply_markup,
        }
      );

      logger.userAction(userId, 'received_promocode', {
        promoCodeId: promoCode.id,
        code: promoCode.code,
      });
    } catch (error) {
      logger.error('Error giving promocode', error, { userId: ctx.from?.id });
      await ctx.editMessageText('❌ Виникла помилка. Спробуйте пізніше.');
    }
  });

  // Кнопка: Повернути промокод
  bot.action('return_promocode', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.editMessageText('❌ Помилка: не вдалося ідентифікувати користувача');
        return;
      }

      // Перевіряємо чи користувач отримував промокод
      const hasReceived = await hasUserReceivedPromoCode(userId);

      if (!hasReceived) {
        await ctx.editMessageText(
          '⚠️ <b>Ви ще не отримували промокод</b>\n\n' +
            'Спочатку отримайте промокод, щоб мати можливість його повернути.',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('✅ Отримати промокод', 'confirm_get_promocode')],
              [Markup.button.callback('🏠 На головну', 'home')],
            ]).reply_markup,
          }
        );
        return;
      }

      // Отримуємо промокод користувача
      const userPromoCode = await getUserPromoCode(userId);

      if (!userPromoCode) {
        await ctx.editMessageText(
          '❌ <b>Промокод не знайдено</b>\n\n' +
            'Неможливо знайти ваш промокод. Зверніться до адміністратора.',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback("📞 Зворотній зв'язок", 'feedback')],
              [Markup.button.callback('🏠 На головну', 'home')],
            ]).reply_markup,
          }
        );
        return;
      }

      // Показуємо підтвердження повернення
      await ctx.editMessageText(
        `🔄 <b>ПОВЕРНЕННЯ ПРОМОКОДУ</b>\n\n` +
          `🎫 Ваш промокод: <code>${userPromoCode.code}</code>\n\n` +
          `⚠️ <b>Ви впевнені, що хочете повернути промокод?</b>\n\n` +
          `Якщо ви повернете промокод:\n` +
          `✅ Він стане доступним для інших користувачів\n` +
          `✅ Ви зможете отримати новий промокод пізніше\n` +
          `❌ Цей промокод більше не буде прив'язаний до вас\n\n` +
          `💡 Поверніть промокод тільки якщо ви НЕ зареєструвалися на Yakaboo!`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('✅ Так, повернути', 'confirm_return_promocode')],
            [Markup.button.callback('❌ Ні, залишити собі', 'cancel_return_promocode')],
            [Markup.button.callback('🏠 На головну', 'home')],
          ]).reply_markup,
        }
      );

      logger.userAction(userId, 'view_return_promocode_confirmation');
    } catch (error) {
      logger.error('Error showing return promocode', error, { userId: ctx.from?.id });
      await ctx.editMessageText('❌ Виникла помилка. Спробуйте пізніше.');
    }
  });

  // Кнопка: Підтвердити повернення
  bot.action('confirm_return_promocode', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.editMessageText('❌ Помилка: не вдалося ідентифікувати користувача');
        return;
      }

      // Повертаємо промокод
      const result = await returnPromoCode(userId);

      if (!result) {
        await ctx.editMessageText(
          '❌ <b>Помилка повернення</b>\n\n' +
            'Не вдалося повернути промокод. Спробуйте пізніше або зверніться до адміністратора.',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback("📞 Зворотній зв'язок", 'feedback')],
              [Markup.button.callback('🏠 На головну', 'home')],
            ]).reply_markup,
          }
        );
        return;
      }

      await ctx.editMessageText(
        `✅ <b>ПРОМОКОД УСПІШНО ПОВЕРНУТО</b>\n\n` +
          `🎉 Ваш промокод повернуто до пулу!\n\n` +
          `Тепер:\n` +
          `✅ Інші користувачі можуть його отримати\n` +
          `✅ Ви можете отримати новий промокод\n\n` +
          `Дякуємо за чесність! 💙💛`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🎁 Отримати новий промокод', 'home')],
            [Markup.button.callback('📖 До каталогу', 'catalog')],
            [Markup.button.callback('🏠 На головну', 'home')],
          ]).reply_markup,
        }
      );

      logger.userAction(userId, 'returned_promocode', { success: true });
    } catch (error) {
      logger.error('Error returning promocode', error, { userId: ctx.from?.id });
      await ctx.editMessageText('❌ Виникла помилка. Спробуйте пізніше.');
    }
  });

  // Кнопка: Скасувати повернення
  bot.action('cancel_return_promocode', async (ctx: BotContext) => {
    await ctx.answerCbQuery('Промокод залишається у вас');
    await ctx.editMessageText(
      `✅ <b>Промокод залишається у вас</b>\n\n` +
        `Не забудьте активувати його у застосунку Yakaboo!\n\n` +
        `📱 <b>Як активувати:</b>\n` +
        `1. Завантажте застосунок Yakaboo\n` +
        `2. Зареєструйтесь або увійдіть\n` +
        `3. Введіть промокод у розділі підписки\n` +
        `4. Насолоджуйтесь читанням! 📚`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📖 До каталогу', 'catalog')],
          [Markup.button.callback('🏠 На головну', 'home')],
        ]).reply_markup,
      }
    );
  });

  // Кнопка: Скасувати отримання
  bot.action('cancel_promocode', async (ctx: BotContext) => {
    await ctx.answerCbQuery('Скасовано');
    await ctx.editMessageText(
      '❌ Дію скасовано.\n\nЯкщо передумаєте, натисніть "🎁 Отримати промокод" у головному меню.',
      {
        reply_markup: Markup.inlineKeyboard([[Markup.button.callback('🏠 На головну', 'home')]])
          .reply_markup,
      }
    );
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
