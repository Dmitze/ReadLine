/**
 * Physical Books Handlers
 * Обробники для роботи з заявками на фізичні книги
 */

import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { BUTTONS, ERRORS } from '../../constants';
import {
  getUserRequests,
  getRequestById,
  cancelRequest,
  PhysicalBookRequest,
} from '../../database/tables/physicalBooks';

/**
 * Реєстрація обробників фізичних книг
 */
export function registerPhysicalBooksHandlers(bot: Telegraf<BotContext>): void {
  // Кнопка "📚 Замовити фізичну книгу"
  bot.hears(BUTTONS.REQUEST_PHYSICAL_BOOK, async (ctx: BotContext) => {
    try {
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.reply(ERRORS.USER_NOT_FOUND);
        return;
      }

      await ctx.reply(
        '📚 <b>ЗАМОВЛЕННЯ ФІЗИЧНОЇ КНИГИ</b>\n\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          '📖 Ви можете замовити фізичну копію книги для читання.\n\n' +
          '<b>Як це працює:</b>\n' +
          '1️⃣ Ви створюєте заявку з назвою та автором книги\n' +
          '2️⃣ Адміністратор розглядає вашу заявку\n' +
          '3️⃣ Якщо книга є в наявності - ви отримуєте її\n' +
          '4️⃣ Після прочитання - повертаєте книгу\n\n' +
          '⚠️ <b>Важливо:</b>\n' +
          '• Кожна заявка розглядається індивідуально\n' +
          '• Книги видаються на певний термін\n' +
          '• Необхідно повернути книгу вчасно\n\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          '💡 Оберіть дію:',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('➕ Створити заявку', 'create_physical_request')],
            [Markup.button.callback('📋 Мої заявки', 'my_physical_requests')],
            [Markup.button.callback('ℹ️ Правила', 'physical_books_rules')],
          ]).reply_markup,
        }
      );

      logger.userAction(userId, 'view_physical_books_menu');
    } catch (error) {
      logger.error('Error showing physical books menu', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.GENERIC);
    }
  });

  // Створити заявку
  bot.action('create_physical_request', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('REQUEST_PHYSICAL_BOOK_SCENE');
  });

  // Мої заявки
  bot.action('my_physical_requests', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.editMessageText(ERRORS.USER_NOT_FOUND);
        return;
      }

      const requests = await getUserRequests(userId);

      if (requests.length === 0) {
        await ctx.editMessageText(
          '📋 <b>МОЇ ЗАЯВКИ</b>\n\n' +
            '📭 У вас поки немає заявок на фізичні книги.\n\n' +
            'Створіть першу заявку!',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('➕ Створити заявку', 'create_physical_request')],
              [Markup.button.callback('🏠 На головну', 'home')],
            ]).reply_markup,
          }
        );
        return;
      }

      let message = '📋 <b>МОЇ ЗАЯВКИ</b>\n\n';
      message += `Всього заявок: ${requests.length}\n\n`;
      message += '━━━━━━━━━━━━━━━━━━━\n\n';

      const keyboard = [];

      // Показуємо останні 10 заявок
      requests.slice(0, 10).forEach((request) => {
        const statusEmoji = getStatusEmoji(request.status);
        const statusText = getStatusText(request.status);

        keyboard.push([
          Markup.button.callback(
            `${statusEmoji} #${request.id} - ${request.book_title}`,
            `view_request_${request.id}`
          ),
        ]);
      });

      if (requests.length > 10) {
        message += `<i>Показано 10 останніх заявок з ${requests.length}</i>\n\n`;
      }

      keyboard.push([Markup.button.callback('➕ Створити нову заявку', 'create_physical_request')]);
      keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);

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

  // Перегляд конкретної заявки
  bot.action(/view_request_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery();

      const requestId = parseInt(match[1], 10);
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.answerCbQuery(ERRORS.USER_NOT_FOUND, { show_alert: true });
        return;
      }

      const request = await getRequestById(requestId);

      if (!request) {
        await ctx.answerCbQuery('❌ Заявку не знайдено', { show_alert: true });
        return;
      }

      // Перевіряємо що це заявка користувача
      if (request.user_id !== userId) {
        await ctx.answerCbQuery('❌ Це не ваша заявка', { show_alert: true });
        return;
      }

      const statusEmoji = getStatusEmoji(request.status);
      const statusText = getStatusText(request.status);

      let message = `📋 <b>ЗАЯВКА #${request.id}</b>\n\n`;
      message += '━━━━━━━━━━━━━━━━━━━\n\n';
      message += `📖 <b>Назва:</b> ${request.book_title}\n`;
      message += `✍️ <b>Автор:</b> ${request.book_author}\n`;

      if (request.book_genre) {
        message += `🎭 <b>Жанр:</b> ${request.book_genre}\n`;
      }

      if (request.notes) {
        message += `\n📝 <b>Ваші примітки:</b>\n${request.notes}\n`;
      }

      message += `\n${statusEmoji} <b>Статус:</b> ${statusText}\n`;
      message += `📅 <b>Створено:</b> ${formatDate(request.requested_at)}\n`;

      if (request.reviewed_at) {
        message += `📅 <b>Переглянуто:</b> ${formatDate(request.reviewed_at)}\n`;
      }

      if (request.admin_notes) {
        message += `\n💬 <b>Коментар адміністратора:</b>\n${request.admin_notes}\n`;
      }

      if (request.rejection_reason) {
        message += `\n❌ <b>Причина відхилення:</b>\n${request.rejection_reason}\n`;
      }

      const keyboard = [];

      // Дозволяємо скасувати тільки pending заявки
      if (request.status === 'pending') {
        keyboard.push([
          Markup.button.callback('❌ Скасувати заявку', `cancel_request_${request.id}`),
        ]);
      }

      keyboard.push([Markup.button.callback('⬅️ Назад до списку', 'my_physical_requests')]);
      keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });

      logger.userAction(userId, 'view_request_details', { requestId });
    } catch (error) {
      logger.error('Error showing request details', error, {
        userId: ctx.from?.id,
        match: ctx.match,
      });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Скасувати заявку
  bot.action(/cancel_request_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      const requestId = parseInt(match[1], 10);
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.answerCbQuery(ERRORS.USER_NOT_FOUND, { show_alert: true });
        return;
      }

      const request = await getRequestById(requestId);

      if (!request) {
        await ctx.answerCbQuery('❌ Заявку не знайдено', { show_alert: true });
        return;
      }

      if (request.user_id !== userId) {
        await ctx.answerCbQuery('❌ Це не ваша заявка', { show_alert: true });
        return;
      }

      if (request.status !== 'pending') {
        await ctx.answerCbQuery('❌ Можна скасувати тільки заявки в статусі "Очікує розгляду"', {
          show_alert: true,
        });
        return;
      }

      // Показуємо підтвердження
      await ctx.editMessageText(
        `❓ <b>СКАСУВАННЯ ЗАЯВКИ</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n\n` +
          `📖 <b>Книга:</b> ${request.book_title}\n` +
          `✍️ <b>Автор:</b> ${request.book_author}\n\n` +
          `⚠️ Ви впевнені, що хочете скасувати цю заявку?\n\n` +
          `Цю дію неможливо скасувати.`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('✅ Так, скасувати', `confirm_cancel_${requestId}`)],
            [Markup.button.callback('❌ Ні, залишити', `view_request_${requestId}`)],
          ]).reply_markup,
        }
      );

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('Error showing cancel confirmation', error, {
        userId: ctx.from?.id,
        match: ctx.match,
      });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Підтвердження скасування
  bot.action(/confirm_cancel_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match) return;

      await ctx.answerCbQuery('🔄 Скасування заявки...');

      const requestId = parseInt(match[1], 10);
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.editMessageText(ERRORS.USER_NOT_FOUND);
        return;
      }

      const cancelled = await cancelRequest(requestId, userId);

      if (!cancelled) {
        await ctx.editMessageText('❌ Не вдалося скасувати заявку. Можливо, вона вже розглянута.');
        return;
      }

      await ctx.editMessageText(
        '✅ <b>ЗАЯВКУ СКАСОВАНО</b>\n\n' +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          `📋 Заявка #${requestId} успішно скасована.\n\n` +
          'Ви можете створити нову заявку в будь-який момент.',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('➕ Створити нову заявку', 'create_physical_request')],
            [Markup.button.callback('📋 Мої заявки', 'my_physical_requests')],
            [Markup.button.callback('🏠 На головну', 'home')],
          ]).reply_markup,
        }
      );

      logger.userAction(userId, 'cancel_request', { requestId });
    } catch (error) {
      logger.error('Error cancelling request', error, {
        userId: ctx.from?.id,
        match: ctx.match,
      });
      await ctx.answerCbQuery('❌ Помилка');
    }
  });

  // Правила
  bot.action('physical_books_rules', async (ctx: BotContext) => {
    await ctx.answerCbQuery();

    await ctx.editMessageText(
      '📜 <b>ПРАВИЛА КОРИСТУВАННЯ ФІЗИЧНИМИ КНИГАМИ</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '<b>1. Створення заявки</b>\n' +
        '• Вказуйте точну назву та автора книги\n' +
        '• Додайте коментар, чому вам потрібна саме ця книга\n' +
        '• Адміністратор розгляне заявку протягом 1-3 днів\n\n' +
        '<b>2. Отримання книги</b>\n' +
        '• Після схвалення ви отримаєте повідомлення\n' +
        '• Узгодьте час та місце отримання з адміністратором\n' +
        '• Оцініть стан книги при отриманні\n\n' +
        '<b>3. Користування</b>\n' +
        '• Термін користування - 30 днів\n' +
        '• Бережіть книгу від пошкоджень\n' +
        '• За 3 дні до закінчення терміну ви отримаєте нагадування\n\n' +
        '<b>4. Повернення</b>\n' +
        '• Поверніть книгу вчасно в тому ж стані\n' +
        '• При пошкодженні книги можлива компенсація\n' +
        '• Після повернення ви зможете замовити іншу книгу\n\n' +
        '<b>5. Санкції</b>\n' +
        '• Прострочення більше 7 днів - тимчасова блокування замовлень\n' +
        '• Втрата або серйозне пошкодження - відшкодування вартості\n' +
        '• Систематичні порушення - постійне блокування\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '💡 Дотримуйтесь правил і насолоджуйтесь читанням!',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('➕ Створити заявку', 'create_physical_request')],
          [Markup.button.callback('⬅️ Назад', 'create_physical_request')],
        ]).reply_markup,
      }
    );
  });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Отримати емодзі для статусу
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'approved':
      return '✅';
    case 'rejected':
      return '❌';
    case 'completed':
      return '✔️';
    case 'cancelled':
      return '🚫';
    default:
      return '❓';
  }
}

/**
 * Отримати текст статусу
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Очікує розгляду';
    case 'approved':
      return 'Схвалено';
    case 'rejected':
      return 'Відхилено';
    case 'completed':
      return 'Завершено';
    case 'cancelled':
      return 'Скасовано';
    default:
      return 'Невідомо';
  }
}

/**
 * Форматувати дату
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Невідомо';

  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}
