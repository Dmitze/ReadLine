import { Scenes } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import { LIMITS } from '../constants/limits';
import {
  addPromoCode,
  getExtendedPromoStats,
  getAllPromoCodes,
  getPromoCodeByCode,
} from '../database/promoCodeFunctions';

const promoAdminScene = new Scenes.BaseScene<BotContext>('PROMO_ADMIN_SCENE');

promoAdminScene.enter(async (ctx) => {
  try {
    const stats = await getExtendedPromoStats();

    await ctx.reply(
      '🎁 <b>КЕРУВАННЯ ПРОМОКОДАМИ</b>\n\n' +
        '📊 <b>Статистика:</b>\n' +
        `• Всього промокодів: ${stats.total}\n` +
        `• Доступно: ${stats.available}\n` +
        `• Використано: ${stats.used}\n` +
        `• Користувачів отримали: ${stats.usedByUsers}\n` +
        `• Використання: ${stats.usagePercent}%\n\n` +
        'Оберіть дію:',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Додати промокод', callback_data: 'promo_add' }],
            [{ text: '📊 Розширена статистика', callback_data: 'promo_stats' }],
            [{ text: '📋 Список промокодів', callback_data: 'promo_list' }],
            [{ text: '⬅️ Назад до адмінки', callback_data: 'promo_back' }],
          ],
        },
      }
    );
  } catch (error) {
    logger.error('Error loading promo stats on enter', error);
    await ctx.reply('❌ Помилка при завантаженні статистики');
  }
});

promoAdminScene.action('promo_add', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '🎫 <b>ДОДАВАННЯ НОВОГО ПРОМОКОДУ</b>\n\n' +
      'Введіть код промокоду:\n\n' +
      '💡 <b>Приклади:</b>\n' +
      '• <code>SUMMER20</code> - літня знижка 20%\n' +
      '• <code>WELCOME15</code> - вітальна знижка 15%\n' +
      '• <code>STUDENT10</code> - студентська знижка 10%\n' +
      '• <code>FREESHIP</code> - безкоштовна доставка\n\n' +
      '✨ <b>Система автоматично визначить тип та розмір знижки!</b>',
    { parse_mode: 'HTML' }
  );

  (ctx.scene as any).state.waitingForPromoCode = true;
});

promoAdminScene.action('promo_list', async (ctx) => {
  await ctx.answerCbQuery('Завантаження...');

  try {
    const promoCodes = await getAllPromoCodes();

    if (promoCodes.length === 0) {
      await ctx.editMessageText(
        '📋 <b>СПИСОК ПРОМОКОДІВ</b>\n\n' +
          '📭 Промокодів ще немає.\n\n' +
          'Додайте перший промокод натиснувши "➕ Додати промокод"',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Додати промокод', callback_data: 'promo_add' }],
              [{ text: '⬅️ Назад', callback_data: 'promo_back_to_menu' }],
            ],
          },
        }
      );
      return;
    }

    let message = '📋 <b>СПИСОК ПРОМОКОДІВ</b>\n\n';

    for (const promo of promoCodes.slice(0, LIMITS.DISPLAY_LIMIT)) {
      const status = promo.is_active ? '✅' : '❌';
      message += `${status} <code>${promo.code}</code>\n`;
      message += `   ${promo.description}\n`;
      message += '   📚 Yakaboo Unlimited\n\n';
    }

    if (promoCodes.length > 10) {
      message += `\n<i>Показано 10 з ${promoCodes.length} промокодів</i>`;
    }

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Додати промокод', callback_data: 'promo_add' }],
          [{ text: '⬅️ Назад', callback_data: 'promo_back_to_menu' }],
        ],
      },
    });
  } catch (error) {
    logger.error('Error loading promo codes list', error);
    await ctx.editMessageText('❌ Помилка при завантаженні списку промокодів');
  }
});

