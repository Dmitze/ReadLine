import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { isAdmin } from '../../database/models';
import {
  getAllBookOrders,
  getBookOrderWithBookInfo,
  deleteBookOrder,
} from '../../database/bookOrderFunctions';
import { logger } from '../../utils/logger';

export default (bot: Telegraf<BotContext>) => {
  // Показати список замовлень
  bot.action('admin_orders', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження замовлень...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      const orders = await getAllBookOrders();

      if (orders.length === 0) {
        await ctx.editMessageText(
          '📋 <b>ЗАМОВЛЕННЯ КНИГ</b>\n\n' + '📭 Немає замовлень',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад', 'admin_back')]])
              .reply_markup,
          }
        );
        return;
      }

      let message = '📋 <b>ЗАМОВЛЕННЯ КНИГ</b>\n\n';
      message += `Всього замовлень: ${orders.length}\n\n`;
      message += '━━━━━━━━━━━━━━━━━━━\n\n';

      // Показуємо останні 10 замовлень
      const recentOrders = orders.slice(0, 10);
      recentOrders.forEach((order, index) => {
        const date = new Date(order.created_at || Date.now());
        const dateStr = date.toLocaleDateString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        message += `${index + 1}. 📖 ${order.book_title}\n`;
        message += `   👤 ${order.full_name} (${order.callsign})\n`;
        message += `   📞 ${order.phone}\n`;
        message += `   📅 ${dateStr}\n\n`;
      });

      if (orders.length > 10) {
        message += `\n💡 Показано 10 з ${orders.length} замовлень`;
      }

      const buttons = recentOrders.map((o) => [
        Markup.button.callback(`#${o.id} - ${o.book_title.substring(0, 30)}...`, `admin_view_order_${o.id}`),
      ]);

      buttons.push([
        Markup.button.callback('🔄 Оновити', 'admin_refresh_orders'),
        Markup.button.callback('⬅️ Назад', 'admin_back'),
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      });
    })().catch((error) => {
      logger.error(
        'Error showing book orders',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });

  // Оновити список замовлень
  bot.action('admin_refresh_orders', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('🔄 Оновлення...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        return;
      }

      const orders = await getAllBookOrders();

      if (orders.length === 0) {
        await ctx.editMessageText(
          '📋 <b>ЗАМОВЛЕННЯ КНИГ</b>\n\n' + '📭 Немає замовлень',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад', 'admin_back')]])
              .reply_markup,
          }
        );
        return;
      }

      let message = '📋 <b>ЗАМОВЛЕННЯ КНИГ</b>\n\n';
      message += `Всього замовлень: ${orders.length}\n\n`;
      message += '━━━━━━━━━━━━━━━━━━━\n\n';

      const recentOrders = orders.slice(0, 10);
      recentOrders.forEach((order, index) => {
        const date = new Date(order.created_at || Date.now());
        const dateStr = date.toLocaleDateString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        message += `${index + 1}. 📖 ${order.book_title}\n`;
        message += `   👤 ${order.full_name} (${order.callsign})\n`;
        message += `   📞 ${order.phone}\n`;
        message += `   📅 ${dateStr}\n\n`;
      });

      if (orders.length > 10) {
        message += `\n💡 Показано 10 з ${orders.length} замовлень`;
      }

      const buttons = recentOrders.map((o) => [
        Markup.button.callback(`#${o.id} - ${o.book_title.substring(0, 30)}...`, `admin_view_order_${o.id}`),
      ]);

      buttons.push([
        Markup.button.callback('🔄 Оновити', 'admin_refresh_orders'),
        Markup.button.callback('⬅️ Назад', 'admin_back'),
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      });
    })().catch((error) => {
      logger.error(
        'Error refreshing book orders',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });

  // Переглянути деталі замовлення
  bot.action(/admin_view_order_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID замовлення');
        return;
      }

      const orderId = parseInt(match[1], 10);
      await ctx.answerCbQuery('Завантаження...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      const order = await getBookOrderWithBookInfo(orderId);

      if (!order) {
        await ctx.editMessageText('❌ Замовлення не знайдено', {
          reply_markup: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад', 'admin_orders')]])
            .reply_markup,
        });
        return;
      }

      const date = new Date(order.created_at || Date.now());
      const dateStr = date.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const message =
        `📋 <b>ЗАМОВЛЕННЯ #${orderId}</b>\n\n` +
        `📖 Книга: ${order.book_title}\n` +
        `👤 Автор: ${order.book_author}\n\n` +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '<b>КОНТАКТНІ ДАНІ:</b>\n\n' +
        `👤 ПІБ: ${order.full_name}\n` +
        `🎯 Позивний: ${order.callsign}\n` +
        `🏢 Підрозділ: ${order.unit}\n` +
        `📞 Телефон: <code>${order.phone}</code>\n\n` +
        `📅 Дата замовлення: ${dateStr}\n` +
        `🆔 ID користувача: <code>${order.user_id}</code>\n\n` +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '💡 Зв\'яжіться з користувачем для узгодження деталей.';

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🗑️ Видалити замовлення', `admin_delete_order_${orderId}`)],
          [Markup.button.callback('⬅️ Назад до списку', 'admin_orders')],
        ]).reply_markup,
      });
    })().catch((error) => {
      logger.error(
        'Error viewing book order',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });

  // Видалити замовлення
  bot.action(/admin_delete_order_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID замовлення');
        return;
      }

      const orderId = parseInt(match[1], 10);

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
        return;
      }

      // Показати підтвердження
      await ctx.editMessageText(
        `⚠️ <b>ВИДАЛЕННЯ ЗАМОВЛЕННЯ #${orderId}</b>\n\n` +
          'Ви впевнені що хочете видалити це замовлення?\n\n' +
          '❗ Цю дію неможливо скасувати.',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('✅ Так, видалити', `admin_confirm_delete_order_${orderId}`)],
            [Markup.button.callback('❌ Скасувати', `admin_view_order_${orderId}`)],
          ]).reply_markup,
        }
      );

      await ctx.answerCbQuery();
    })().catch((error) => {
      logger.error(
        'Error deleting book order',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });

  // Підтвердити видалення замовлення
  bot.action(/admin_confirm_delete_order_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID замовлення');
        return;
      }

      const orderId = parseInt(match[1], 10);

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
        return;
      }

      try {
        await deleteBookOrder(orderId);

        await ctx.answerCbQuery('✅ Замовлення видалено');

        await ctx.editMessageText(
          `✅ <b>ЗАМОВЛЕННЯ #${orderId} ВИДАЛЕНО</b>\n\n` + 'Замовлення успішно видалено з бази даних.',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад до списку', 'admin_orders')]])
              .reply_markup,
          }
        );

        logger.info(`Book order ${orderId} deleted by admin ${ctx.from.id}`);
      } catch (error) {
        logger.error(
          'Error confirming delete book order',
          error instanceof Error ? error : new Error(String(error)),
          { userId: ctx.from?.id, orderId }
        );
        await ctx.answerCbQuery('❌ Помилка при видаленні');
      }
    })().catch((error) => {
      logger.error(
        'Error confirming delete book order',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });
};
