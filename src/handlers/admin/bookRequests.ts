import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import {
  getAllBookRequests,
  getBookRequestsByStatus,
  getBookRequestById,
  updateBookRequestStatus,
  issueBook,
  returnBook,
  getBookRequestsStats,
  getOverdueRequests,
  markOverdueRequests,
  BookRequest,
  BookRequestStatus,
  BookRequestStats,
} from '../../database/tables/bookRequests';

export function registerAdminBookRequestHandlers(bot: Telegraf<BotContext>): void {
  bot.action('admin_book_requests', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const stats = await getBookRequestsStats();

      let message = '📚 <b>УПРАВЛІННЯ ЗАЯВКАМИ</b>\n\n';
      message += '━━━━━━━━━━━━━━━━━━━\n\n';
      message += '📊 <b>Статистика:</b>\n\n';
      message += `📋 Всього заявок: ${stats.total}\n`;
      message += `⏳ На розгляді: ${stats.pending}\n`;
      message += `✅ Схвалено: ${stats.approved}\n`;
      message += `❌ Відхилено: ${stats.rejected}\n`;
      message += `📖 Видано: ${stats.issued}\n`;
      message += `✔️ Повернено: ${stats.returned}\n`;
      message += `⚠️ Прострочено: ${stats.overdue}\n\n`;
      message += '━━━━━━━━━━━━━━━━━━━\n\n';
      message += 'Оберіть дію:';

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback(`⏳ На розгляді (${stats.pending})`, 'admin_requests_pending'),
            Markup.button.callback(`📖 Видано (${stats.issued})`, 'admin_requests_issued'),
          ],
          [
            Markup.button.callback(`⚠️ Прострочені (${stats.overdue})`, 'admin_requests_overdue'),
            Markup.button.callback('📋 Всі заявки', 'admin_requests_all'),
          ],
          [Markup.button.callback('⬅️ Назад до адмінки', 'back_to_admin')],
        ]).reply_markup,
      });

      logger.adminAction(ctx.from!.id, 'view_requests_menu');
    } catch (error) {
      logger.error('Error showing admin requests menu', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action('admin_requests_pending', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      await showRequestsList(ctx, BookRequestStatus.PENDING);
    } catch (error) {
      logger.error('Error showing pending requests', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action('admin_requests_issued', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      await showRequestsList(ctx, BookRequestStatus.ISSUED);
    } catch (error) {
      logger.error('Error showing issued requests', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action('admin_requests_overdue', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      await markOverdueRequests();

      const overdueRequests = await getOverdueRequests();

      if (overdueRequests.length === 0) {
        await ctx.editMessageText(
          '✅ <b>НЕМАЄ ПРОСТРОЧЕНИХ КНИГ</b>\n\n' + 'Всі книги повернуті вчасно!',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('⬅️ Назад', 'admin_book_requests')],
            ]).reply_markup,
          }
        );
        return;
      }

      let message = '⚠️ <b>ПРОСТРОЧЕНІ КНИГИ</b>\n\n';
      message += `Знайдено ${overdueRequests.length} прострочених книг:\n\n`;
      message += '━━━━━━━━━━━━━━━━━━━\n\n';

      const keyboard = [];

      overdueRequests.slice(0, 10).forEach((request, index) => {
        const daysOverdue = Math.abs(getDaysLeft(request.due_date!));
        keyboard.push([
          Markup.button.callback(
            `${index + 1}. ${request.book_title} (${daysOverdue} дн.)`,
            `admin_view_request_${request.id}`
          ),
        ]);
      });

      keyboard.push([Markup.button.callback('⬅️ Назад', 'admin_book_requests')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });
    } catch (error) {
      logger.error('Error showing overdue requests', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action('admin_requests_all', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      const requests = await getAllBookRequests(20);

      if (requests.length === 0) {
        await ctx.editMessageText('📭 <b>ЗАЯВОК НЕМАЄ</b>', {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Назад', 'admin_book_requests')],
          ]).reply_markup,
        });
        return;
      }

      let message = '📋 <b>ВСІ ЗАЯВКИ</b>\n\n';
      message += `Останні ${Math.min(requests.length, 20)} заявок:\n\n`;

      const keyboard = [];

      requests.forEach((request, index) => {
        const statusEmoji = getStatusEmoji(request.status);
        keyboard.push([
          Markup.button.callback(
            `${index + 1}. ${statusEmoji} ${request.book_title}`,
            `admin_view_request_${request.id}`
          ),
        ]);
      });

      keyboard.push([Markup.button.callback('⬅️ Назад', 'admin_book_requests')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });
    } catch (error) {
      logger.error('Error showing all requests', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action(/admin_view_request_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const requestId = parseInt(match[1], 10);
      const request = await getBookRequestById(requestId);

      if (!request) {
        await ctx.answerCbQuery('❌ Заявка не знайдена', { show_alert: true });
        return;
      }

      const statusText = getStatusText(request.status);
      const statusEmoji = getStatusEmoji(request.status);

      let message = `📋 <b>ЗАЯВКА №${request.id}</b>\n\n`;
      message += '━━━━━━━━━━━━━━━━━━━\n\n';
      message += `👤 <b>Користувач ID:</b> ${request.user_id}\n\n`;
      message += `📖 <b>Книга:</b> ${request.book_title}\n`;
      message += `✍️ <b>Автор:</b> ${request.book_author}\n`;

      if (request.book_genre) {
        message += `🏷️ <b>Жанр:</b> ${request.book_genre}\n`;
      }

      message += `\n${statusEmoji} <b>Статус:</b> ${statusText}\n\n`;

      if (request.comment) {
        message += `💬 <b>Коментар користувача:</b>\n${request.comment}\n\n`;
      }

      if (request.admin_comment) {
        message += `📝 <b>Коментар адміна:</b>\n${request.admin_comment}\n\n`;
      }

      if (request.issued_at) {
        message += `📅 <b>Видано:</b> ${formatDate(request.issued_at)}\n`;
      }

      if (request.due_date) {
        message += `⏰ <b>Повернути до:</b> ${formatDate(request.due_date)}\n`;
        const daysLeft = getDaysLeft(request.due_date);
        if (daysLeft >= 0) {
          message += `⏳ Залишилось днів: ${daysLeft}\n`;
        } else {
          message += `⚠️ <b>ПРОСТРОЧЕНО НА ${Math.abs(daysLeft)} днів!</b>\n`;
        }
      }

      if (request.returned_at) {
        message += `✅ <b>Повернено:</b> ${formatDate(request.returned_at)}\n`;
      }

      message += `\n📅 <b>Створено:</b> ${formatDate(request.created_at!)}\n`;

      const keyboard = [];

      if (request.status === BookRequestStatus.PENDING) {
        keyboard.push([
          Markup.button.callback('✅ Схвалити', `approve_request_${request.id}`),
          Markup.button.callback('❌ Відхилити', `reject_request_${request.id}`),
        ]);
      }

      if (request.status === BookRequestStatus.APPROVED) {
        keyboard.push([Markup.button.callback('📖 Видати книгу', `issue_request_${request.id}`)]);
      }

      if (
        request.status === BookRequestStatus.ISSUED ||
        request.status === BookRequestStatus.OVERDUE
      ) {
        keyboard.push([
          Markup.button.callback('✔️ Повернути книгу', `return_request_${request.id}`),
        ]);
      }

      keyboard.push([Markup.button.callback('⬅️ Назад', 'admin_book_requests')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.adminAction(ctx.from!.id, 'view_request', { requestId });
    } catch (error) {
      logger.error('Error showing request to admin', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action(/approve_request_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      const requestId = parseInt(match[1], 10);
      const adminId = ctx.from?.id;

      if (!adminId) {
        await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
        return;
      }

      await updateBookRequestStatus(
        requestId,
        BookRequestStatus.APPROVED,
        adminId,
        'Книга доступна до видачі'
      );

      await ctx.answerCbQuery('✅ Заявку схвалено');

      await ctx.scene.reenter();

      logger.adminAction(adminId, 'approve_request', { requestId });
    } catch (error) {
      logger.error('Error approving request', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action(/reject_request_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      const requestId = parseInt(match[1], 10);
      const adminId = ctx.from?.id;

      if (!adminId) {
        await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
        return;
      }

      await updateBookRequestStatus(
        requestId,
        BookRequestStatus.REJECTED,
        adminId,
        'Книги немає у наявності'
      );

      await ctx.answerCbQuery('❌ Заявку відхилено');

      logger.adminAction(adminId, 'reject_request', { requestId });

      await ctx.answerCbQuery();
      await ctx.editMessageText('✅ Заявку відхилено', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ До списку заявок', 'admin_book_requests')],
        ]).reply_markup,
      });
    } catch (error) {
      logger.error('Error rejecting request', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action(/issue_request_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const requestId = parseInt(match[1], 10);

      await ctx.editMessageText('📖 <b>ВИДАЧА КНИГИ</b>\n\n' + 'Оберіть термін видачі:', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('7 днів', `issue_book_${requestId}_7`)],
          [Markup.button.callback('14 днів', `issue_book_${requestId}_14`)],
          [Markup.button.callback('30 днів', `issue_book_${requestId}_30`)],
          [Markup.button.callback('⬅️ Назад', `admin_view_request_${requestId}`)],
        ]).reply_markup,
      });
    } catch (error) {
      logger.error('Error showing issue options', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action(/issue_book_(\d+)_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      const requestId = parseInt(match[1], 10);
      const days = parseInt(match[2], 10);
      const adminId = ctx.from?.id;

      if (!adminId) {
        await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
        return;
      }

      await issueBook(requestId, days, adminId);

      await ctx.answerCbQuery(`✅ Книгу видано на ${days} днів`);

      logger.adminAction(adminId, 'issue_book', { requestId, days });

      await ctx.editMessageText(
        '✅ <b>КНИГУ ВИДАНО</b>\n\n' +
          `📅 Термін повернення: ${days} днів\n\n` +
          'Користувач отримав сповіщення.',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ До списку заявок', 'admin_book_requests')],
          ]).reply_markup,
        }
      );
    } catch (error) {
      logger.error('Error issuing book', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  bot.action(/return_request_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      const requestId = parseInt(match[1], 10);
      const adminId = ctx.from?.id;

      if (!adminId) {
        await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
        return;
      }

      await returnBook(requestId);

      await ctx.answerCbQuery('✅ Книгу повернено');

      logger.adminAction(adminId, 'return_book', { requestId });

      await ctx.editMessageText('✅ <b>КНИГУ ПОВЕРНЕНО</b>\n\n' + 'Статус заявки оновлено.', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ До списку заявок', 'admin_book_requests')],
        ]).reply_markup,
      });
    } catch (error) {
      logger.error('Error returning book', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
}

async function showRequestsList(ctx: BotContext, status: BookRequestStatus) {
  const requests = await getBookRequestsByStatus(status);

  const statusText = getStatusText(status);
  const statusEmoji = getStatusEmoji(status);

  if (requests.length === 0) {
    await ctx.editMessageText(`📭 <b>НЕМАЄ ЗАЯВОК</b>\n\n${statusEmoji} Статус: ${statusText}`, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Назад', 'admin_book_requests')],
      ]).reply_markup,
    });
    return;
  }

  let message = `${statusEmoji} <b>${statusText.toUpperCase()}</b>\n\n`;
  message += `Знайдено ${requests.length} ${requests.length === 1 ? 'заявку' : 'заявок'}:\n\n`;

  const keyboard = [];

  requests.slice(0, 10).forEach((request, index) => {
    keyboard.push([
      Markup.button.callback(
        `${index + 1}. ${request.book_title}`,
        `admin_view_request_${request.id}`
      ),
    ]);
  });

  keyboard.push([Markup.button.callback('⬅️ Назад', 'admin_book_requests')]);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
  });
}

function getStatusEmoji(status: BookRequestStatus): string {
  switch (status) {
    case BookRequestStatus.PENDING:
      return '⏳';
    case BookRequestStatus.APPROVED:
      return '✅';
    case BookRequestStatus.REJECTED:
      return '❌';
    case BookRequestStatus.ISSUED:
      return '📖';
    case BookRequestStatus.RETURNED:
      return '✔️';
    case BookRequestStatus.OVERDUE:
      return '⚠️';
    default:
      return '❓';
  }
}

function getStatusText(status: BookRequestStatus): string {
  switch (status) {
    case BookRequestStatus.PENDING:
      return 'На розгляді';
    case BookRequestStatus.APPROVED:
      return 'Схвалено';
    case BookRequestStatus.REJECTED:
      return 'Відхилено';
    case BookRequestStatus.ISSUED:
      return 'Видано';
    case BookRequestStatus.RETURNED:
      return 'Повернено';
    case BookRequestStatus.OVERDUE:
      return 'Прострочено';
    default:
      return 'Невідомо';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysLeft(dueDateString: string): number {
  const dueDate = new Date(dueDateString);
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
