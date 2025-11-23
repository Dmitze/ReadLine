/**
 * Book Requests Handlers
 * Обробники для заявок на фізичні книги
 */

import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { ERRORS } from '../../constants';
import {
  getUserBookRequests,
  getBookRequestById,
  BookRequest,
  BookRequestStatus,
} from '../../database/tables/bookRequests';

/**
 * Зареєструвати обробники заявок на книги
 */
export function registerBookRequestHandlers(bot: Telegraf<BotContext>): void {
  // Кнопка "📚 Замовити фізичну книгу"
  bot.hears('📚 Замовити фізичну книгу', async (ctx: BotContext) => {
    try {
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.reply(ERRORS.USER_NOT_FOUND);
        return;
      }

      await ctx.reply(
        '📚 <b>ЗАМОВЛЕННЯ ФІЗИЧНОЇ КНИГИ</b>\n\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          '📖 <b>Що це таке?</b>\n\n' +
          'Ви можете замовити фізичну книгу для видачі у нашій бібліотеці.\n\n' +
          '✅ <b>Як це працює:</b>\n' +
          '1️⃣ Ви залишаєте заявку з назвою книги\n' +
          '2️⃣ Адміністратор перевіряє наявність\n' +
          '3️⃣ Ви отримуєте повідомлення про статус\n' +
          '4️⃣ Забираєте книгу у бібліотеці\n\n' +
          '⏱️ <b>Термін видачі:</b> до 14 днів\n\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          'Оберіть дію:',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('➕ Нова заявка', 'create_book_request')],
            [Markup.button.callback('📋 Мої заявки', 'my_book_requests')],
            [Markup.button.callback('❓ Допомога', 'book_requests_help')],
          ]).reply_markup,
        }
      );

      logger.userAction(userId, 'view_book_requests_menu');
    } catch (error) {
      logger.error('Error showing book requests menu', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.GENERIC);
    }
  });

  // Створити нову заявку
  bot.action('create_book_request', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      await ctx.scene.enter('CREATE_BOOK_REQUEST_SCENE');
    } catch (error) {
      logger.error('Error entering create request scene', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Мої заявки
  bot.action('my_book_requests', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
        return;
      }

      const requests = await getUserBookRequests(userId);

      if (requests.length === 0) {
        await ctx.editMessageText(
          '📭 <b>У ВАС НЕМАЄ ЗАЯВОК</b>\n\n' +
            'Ви ще не створювали жодної заявки на фізичну книгу.\n\n' +
            'Створіть свою першу заявку!',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('➕ Створити заявку', 'create_book_request')],
              [Markup.button.callback('⬅️ Назад', 'back_to_requests_menu')],
            ]).reply_markup,
          }
        );
        return;
      }

      let message = '📋 <b>МОЇ ЗАЯВКИ</b>\n\n';
      message += `Всього заявок: ${requests.length}\n\n`;
      message += '━━━━━━━━━━━━━━━━━━━\n\n';

      const keyboard = [];

      requests.slice(0, 10).forEach((request, index) => {
        const statusEmoji = getStatusEmoji(request.status);
        keyboard.push([
          Markup.button.callback(
            `${index + 1}. ${statusEmoji} ${request.book_title}`,
            `view_request_${request.id}`
          ),
        ]);
      });

      keyboard.push([Markup.button.callback('➕ Нова заявка', 'create_book_request')]);
      keyboard.push([Markup.button.callback('⬅️ Назад', 'back_to_requests_menu')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(userId, 'view_my_requests', { count: requests.length });
    } catch (error) {
      logger.error('Error showing user requests', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Переглянути конкретну заявку
  bot.action(/view_request_(\d+)/, async (ctx: BotContext) => {
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
      message += `📖 <b>Книга:</b> ${request.book_title}\n`;
      message += `✍️ <b>Автор:</b> ${request.book_author}\n`;

      if (request.book_genre) {
        message += `🏷️ <b>Жанр:</b> ${request.book_genre}\n`;
      }

      message += `\n${statusEmoji} <b>Статус:</b> ${statusText}\n\n`;

      if (request.comment) {
        message += `💬 <b>Ваш коментар:</b>\n${request.comment}\n\n`;
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

      // Кнопки залежно від статусу
      if (request.status === BookRequestStatus.PENDING) {
        keyboard.push([Markup.button.callback('❌ Скасувати заявку', `cancel_request_${request.id}`)]);
      }

      keyboard.push([Markup.button.callback('⬅️ До списку заявок', 'my_book_requests')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(ctx.from!.id, 'view_request', { requestId });
    } catch (error) {
      logger.error('Error showing request', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Допомога
  bot.action('book_requests_help', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      await ctx.editMessageText(
        '❓ <b>ДОПОМОГА</b>\n\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          '📚 <b>Як замовити книгу?</b>\n\n' +
          '1️⃣ Натисніть "➕ Нова заявка"\n' +
          '2️⃣ Вкажіть назву книги та автора\n' +
          '3️⃣ Дочекайтесь відповіді адміна\n\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          '📊 <b>Статуси заявок:</b>\n\n' +
          '⏳ <b>На розгляді</b> - заявка очікує перевірки\n' +
          '✅ <b>Схвалено</b> - книга доступна до видачі\n' +
          '❌ <b>Відхилено</b> - книги немає у наявності\n' +
          '📖 <b>Видано</b> - ви отримали книгу\n' +
          '✔️ <b>Повернено</b> - ви повернули книгу\n' +
          '⚠️ <b>Прострочено</b> - термін повернення минув\n\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          '⏱️ <b>Термін видачі:</b> до 14 днів\n\n' +
          '📍 <b>Адреса бібліотеки:</b>\n' +
          'м. Київ, вул. Хрещатик, 1\n\n' +
          '🕐 <b>Режим роботи:</b>\n' +
          'Пн-Пт: 9:00 - 18:00\n' +
          'Сб-Нд: вихідні',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Назад', 'back_to_requests_menu')],
          ]).reply_markup,
        }
      );
    } catch (error) {
      logger.error('Error showing help', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Назад до меню заявок
  bot.action('back_to_requests_menu', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();

      await ctx.editMessageText(
        '📚 <b>ЗАМОВЛЕННЯ ФІЗИЧНОЇ КНИГИ</b>\n\n' +
          'Оберіть дію:',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('➕ Нова заявка', 'create_book_request')],
            [Markup.button.callback('📋 Мої заявки', 'my_book_requests')],
            [Markup.button.callback('❓ Допомога', 'book_requests_help')],
          ]).reply_markup,
        }
      );
    } catch (error) {
      logger.error('Error going back to requests menu', error, { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
}

/**
 * Отримати емодзі статусу
 */
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

/**
 * Отримати текст статусу
 */
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

/**
 * Форматувати дату
 */
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

/**
 * Отримати кількість днів до дати
 */
function getDaysLeft(dueDateString: string): number {
  const dueDate = new Date(dueDateString);
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