promoAdminScene.action('promo_stats', async (ctx) => {
  await ctx.answerCbQuery('Завантаження статистики...');

  try {
    const stats = await getExtendedPromoStats();

    let messageText = '📊 <b>РОЗШИРЕНА СТАТИСТИКА ПРОМОКОДІВ</b>\n\n';

    messageText += '📈 <b>Загальна інформація:</b>\n';
    messageText += `• Всього створено: ${stats.total}\n`;
    messageText += `• Доступних: ${stats.available}\n`;
    messageText += `• Використано: ${stats.used}\n`;
    messageText += `• Відсоток використання: ${stats.usagePercent}%\n\n`;

    messageText += '👥 <b>Користувачі:</b>\n';
    messageText += `• Отримали промокод: ${stats.usedByUsers}\n`;
    messageText += `• Середнє використання на користувача: ${stats.avgUsage > 0 ? stats.avgUsage : '—'}\n\n`;

    if (stats.byDiscountType.length > 0) {
      messageText += '💰 <b>За типами знижок:</b>\n';
      stats.byDiscountType.forEach((dt) => {
        messageText += `• ${dt.type}: ${dt.count} (макс. ${dt.totalValue})\n`;
      });
      messageText += '\n';
    }

    messageText += '🆕 <b>Нові промокоди:</b>\n';
    messageText += `• Сьогодні: ${stats.createdToday}\n`;
    messageText += `• Цього тижня: ${stats.createdThisWeek}\n\n`;

    if (stats.topPromos.length > 0 && stats.topPromos.some((p) => p.used > 0)) {
      messageText += '🏆 <b>Топ промокоди:</b>\n';
      stats.topPromos.forEach((promo, i) => {
        if (promo.used > 0) {
          messageText += `${i + 1}. <code>${promo.code}</code> — ${promo.used} ${promo.used === 1 ? 'використання' : 'використань'}\n`;
        }
      });
      messageText += '\n';
    }

    messageText += '🔗 <b>Партнер:</b> Yakaboo.ua';

    await ctx.editMessageText(messageText, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Оновити', callback_data: 'promo_stats' }],
          [{ text: '📋 Список промокодів', callback_data: 'promo_list' }],
          [{ text: '⬅️ Назад', callback_data: 'promo_back_to_menu' }],
        ],
      },
    });
  } catch (error) {
    logger.error('Error loading extended promo stats', error);
    await ctx.editMessageText('❌ Помилка при завантаженні статистики', {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Спробувати знову', callback_data: 'promo_stats' }],
          [{ text: '⬅️ Назад', callback_data: 'promo_back_to_menu' }],
        ],
      },
    });
  }
});

promoAdminScene.action('promo_back_to_menu', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.scene.enter('PROMO_ADMIN_SCENE');
});

promoAdminScene.action('promo_back', async (ctx) => {
  await ctx.answerCbQuery('Повертаємось до адмінки');
  await ctx.scene.leave();
  await ctx.reply('🔙 Повернулися до адмін-панелі');
});

promoAdminScene.on('text', async (ctx) => {
  if (!(ctx.scene as any).state.waitingForPromoCode) {
    return;
  }

  const code = ctx.message.text.trim().toUpperCase();

  if (code.length < 3) {
    await ctx.reply('❌ Код промокоду занадто короткий. Мінімум 3 символи.');
    return;
  }

  if (code.length > 20) {
    await ctx.reply('❌ Код промокоду занадто довгий. Максимум 20 символів.');
    return;
  }

  if (!/^[A-Z0-9]+$/.test(code)) {
    await ctx.reply('❌ Код може містити тільки великі латинські літери та цифри.');
    return;
  }

  try {
    const existing = await getPromoCodeByCode(code);
    if (existing) {
      await ctx.reply(
        '❌ *Промокод вже існує!*\n\n' +
          `Код \`${code}\` вже додано раніше.\n` +
          'Спробуйте інший код.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const promoId = await addPromoCode(code, ctx.from?.id);
    const newPromo = await getPromoCodeByCode(code);

    if (!newPromo) {
      await ctx.reply('❌ Помилка при отриманні даних промокоду');
      return;
    }

    await ctx.reply(
      '✅ *ПРОМОКОД УСПІШНО ДОДАНИЙ!*\n\n' +
        `🎫 *Код:* \`${newPromo.code}\`\n` +
        '📚 *Тип:* Yakaboo Unlimited підписка\n' +
        `📝 *Опис:* ${newPromo.description}\n\n` +
        '✨ Користувачі зможуть отримати цей промокод через кнопку "🎁 Отримати промокод"\n\n' +
        '🔄 Після використання промокод можна повернути, і він стане доступним знову.',
      { parse_mode: 'Markdown' }
    );

    logger.adminAction(ctx.from?.id || 0, 'add_promo_code', { code, promoId });

    (ctx.scene as any).state.waitingForPromoCode = false;

    setTimeout(async () => {
      await ctx.scene.enter('PROMO_ADMIN_SCENE');
    }, 2000);
  } catch (error) {
    logger.error('Error adding promo code', error);
    await ctx.reply('❌ Помилка при додаванні промокоду. Спробуйте ще раз.');
  }
});

promoAdminScene.command('cancel', async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply('❌ Керування промокодами закрито');
});

promoAdminScene.leave((ctx: BotContext) => {
  const state = (ctx.scene as any).state;
  if (state) {
    delete state.waitingForPromoCode;
  }
  logger.debug('PromoAdminScene cleanup completed', { userId: ctx.from?.id });
});

export default promoAdminScene;
