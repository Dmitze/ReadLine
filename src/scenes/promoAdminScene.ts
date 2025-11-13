/**
 * Promo Admin Scene - сцена керування промокодами для адміна
 */

import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import {
  addPromoCode,
  getPromoCodeStats,
  getAllPromoCodes,
  getPromoCodeByCode,
  getDiscountTypeText,
  deletePromoCode
} from '../database/promoCodeFunctions';

const promoAdminScene = new Scenes.BaseScene<BotContext>('PROMO_ADMIN_SCENE');

// Вхід в сцену
promoAdminScene.enter(async (ctx) => {
  try {
    const stats = await getPromoCodeStats();
    
    await ctx.reply(
       `🎁 <b>КЕРУВАННЯ ПРОМОКОДАМИ</b>\n\n` +
       `📊 <b>Статистика:</b>\n` +
       `• Всього промокодів: ${stats.total}\n` +
       `• Доступно: ${stats.available}\n` +
       `• Використано: ${stats.used}\n` +
       `• Користувачів отримали: ${stats.usedByUsers}\n\n` +
       `Оберіть дію:`,
       {
         parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Додати промокод', callback_data: 'promo_add' }],
            [{ text: '📋 Список промокодів', callback_data: 'promo_list' }],
            [{ text: '📊 Детальна статистика', callback_data: 'promo_stats' }],
            [{ text: '⬅️ Назад до адмінки', callback_data: 'promo_back' }]
          ]
        }
      }
    );
  } catch (error) {
    logger.error('Error in promo admin scene', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Помилка завантаження статистики');
  }
});

// Додавання промокоду
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

// Список промокодів
promoAdminScene.action('promo_list', async (ctx) => {
  try {
    await ctx.answerCbQuery('Завантаження...');
    
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
              [{ text: '⬅️ Назад', callback_data: 'promo_back_to_menu' }]
            ]
          }
        }
      );
      return;
    }
    
    let message = '📋 <b>СПИСОК ПРОМОКОДІВ</b>\n\n';
    
    for (const promo of promoCodes.slice(0, 10)) {
      const status = promo.is_active ? '✅' : '❌';
      message += `${status} <code>${promo.code}</code>\n`;
      message += `   ${promo.description}\n`;
      message += `   💰 ${promo.discount_value}${promo.discount_type === 'percentage' ? '%' : ' грн'}\n\n`;
    }
    
    if (promoCodes.length > 10) {
      message += `\n<i>Показано 10 з ${promoCodes.length} промокодів</i>`;
    }
    
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Додати промокод', callback_data: 'promo_add' }],
          [{ text: '⬅️ Назад', callback_data: 'promo_back_to_menu' }]
        ]
      }
    });
  } catch (error) {
    logger.error('Error showing promo list', error instanceof Error ? error : new Error(String(error)));
    await ctx.answerCbQuery('❌ Помилка');
  }
});

// Детальна статистика
promoAdminScene.action('promo_stats', async (ctx) => {
  try {
    await ctx.answerCbQuery('Завантаження статистики...');
    
    const stats = await getPromoCodeStats();
    const usagePercent = stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;
    
    await ctx.editMessageText(
      `📊 <b>ДЕТАЛЬНА СТАТИСТИКА ПРОМОКОДІВ</b>\n\n` +
      `📈 <b>Загальна інформація:</b>\n` +
      `• Всього створено: ${stats.total}\n` +
      `• Активних: ${stats.total}\n` +
      `• Доступних: ${stats.available}\n` +
      `• Використано: ${stats.used}\n\n` +
      `👥 <b>Користувачі:</b>\n` +
      `• Отримали промокод: ${stats.usedByUsers}\n\n` +
      `📊 <b>Використання:</b>\n` +
      `• Відсоток використання: ${usagePercent}%\n` +
      `• Залишилось: ${stats.available} промокодів\n\n` +
      `🔗 <b>Партнер:</b> Yakaboo.ua`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Оновити', callback_data: 'promo_stats' }],
            [{ text: '⬅️ Назад', callback_data: 'promo_back_to_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    logger.error('Error showing promo stats', error instanceof Error ? error : new Error(String(error)));
    await ctx.answerCbQuery('❌ Помилка');
  }
});

// Повернення до меню
promoAdminScene.action('promo_back_to_menu', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.scene.enter('PROMO_ADMIN_SCENE');
});

// Вихід зі сцени
promoAdminScene.action('promo_back', async (ctx) => {
  await ctx.answerCbQuery('Повертаємось до адмінки');
  await ctx.scene.leave();
  await ctx.reply('🔙 Повернулися до адмін-панелі');
});

// Обробка введення промокоду
promoAdminScene.on('text', async (ctx) => {
  if (!(ctx.scene as any).state.waitingForPromoCode) {
    return;
  }
  
  const code = ctx.message.text.trim().toUpperCase();
  
  // Валідація
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
    // Перевіряємо чи існує
    const existing = await getPromoCodeByCode(code);
    if (existing) {
      await ctx.reply(
        `❌ *Промокод вже існує!*\n\n` +
        `Код \`${code}\` вже додано раніше.\n` +
        `Спробуйте інший код.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Додаємо промокод
    const promoId = await addPromoCode(code, ctx.from?.id);
    const newPromo = await getPromoCodeByCode(code);
    
    if (!newPromo) {
      await ctx.reply('❌ Помилка при отриманні даних промокоду');
      return;
    }
    
    await ctx.reply(
      `✅ *ПРОМОКОД УСПІШНО ДОДАНИЙ!*\n\n` +
      `🎫 *Код:* \`${newPromo.code}\`\n` +
      `📝 *Опис:* ${newPromo.description}\n` +
      `💰 *Тип:* ${getDiscountTypeText(newPromo.discount_type)}\n` +
      `🎯 *Значення:* ${newPromo.discount_value}${newPromo.discount_type === 'percentage' ? '%' : ' грн'}\n\n` +
      `✨ Користувачі зможуть отримати цей промокод через кнопку "🎁 Отримати промокод"`,
      { parse_mode: 'Markdown' }
    );
    
    logger.adminAction(ctx.from?.id || 0, 'add_promo_code', { code, promoId });
    
    (ctx.scene as any).state.waitingForPromoCode = false;
    
    // Повертаємось до меню
    setTimeout(async () => {
      await ctx.scene.enter('PROMO_ADMIN_SCENE');
    }, 2000);
    
  } catch (error) {
    logger.error('Error adding promo code', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Сталася помилка при додаванні промокоду. Спробуйте ще раз.');
  }
});

// Команда скасування
promoAdminScene.command('cancel', async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply('❌ Керування промокодами закрито');
});

// Cleanup при виході зі сцени
promoAdminScene.leave((ctx: BotContext) => {
  const state = (ctx.scene as any).state;
  if (state) {
    delete state.waitingForPromoCode;
  }
  logger.debug('PromoAdminScene cleanup completed', { userId: ctx.from?.id });
});

export default promoAdminScene;
