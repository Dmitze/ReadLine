import { Telegraf } from 'telegraf';
import {
  isAdmin,
  getExtendedAdminStats,
  getAdminStats,
  getPendingReviews,
  getPendingFeedbackMessages,
} from '../../database/models';
import { getAdminMenuKeyboard } from '../../keyboards/adminKeyboards';
import { logger } from '../../utils/logger';
import { BotContext } from '../../types/telegraf';

export default (bot: Telegraf<BotContext>) => {
  bot.command('admin', async (ctx) => {
    logger.info('/admin command received', { userId: ctx.from?.id });
    (async () => {
      if (!ctx.from?.id) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
        return;
      }

      const adminCheck = await isAdmin(ctx.from.id);

      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
        return;
      }

      try {
        const stats = await getExtendedAdminStats();
        const pendingReviews = await getPendingReviews();
        const pendingFeedback = await getPendingFeedbackMessages();

        const reviewsAlert =
          pendingReviews.length > 0
            ? `📝 Відгуків на модерацію: <b>${pendingReviews.length}</b> 🔔`
            : '✅ Всі відгуки оброблені';

        const feedbackAlert =
          pendingFeedback.length > 0
            ? `📞 Нових повідомлень: <b>${pendingFeedback.length}</b> 🔔`
            : '✅ Всі повідомлення прочитані';

        let panelText = '⚔️ <b>ПАНЕЛЬ КОМАНДИРА</b>\n\n';
        panelText += '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        panelText += '📊 <b>ВОЇНСЬКА СТАТИСТИКА:</b>\n';
        panelText += `📚 Скарбів у колекції: <b>${stats.totalBooks}</b>\n`;
        panelText += `👥 Воїнів в армії: <b>${stats.totalUsers}</b>\n`;
        panelText += `⭐ Слава книг: <b>${stats.avgRating}</b>\n\n`;
        panelText += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        panelText += `${reviewsAlert}\n`;
        panelText += `${feedbackAlert}`;

        await ctx.reply(panelText, {
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
        });
      } catch (error) {
        logger.error(
          'Error in admin command',
          error instanceof Error ? error : new Error(String(error)),
          { userId: ctx.from?.id }
        );

        const basicStats = await getAdminStats();
        const pendingReviews = await getPendingReviews();
        const pendingFeedback = await getPendingFeedbackMessages();

        const reviewsAlert =
          pendingReviews.length > 0
            ? `📝 Відгуків на модерацію: <b>${pendingReviews.length}</b> 🔔`
            : '✅ Всі відгуки оброблені';

        const feedbackAlert =
          pendingFeedback.length > 0
            ? `📞 Нових повідомлень: <b>${pendingFeedback.length}</b> 🔔`
            : '✅ Всі повідомлення прочитані';

        await ctx.reply(
          '⚔️ <b>ПАНЕЛЬ КОМАНДИРА</b>\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '📊 <b>ВОЇНСЬКА СТАТИСТИКА:</b>\n' +
            `📚 Скарбів у колекції: <b>${basicStats.totalBooks}</b>\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${reviewsAlert}\n` +
            `${feedbackAlert}`,
          {
            parse_mode: 'HTML',
            reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
          }
        );
      }
    })().catch((error) => {
      logger.error(
        'Error in admin command',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при отриманні даних адміністратора.');
    });
    return;
  });

  bot.action('add_book', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Відкриваємо форму додавання книги...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('ADD_BOOK_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering add book scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до додавання книги.');
    });
    return;
  });

  bot.action('add_podcast', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Відкриваємо форму додавання підкасту...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('ADD_PODCAST_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering add podcast scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до додавання підкасту.');
    });
    return;
  });

  bot.action('manage_books', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження списку книг...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('MANAGE_BOOKS_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering manage books scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до управління книгами.');
    });
    return;
  });

  bot.action('manage_promo_codes', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження системи промокодів...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('PROMO_ADMIN_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering promo admin scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до керування промокодами.');
    });
    return;
  });

  bot.action('manage_extended_book_info', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження керування інформацією про книги...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('EDIT_EXTENDED_BOOK_INFO_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering edit extended book info scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до редагування інформації про книги.');
    });
    return;
  });

  bot.action('admin_back', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery();

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
        return;
      }

      const stats = await getAdminStats();
      const pendingReviews = await getPendingReviews();
      const pendingFeedback = await getPendingFeedbackMessages();

      const reviewsAlert =
        pendingReviews.length > 0
          ? `📝 Відгуків на модерацію: <b>${pendingReviews.length}</b> 🔔`
          : '✅ Всі відгуки оброблені';

      const feedbackAlert =
        pendingFeedback.length > 0
          ? `📞 Нових повідомлень: <b>${pendingFeedback.length}</b> 🔔`
          : '✅ Всі повідомлення прочитані';

      await ctx.editMessageText(
        '⚔️ <b>ПАНЕЛЬ КОМАНДИРА</b>\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📊 <b>ВОЇНСЬКА СТАТИСТИКА:</b>\n' +
          `📚 Скарбів у колекції: <b>${stats.totalBooks}</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `${reviewsAlert}\n` +
          `${feedbackAlert}`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
        }
      );
    })().catch((error) => {
      logger.error(
        'Error returning to admin panel',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });

  bot.action('promo_back', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery();
      await ctx.scene.leave();

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
        return;
      }

      const stats = await getAdminStats();
      const pendingReviews = await getPendingReviews();
      const pendingFeedback = await getPendingFeedbackMessages();

      const reviewsAlert =
        pendingReviews.length > 0
          ? `📝 Відгуків на модерацію: <b>${pendingReviews.length}</b> 🔔`
          : '✅ Всі відгуки оброблені';

      const feedbackAlert =
        pendingFeedback.length > 0
          ? `📞 Нових повідомлень: <b>${pendingFeedback.length}</b> 🔔`
          : '✅ Всі повідомлення прочитані';

      await ctx.reply(
        '⚔️ <b>ПАНЕЛЬ КОМАНДИРА</b>\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📊 <b>ВОЇНСЬКА СТАТИСТИКА:</b>\n' +
          `📚 Скарбів у колекції: <b>${stats.totalBooks}</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `${reviewsAlert}\n` +
          `${feedbackAlert}`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
        }
      );
    })().catch((error) => {
      logger.error(
        'Error returning to admin panel from promo',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });
};
