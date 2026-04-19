import { Telegraf } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { escapeHtml } from '../../utils/helpers';
import { createUserManagementService } from '../../services/UserManagementService';
import { db } from '../../database/models';

export function registerProfileHandlers(bot: any): void {
  bot.action('back_to_profile_from_orders', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const userService = createUserManagementService(db);
    const profileResult = await userService.getUserProfile(userId);

    if (profileResult.isErr()) {
      await ctx.reply('❌ Помилка при завантаженні профілю.');
      return;
    }

    const profile = profileResult.unwrap();
    profile.firstName = escapeHtml(ctx.from.first_name || '');
    profile.lastName = escapeHtml(ctx.from.last_name || '');
    profile.username = ctx.from.username ? `@${escapeHtml(ctx.from.username)}` : 'не встановлено';

    const profileText = userService.formatProfileText(profile);
    const { Markup } = await import('telegraf');

    await ctx.editMessageText(profileText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [{ text: '🤖 Персональні рекомендації', callback_data: 'show_personal_collection' }],
        [{ text: '🎯 AI Підбір книги', callback_data: 'start_ai_assistant' }],
        [{ text: '📋 Мої замовлення', callback_data: 'show_my_orders' }],
        [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
        [{ text: '⬅️ Назад', callback_data: 'profile_back' }],
      ]).reply_markup,
    });
  });

  bot.action(/personal_page_(\d+)/, async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match?.[1] || '0', 10);

    const allBooks = (ctx as any).session?.personalCollectionBooks || [];

    if (!allBooks || allBooks.length === 0) {
      await ctx.answerCbQuery('❌ Помилка при завантаженні даних', { show_alert: true });
      return;
    }

    const { Markup } = await import('telegraf');
    const booksPerPage = 5;
    const paginatedBooks = allBooks.slice(page * booksPerPage, (page + 1) * booksPerPage);
    const totalPages = Math.ceil(allBooks.length / booksPerPage);

    let messageText = '📚 <b>Персональна підбірка для вас</b>\n\n';
    messageText += `Сторінка ${page + 1} з ${totalPages}\n\n`;

    paginatedBooks.forEach((book: (typeof allBooks)[0], index: number) => {
      const rating = book.rating ? `⭐${book.rating.toFixed(1)}` : '';
      messageText += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}${rating ? ` ${rating}` : ''}\n`;
    });

    const keyboard = paginatedBooks.map((book: (typeof allBooks)[0]) => [
      Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`),
    ]);

    const navButtons = [];
    if (page > 0) {
      navButtons.push(Markup.button.callback('⬅️ Назад', `personal_page_${page - 1}`));
    }
    if (page + 1 < totalPages) {
      navButtons.push(Markup.button.callback('Вперед ➡️', `personal_page_${page + 1}`));
    }

    if (navButtons.length > 0) {
      keyboard.push(navButtons);
    }

    keyboard.push([Markup.button.callback('⬅️ До профілю', 'back_to_profile_from_personal')]);

    await ctx.editMessageText(messageText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
  });

  bot.action('back_to_profile_from_personal', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const userService = createUserManagementService(db);
    const profileResult = await userService.getUserProfile(userId);

    if (profileResult.isErr()) {
      await ctx.reply('❌ Помилка при завантаженні профілю.');
      return;
    }

    const profile = profileResult.unwrap();
    profile.firstName = escapeHtml(ctx.from.first_name || '');
    profile.lastName = escapeHtml(ctx.from.last_name || '');
    profile.username = ctx.from.username ? `@${escapeHtml(ctx.from.username)}` : 'не встановлено';

    const profileText = userService.formatProfileText(profile);
    const { Markup } = await import('telegraf');

    await ctx.editMessageText(profileText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [{ text: '🤖 Персональні рекомендації', callback_data: 'show_personal_collection' }],
        [{ text: '🎯 AI Підбір книги', callback_data: 'start_ai_assistant' }],
        [{ text: '📋 Мої замовлення', callback_data: 'show_my_orders' }],
        [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
        [{ text: '⬅️ Назад', callback_data: 'profile_back' }],
      ]).reply_markup,
    });
  });

  bot.action('profile_back', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    await ctx.scene?.leave();
    const { getMainMenuKeyboard } = await import('../../keyboards/mainKeyboards');
    await ctx.reply('👋 Повертаємось до головному меню', {
      reply_markup: getMainMenuKeyboard(),
    });
  });

  bot.action('show_stats', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

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

  bot.action('start_ai_assistant', async (ctx: BotContext) => {
    await ctx.answerCbQuery('🤖 Запускаю AI Підбір...');
    if (ctx.from?.id) {
      logger.userAction(ctx.from.id, 'start_ai_assistant_from_profile');
    }
    await ctx.scene?.leave();
    return ctx.scene?.enter('AI_ASSISTANT_SCENE');
  });

  bot.action('show_my_orders', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Не вдалося ідентифікувати користувача');
      return;
    }

    try {
      const { getUserBookOrders } = await import('../../database/bookOrderFunctions');
      const orders = await getUserBookOrders(userId);

      if (!orders || orders.length === 0) {
        await ctx.reply('📋 У вас поки немає замовлень книг.');
        return;
      }

      let ordersText = '📋 <b>МОЇ ЗАМОВЛЕННЯ</b>\n\n';
      orders.forEach((order, index) => {
        ordersText += `<b>#${index + 1} Замовлення ${order.id}</b>\n`;
        ordersText += `📖 Книга: ${escapeHtml(order.book_title || 'Невідома')}\n`;
        ordersText += `👤 Автор: ${escapeHtml(order.book_author || 'Невідомий')}\n`;
        ordersText += `📅 Дата: ${new Date(order.created_at || '').toLocaleDateString('uk-UA')}\n\n`;
      });

      await ctx.reply(ordersText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⬅️ Назад до профілю', callback_data: 'back_to_profile_from_orders' }],
          ],
        },
      });

      logger.userAction(userId, 'view_my_orders', { ordersCount: orders.length });
    } catch (error) {
      logger.error(
        'Error fetching user orders',
        error instanceof Error ? error : new Error(String(error))
      );
      await ctx.reply('❌ Помилка при завантаженні замовлень.');
    }
  });

  bot.action('show_personal_collection', async (ctx: BotContext) => {
    await ctx.answerCbQuery('🤖 Генерую персональну підбірку...');

    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Помилка ідентифікації користувача');
      return;
    }

    try {
      const userService = createUserManagementService(db);
      const collectionResult = await userService.getPersonalCollection(userId, 10);

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

      let messageText = '📚 <b>Персональна підбірка для вас</b>\n\n';
      switch (collectionData.source) {
        case 'smart_recommendations':
          messageText += '🤖 Створено на основі ваших вподобань, тегів та рейтингів\n\n';
          break;
        case 'top_books':
          messageText += '🤖 На основі найкращих книг каталогу\n\n';
          break;
        case 'new_books':
          messageText += '🤖 Найновіші книги каталогу\n\n';
          break;
      }

      const { Markup } = await import('telegraf');
      const booksPerPage = 5;
      const page = 0;
      const paginatedBooks = collectionData.books.slice(
        page * booksPerPage,
        (page + 1) * booksPerPage
      );
      const totalPages = Math.ceil(collectionData.books.length / booksPerPage);

      messageText += `Сторінка 1 з ${totalPages}\n\n`;

      paginatedBooks.forEach((book, index) => {
        const rating = book.rating ? `⭐${book.rating.toFixed(1)}` : '';
        messageText += `${index + 1}. <b>${book.title}</b> - ${book.author}${rating ? ` ${rating}` : ''}\n`;
      });

      const keyboard = paginatedBooks.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`),
      ]);

      const navButtons = [];
      if (totalPages > 1) {
        navButtons.push(Markup.button.callback('Вперед ➡️', 'personal_page_1'));
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      keyboard.push([Markup.button.callback('⬅️ До профілю', 'back_to_profile_from_personal')]);

      await ctx.reply(messageText, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      if (!(ctx as any).session) {
        (ctx as any).session = {};
      }

      (ctx as any).session.personalCollectionBooks = collectionData.books;

      logger.userAction(userId, 'ai_personal_collection', { booksFound: collectionData.count });
    } catch (error) {
      logger.error(
        'Error in show_personal_collection',
        error instanceof Error ? error : new Error(String(error))
      );
      await ctx.reply('❌ Помилка при створенні персональної підбірки.');
    }
  });
}
