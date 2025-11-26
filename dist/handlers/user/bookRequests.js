"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBookRequestHandlers = registerBookRequestHandlers;
const telegraf_1 = require("telegraf");
const logger_1 = require("../../utils/logger");
const constants_1 = require("../../constants");
const bookRequests_1 = require("../../database/tables/bookRequests");
function registerBookRequestHandlers(bot) {
    bot.hears('📚 Замовити фізичну книгу', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.reply(constants_1.ERRORS.USER_NOT_FOUND);
                return;
            }
            await ctx.reply('📚 <b>ЗАМОВЛЕННЯ ФІЗИЧНОЇ КНИГИ</b>\n\n' +
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
                'Оберіть дію:', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('➕ Нова заявка', 'create_book_request')],
                    [telegraf_1.Markup.button.callback('📋 Мої заявки', 'my_book_requests')],
                    [telegraf_1.Markup.button.callback('❓ Допомога', 'book_requests_help')],
                ]).reply_markup,
            });
            logger_1.logger.userAction(userId, 'view_book_requests_menu');
        }
        catch (error) {
            logger_1.logger.error('Error showing book requests menu', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.GENERIC);
        }
    });
    bot.action('create_book_request', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.scene.enter('CREATE_BOOK_REQUEST_SCENE');
        }
        catch (error) {
            logger_1.logger.error('Error entering create request scene', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('my_book_requests', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
                return;
            }
            const requests = await (0, bookRequests_1.getUserBookRequests)(userId);
            if (requests.length === 0) {
                await ctx.editMessageText('📭 <b>У ВАС НЕМАЄ ЗАЯВОК</b>\n\n' +
                    'Ви ще не створювали жодної заявки на фізичну книгу.\n\n' +
                    'Створіть свою першу заявку!', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('➕ Створити заявку', 'create_book_request')],
                        [telegraf_1.Markup.button.callback('⬅️ Назад', 'back_to_requests_menu')],
                    ]).reply_markup,
                });
                return;
            }
            let message = '📋 <b>МОЇ ЗАЯВКИ</b>\n\n';
            message += `Всього заявок: ${requests.length}\n\n`;
            message += '━━━━━━━━━━━━━━━━━━━\n\n';
            const keyboard = [];
            requests.slice(0, 10).forEach((request, index) => {
                const statusEmoji = getStatusEmoji(request.status);
                keyboard.push([
                    telegraf_1.Markup.button.callback(`${index + 1}. ${statusEmoji} ${request.book_title}`, `view_request_${request.id}`),
                ]);
            });
            keyboard.push([telegraf_1.Markup.button.callback('➕ Нова заявка', 'create_book_request')]);
            keyboard.push([telegraf_1.Markup.button.callback('⬅️ Назад', 'back_to_requests_menu')]);
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
            });
            logger_1.logger.userAction(userId, 'view_my_requests', { count: requests.length });
        }
        catch (error) {
            logger_1.logger.error('Error showing user requests', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/view_request_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            await ctx.answerCbQuery();
            const requestId = parseInt(match[1], 10);
            const request = await (0, bookRequests_1.getBookRequestById)(requestId);
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
                }
                else {
                    message += `⚠️ <b>ПРОСТРОЧЕНО НА ${Math.abs(daysLeft)} днів!</b>\n`;
                }
            }
            if (request.returned_at) {
                message += `✅ <b>Повернено:</b> ${formatDate(request.returned_at)}\n`;
            }
            message += `\n📅 <b>Створено:</b> ${formatDate(request.created_at)}\n`;
            const keyboard = [];
            if (request.status === bookRequests_1.BookRequestStatus.PENDING) {
                keyboard.push([telegraf_1.Markup.button.callback('❌ Скасувати заявку', `cancel_request_${request.id}`)]);
            }
            keyboard.push([telegraf_1.Markup.button.callback('⬅️ До списку заявок', 'my_book_requests')]);
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
            });
            logger_1.logger.userAction(ctx.from.id, 'view_request', { requestId });
        }
        catch (error) {
            logger_1.logger.error('Error showing request', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('book_requests_help', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.editMessageText('❓ <b>ДОПОМОГА</b>\n\n' +
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
                'Сб-Нд: вихідні', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ Назад', 'back_to_requests_menu')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('back_to_requests_menu', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.editMessageText('📚 <b>ЗАМОВЛЕННЯ ФІЗИЧНОЇ КНИГИ</b>\n\n' +
                'Оберіть дію:', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('➕ Нова заявка', 'create_book_request')],
                    [telegraf_1.Markup.button.callback('📋 Мої заявки', 'my_book_requests')],
                    [telegraf_1.Markup.button.callback('❓ Допомога', 'book_requests_help')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error going back to requests menu', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
}
function getStatusEmoji(status) {
    switch (status) {
        case bookRequests_1.BookRequestStatus.PENDING:
            return '⏳';
        case bookRequests_1.BookRequestStatus.APPROVED:
            return '✅';
        case bookRequests_1.BookRequestStatus.REJECTED:
            return '❌';
        case bookRequests_1.BookRequestStatus.ISSUED:
            return '📖';
        case bookRequests_1.BookRequestStatus.RETURNED:
            return '✔️';
        case bookRequests_1.BookRequestStatus.OVERDUE:
            return '⚠️';
        default:
            return '❓';
    }
}
function getStatusText(status) {
    switch (status) {
        case bookRequests_1.BookRequestStatus.PENDING:
            return 'На розгляді';
        case bookRequests_1.BookRequestStatus.APPROVED:
            return 'Схвалено';
        case bookRequests_1.BookRequestStatus.REJECTED:
            return 'Відхилено';
        case bookRequests_1.BookRequestStatus.ISSUED:
            return 'Видано';
        case bookRequests_1.BookRequestStatus.RETURNED:
            return 'Повернено';
        case bookRequests_1.BookRequestStatus.OVERDUE:
            return 'Прострочено';
        default:
            return 'Невідомо';
    }
}
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function getDaysLeft(dueDateString) {
    const dueDate = new Date(dueDateString);
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
//# sourceMappingURL=bookRequests.js.map