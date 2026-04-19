"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdminBookRequestHandlers = registerAdminBookRequestHandlers;
const telegraf_1 = require("telegraf");
const logger_1 = require("../../utils/logger");
const bookRequests_1 = require("../../database/tables/bookRequests");
function registerAdminBookRequestHandlers(bot) {
    bot.action('admin_book_requests', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const stats = await (0, bookRequests_1.getBookRequestsStats)();
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
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [
                        telegraf_1.Markup.button.callback(`⏳ На розгляді (${stats.pending})`, 'admin_requests_pending'),
                        telegraf_1.Markup.button.callback(`📖 Видано (${stats.issued})`, 'admin_requests_issued'),
                    ],
                    [
                        telegraf_1.Markup.button.callback(`⚠️ Прострочені (${stats.overdue})`, 'admin_requests_overdue'),
                        telegraf_1.Markup.button.callback('📋 Всі заявки', 'admin_requests_all'),
                    ],
                    [telegraf_1.Markup.button.callback('⬅️ Назад до адмінки', 'back_to_admin')],
                ]).reply_markup,
            });
            logger_1.logger.adminAction(ctx.from.id, 'view_requests_menu');
        }
        catch (error) {
            logger_1.logger.error('Error showing admin requests menu', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('admin_requests_pending', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await showRequestsList(ctx, bookRequests_1.BookRequestStatus.PENDING);
        }
        catch (error) {
            logger_1.logger.error('Error showing pending requests', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('admin_requests_issued', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await showRequestsList(ctx, bookRequests_1.BookRequestStatus.ISSUED);
        }
        catch (error) {
            logger_1.logger.error('Error showing issued requests', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('admin_requests_overdue', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await (0, bookRequests_1.markOverdueRequests)();
            const overdueRequests = await (0, bookRequests_1.getOverdueRequests)();
            if (overdueRequests.length === 0) {
                await ctx.editMessageText('✅ <b>НЕМАЄ ПРОСТРОЧЕНИХ КНИГ</b>\n\n' + 'Всі книги повернуті вчасно!', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('⬅️ Назад', 'admin_book_requests')],
                    ]).reply_markup,
                });
                return;
            }
            let message = '⚠️ <b>ПРОСТРОЧЕНІ КНИГИ</b>\n\n';
            message += `Знайдено ${overdueRequests.length} прострочених книг:\n\n`;
            message += '━━━━━━━━━━━━━━━━━━━\n\n';
            const keyboard = [];
            overdueRequests.slice(0, 10).forEach((request, index) => {
                const daysOverdue = Math.abs(getDaysLeft(request.due_date));
                keyboard.push([
                    telegraf_1.Markup.button.callback(`${index + 1}. ${request.book_title} (${daysOverdue} дн.)`, `admin_view_request_${request.id}`),
                ]);
            });
            keyboard.push([telegraf_1.Markup.button.callback('⬅️ Назад', 'admin_book_requests')]);
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing overdue requests', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('admin_requests_all', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const requests = await (0, bookRequests_1.getAllBookRequests)(20);
            if (requests.length === 0) {
                await ctx.editMessageText('📭 <b>ЗАЯВОК НЕМАЄ</b>', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('⬅️ Назад', 'admin_book_requests')],
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
                    telegraf_1.Markup.button.callback(`${index + 1}. ${statusEmoji} ${request.book_title}`, `admin_view_request_${request.id}`),
                ]);
            });
            keyboard.push([telegraf_1.Markup.button.callback('⬅️ Назад', 'admin_book_requests')]);
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing all requests', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/admin_view_request_(\d+)/, async (ctx) => {
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
                keyboard.push([
                    telegraf_1.Markup.button.callback('✅ Схвалити', `approve_request_${request.id}`),
                    telegraf_1.Markup.button.callback('❌ Відхилити', `reject_request_${request.id}`),
                ]);
            }
            if (request.status === bookRequests_1.BookRequestStatus.APPROVED) {
                keyboard.push([telegraf_1.Markup.button.callback('📖 Видати книгу', `issue_request_${request.id}`)]);
            }
            if (request.status === bookRequests_1.BookRequestStatus.ISSUED ||
                request.status === bookRequests_1.BookRequestStatus.OVERDUE) {
                keyboard.push([
                    telegraf_1.Markup.button.callback('✔️ Повернути книгу', `return_request_${request.id}`),
                ]);
            }
            keyboard.push([telegraf_1.Markup.button.callback('⬅️ Назад', 'admin_book_requests')]);
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
            });
            logger_1.logger.adminAction(ctx.from.id, 'view_request', { requestId });
        }
        catch (error) {
            logger_1.logger.error('Error showing request to admin', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/approve_request_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            const requestId = parseInt(match[1], 10);
            const adminId = ctx.from?.id;
            if (!adminId) {
                await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
                return;
            }
            await (0, bookRequests_1.updateBookRequestStatus)(requestId, bookRequests_1.BookRequestStatus.APPROVED, adminId, 'Книга доступна до видачі');
            await ctx.answerCbQuery('✅ Заявку схвалено');
            await ctx.scene.reenter();
            logger_1.logger.adminAction(adminId, 'approve_request', { requestId });
        }
        catch (error) {
            logger_1.logger.error('Error approving request', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/reject_request_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            const requestId = parseInt(match[1], 10);
            const adminId = ctx.from?.id;
            if (!adminId) {
                await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
                return;
            }
            await (0, bookRequests_1.updateBookRequestStatus)(requestId, bookRequests_1.BookRequestStatus.REJECTED, adminId, 'Книги немає у наявності');
            await ctx.answerCbQuery('❌ Заявку відхилено');
            logger_1.logger.adminAction(adminId, 'reject_request', { requestId });
            await ctx.answerCbQuery();
            await ctx.editMessageText('✅ Заявку відхилено', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ До списку заявок', 'admin_book_requests')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error rejecting request', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/issue_request_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            await ctx.answerCbQuery();
            const requestId = parseInt(match[1], 10);
            await ctx.editMessageText('📖 <b>ВИДАЧА КНИГИ</b>\n\n' + 'Оберіть термін видачі:', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('7 днів', `issue_book_${requestId}_7`)],
                    [telegraf_1.Markup.button.callback('14 днів', `issue_book_${requestId}_14`)],
                    [telegraf_1.Markup.button.callback('30 днів', `issue_book_${requestId}_30`)],
                    [telegraf_1.Markup.button.callback('⬅️ Назад', `admin_view_request_${requestId}`)],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing issue options', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/issue_book_(\d+)_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            const requestId = parseInt(match[1], 10);
            const days = parseInt(match[2], 10);
            const adminId = ctx.from?.id;
            if (!adminId) {
                await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
                return;
            }
            await (0, bookRequests_1.issueBook)(requestId, days, adminId);
            await ctx.answerCbQuery(`✅ Книгу видано на ${days} днів`);
            logger_1.logger.adminAction(adminId, 'issue_book', { requestId, days });
            await ctx.editMessageText('✅ <b>КНИГУ ВИДАНО</b>\n\n' +
                `📅 Термін повернення: ${days} днів\n\n` +
                'Користувач отримав сповіщення.', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ До списку заявок', 'admin_book_requests')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error issuing book', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/return_request_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            const requestId = parseInt(match[1], 10);
            const adminId = ctx.from?.id;
            if (!adminId) {
                await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
                return;
            }
            await (0, bookRequests_1.returnBook)(requestId);
            await ctx.answerCbQuery('✅ Книгу повернено');
            logger_1.logger.adminAction(adminId, 'return_book', { requestId });
            await ctx.editMessageText('✅ <b>КНИГУ ПОВЕРНЕНО</b>\n\n' + 'Статус заявки оновлено.', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ До списку заявок', 'admin_book_requests')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error returning book', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
}
async function showRequestsList(ctx, status) {
    const requests = await (0, bookRequests_1.getBookRequestsByStatus)(status);
    const statusText = getStatusText(status);
    const statusEmoji = getStatusEmoji(status);
    if (requests.length === 0) {
        await ctx.editMessageText(`📭 <b>НЕМАЄ ЗАЯВОК</b>\n\n${statusEmoji} Статус: ${statusText}`, {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('⬅️ Назад', 'admin_book_requests')],
            ]).reply_markup,
        });
        return;
    }
    let message = `${statusEmoji} <b>${statusText.toUpperCase()}</b>\n\n`;
    message += `Знайдено ${requests.length} ${requests.length === 1 ? 'заявку' : 'заявок'}:\n\n`;
    const keyboard = [];
    requests.slice(0, 10).forEach((request, index) => {
        keyboard.push([
            telegraf_1.Markup.button.callback(`${index + 1}. ${request.book_title}`, `admin_view_request_${request.id}`),
        ]);
    });
    keyboard.push([telegraf_1.Markup.button.callback('⬅️ Назад', 'admin_book_requests')]);
    await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
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