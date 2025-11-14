"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const models_1 = require("../database/models");
const adminKeyboards_1 = require("../keyboards/adminKeyboards");
const logger_1 = require("../utils/logger");
exports.default = (bot) => {
    logger_1.logger.info('Admin handlers registered');
    bot.command('admin', async (ctx) => {
        logger_1.logger.info('/admin command received', { userId: ctx.from?.id });
        (async () => {
            if (!ctx.from?.id) {
                await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
                return;
            }
            const stats = await (0, models_1.getAdminStats)();
            const pendingReviews = await (0, models_1.getPendingReviews)();
            const pendingFeedback = await (0, models_1.getPendingFeedbackMessages)();
            const reviewsAlert = pendingReviews.length > 0
                ? `📝 Відгуків на модерацію: *${pendingReviews.length}* 🔔`
                : '✅ Всі відгуки оброблені';
            const feedbackAlert = pendingFeedback.length > 0
                ? `📞 Нових повідомлень: *${pendingFeedback.length}* 🔔`
                : '✅ Всі повідомлення прочитані';
            await ctx.reply(`🛠️ <b>Панель адміністратора</b>\n\n` +
                `📊 <b>Статистика:</b>\n` +
                `📚 Книг в каталозі: ${stats.totalBooks}\n` +
                `${reviewsAlert}\n` +
                `${feedbackAlert}`, {
                parse_mode: 'HTML',
                reply_markup: (0, adminKeyboards_1.getAdminMenuKeyboard)(pendingReviews.length, pendingFeedback.length)
            });
        })().catch((error) => {
            logger_1.logger.error('Error in admin command', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при отриманні даних адміністратора.');
        });
        return;
    });
    bot.action('add_book', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Відкриваємо форму додавання книги...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            ctx.scene.enter('ADD_BOOK_SCENE');
        })().catch((error) => {
            logger_1.logger.error('Error entering add book scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при переході до додавання книги.');
        });
        return;
    });
    bot.action('manage_books', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Завантаження списку книг...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            ctx.scene.enter('MANAGE_BOOKS_SCENE');
        })().catch((error) => {
            logger_1.logger.error('Error entering manage books scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при переході до управління книгами.');
        });
        return;
    });
    bot.action('manage_promo_codes', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Завантаження системи промокодів...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            ctx.scene.enter('PROMO_ADMIN_SCENE');
        })().catch((error) => {
            logger_1.logger.error('Error entering promo admin scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при переході до керування промокодами.');
        });
        return;
    });
    bot.action('admin_stats', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Завантаження статистики...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const stats = await (0, models_1.getAdminStats)();
            const pendingReviews = await (0, models_1.getPendingReviews)();
            await ctx.reply(`📊 *Статистика бібліотеки:*\n\n` +
                `📚 Всього книг: ${stats.totalBooks}\n` +
                `📝 Відгуків на модерацію: ${pendingReviews.length}`, { parse_mode: 'Markdown' });
        })().catch((error) => {
            logger_1.logger.error('Error getting admin stats', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при отриманні статистики.');
        });
        return;
    });
    bot.action('moderate_reviews', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Завантаження відгуків...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const reviews = await (0, models_1.getPendingReviews)();
            if (reviews.length === 0) {
                await ctx.reply('✅ Немає відгуків на модерацію');
                return;
            }
            await ctx.reply(`📝 Відгуків на модерацію: ${reviews.length}`);
            for (const review of reviews) {
                try {
                    const book = await (0, models_1.getBookById)(review.book_id);
                    const escapeHtml = (text) => {
                        return text
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;');
                    };
                    const safeTitle = escapeHtml(book?.title || 'Невідома');
                    const safeName = escapeHtml(review.user_name || 'Анонім');
                    const safeComment = review.comment ? escapeHtml(review.comment) : '';
                    const safeDate = escapeHtml(review.created_at || '');
                    let reviewText = `📝 <b>Відгук на модерацію #${review.id}</b>\n\n`;
                    reviewText += `📖 Книга: <b>${safeTitle}</b>\n`;
                    reviewText += `👤 Користувач: ${safeName}\n`;
                    reviewText += `⭐ Оцінка: ${'⭐'.repeat(review.rating)} (${review.rating}/5)\n\n`;
                    if (review.comment) {
                        reviewText += `💬 Коментар:\n"${safeComment}"\n\n`;
                    }
                    else {
                        reviewText += `💬 Коментар: <i>(відсутній)</i>\n\n`;
                    }
                    reviewText += `📅 Дата: ${safeDate}`;
                    await ctx.reply(reviewText, {
                        parse_mode: 'HTML',
                        reply_markup: (0, adminKeyboards_1.getReviewModerationKeyboard)(review.id)
                    });
                }
                catch (bookError) {
                    logger_1.logger.error('Error getting book for review', bookError instanceof Error ? bookError : new Error(String(bookError)), { reviewId: review.id });
                }
            }
        })().catch((error) => {
            logger_1.logger.error('Error showing pending reviews', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при отриманні відгуків.');
        });
        return;
    });
    bot.action(/publish_review_(\d+)/, async (ctx) => {
        (async () => {
            if (!ctx.from?.id) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID відгуку.');
                return;
            }
            const reviewId = parseInt(match[1]);
            const { publishReview } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            const result = await publishReview(reviewId);
            if (result > 0) {
                const message = ctx.callbackQuery?.message;
                const messageText = message && 'text' in message ? message.text : 'Відгук';
                await ctx.editMessageText(messageText + '\n\n✅ <b>ОПУБЛІКОВАНО</b>', { parse_mode: 'Markdown' });
                await ctx.answerCbQuery('✅ Відгук опубліковано!');
            }
            else {
                await ctx.answerCbQuery('⚠️ Відгук не знайдено');
            }
        })().catch((error) => {
            logger_1.logger.error('Error publishing review', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при публікації відгуку');
        });
        return;
    });
    bot.action(/delete_review_(\d+)/, async (ctx) => {
        (async () => {
            if (!ctx.from?.id) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID відгуку.');
                return;
            }
            const reviewId = parseInt(match[1]);
            const { deleteReview } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            const result = await deleteReview(reviewId);
            if (result > 0) {
                const message = ctx.callbackQuery?.message;
                const messageText = message && 'text' in message ? message.text : 'Відгук';
                await ctx.editMessageText(messageText + '\n\n❌ <b>ВИДАЛЕНО</b>', { parse_mode: 'Markdown' });
                await ctx.answerCbQuery('✅ Відгук видалено!');
            }
            else {
                await ctx.answerCbQuery('⚠️ Відгук не знайдено');
            }
        })().catch((error) => {
            logger_1.logger.error('Error deleting review', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при видаленні відгуку');
        });
        return;
    });
    bot.action('view_feedback', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Завантаження нових повідомлень...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const messages = await (0, models_1.getPendingFeedbackMessages)();
            const allMessages = await (0, models_1.getAllFeedbackMessages)();
            logger_1.logger.info('Feedback messages loaded', { pending: messages.length, total: allMessages.length });
            if (messages.length === 0) {
                await ctx.reply('✅ <b>Немає нових повідомлень</b>\n\n' +
                    'Всі повідомлення зворотного зв\'язку прочитані.\n\n' +
                    '💡 Користувачі можуть надіслати повідомлення через:\n' +
                    'Головне меню → 📞 Зворотній зв\'язок', {
                    parse_mode: 'Markdown',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('📜 Показати історію', 'view_feedback_history')],
                        [telegraf_1.Markup.button.callback('🏠 Головна', 'home')]
                    ]).reply_markup
                });
                return;
            }
            await ctx.reply(`📞 <b>Нові повідомлення зворотного зв'язку</b>\n\n` +
                `Нових: ${messages.length}\n` +
                `Всього в історії: ${allMessages.length}`, { parse_mode: 'Markdown' });
            for (const msg of messages) {
                try {
                    if (!msg.message || msg.message.trim() === '') {
                        logger_1.logger.warn('Empty feedback message', { messageId: msg.id });
                        await ctx.reply(`⚠️ *Повідомлення #${msg.id}*\n\n` +
                            `❌ Текст повідомлення відсутній або пошкоджений.\n\n` +
                            `👤 Від: ${msg.user_name || 'Користувач'}\n` +
                            `🆔 User ID: \`${msg.user_id}\``, { parse_mode: 'Markdown' });
                        continue;
                    }
                    const statusEmoji = msg.status === 'pending' ? '🔔 НОВЕ' :
                        msg.status === 'read' ? '✅ Прочитано' :
                            '💬 Відповіли';
                    const escapeHtml = (text) => {
                        return text
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;');
                    };
                    const safeName = escapeHtml(msg.user_name || 'Користувач');
                    const safeUsername = msg.user_username ? escapeHtml(msg.user_username) : '';
                    const safeMessage = escapeHtml(msg.message);
                    const safeCreatedAt = escapeHtml(new Date(msg.created_at).toLocaleString('uk-UA'));
                    const safeReadAt = msg.read_at ? escapeHtml(new Date(msg.read_at).toLocaleString('uk-UA')) : '';
                    let feedbackText = `📞 <b>Повідомлення #${msg.id}</b> ${statusEmoji}\n\n`;
                    feedbackText += `👤 Від: ${safeName}\n`;
                    feedbackText += `🆔 User ID: <code>${msg.user_id}</code>\n`;
                    if (msg.user_username) {
                        feedbackText += `📱 Username: @${safeUsername}\n`;
                    }
                    feedbackText += `\n💬 <b>Повідомлення:</b>\n"${safeMessage}"\n\n`;
                    feedbackText += `📅 Дата: ${safeCreatedAt}`;
                    if (msg.read_at) {
                        feedbackText += `\n👁️ Прочитано: ${safeReadAt}`;
                    }
                    await ctx.reply(feedbackText, {
                        parse_mode: 'HTML',
                        reply_markup: (0, adminKeyboards_1.getFeedbackActionKeyboard)(msg.id, msg.user_id)
                    });
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (msgError) {
                    logger_1.logger.error('Error displaying feedback message', msgError instanceof Error ? msgError : new Error(String(msgError)), { feedbackId: msg.id });
                    await ctx.reply(`❌ Помилка при відображенні повідомлення #${msg.id}\n` +
                        `Деталі: ${msgError instanceof Error ? msgError.message : String(msgError)}`);
                }
            }
            await ctx.reply('✅ Всі нові повідомлення завантажено', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🔄 Оновити', 'view_feedback')],
                    [telegraf_1.Markup.button.callback('📜 Показати історію', 'view_feedback_history')],
                    [telegraf_1.Markup.button.callback('🏠 Головна', 'home')]
                ]).reply_markup
            });
        })().catch((error) => {
            logger_1.logger.error('Error showing feedback messages', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при отриманні повідомлень.\n\n' +
                `Деталі: ${error instanceof Error ? error.message : String(error)}`);
        });
        return;
    });
    bot.action(/reply_feedback_(\d+)/, async (ctx) => {
        (async () => {
            if (!ctx.from?.id) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID повідомлення.');
                return;
            }
            const feedbackId = parseInt(match[1]);
            const allMessages = await (0, models_1.getAllFeedbackMessages)();
            const message = allMessages.find(m => m.id === feedbackId);
            if (!message) {
                await ctx.answerCbQuery('❌ Повідомлення не знайдено');
                return;
            }
            await ctx.answerCbQuery('✉️ Відкриваю форму відповіді...');
            await ctx.scene.enter('REPLY_FEEDBACK_SCENE', {
                feedbackId: message.id,
                userId: message.user_id,
                userName: message.user_name || 'Користувач',
                originalMessage: message.message
            });
        })().catch((error) => {
            logger_1.logger.error('Error opening reply form', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при відкритті форми відповіді');
        });
        return;
    });
    bot.action(/mark_feedback_read_(\d+)/, async (ctx) => {
        (async () => {
            if (!ctx.from?.id) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID повідомлення.');
                return;
            }
            const feedbackId = parseInt(match[1]);
            await (0, models_1.updateFeedbackStatus)(feedbackId, 'read');
            const message = ctx.callbackQuery?.message;
            if (message && 'text' in message) {
                try {
                    const escapeMarkdown = (text) => {
                        return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
                    };
                    const safeText = escapeMarkdown(message.text.replace('🔔 НОВЕ', '✅ Прочитано'));
                    await ctx.editMessageText(safeText, { parse_mode: 'Markdown' });
                }
                catch (editError) {
                    logger_1.logger.debug('Could not edit message, sending new one');
                }
            }
            await ctx.answerCbQuery('✅ Позначено прочитаним!');
        })().catch((error) => {
            logger_1.logger.error('Error marking feedback as read', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при оновленні статусу');
        });
        return;
    });
    bot.action('admin_back', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery();
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
                return;
            }
            const stats = await (0, models_1.getAdminStats)();
            const pendingReviews = await (0, models_1.getPendingReviews)();
            const pendingFeedback = await (0, models_1.getPendingFeedbackMessages)();
            const reviewsAlert = pendingReviews.length > 0
                ? `📝 Відгуків на модерацію: *${pendingReviews.length}* 🔔`
                : '✅ Всі відгуки оброблені';
            const feedbackAlert = pendingFeedback.length > 0
                ? `📞 Нових повідомлень: *${pendingFeedback.length}* 🔔`
                : '✅ Всі повідомлення прочитані';
            await ctx.editMessageText(`🛠️ <b>Панель адміністратора</b>\n\n` +
                `📊 *Статистика:*\n` +
                `📚 Книг в каталозі: ${stats.totalBooks}\n` +
                `${reviewsAlert}\n` +
                `${feedbackAlert}`, {
                parse_mode: 'Markdown',
                reply_markup: (0, adminKeyboards_1.getAdminMenuKeyboard)(pendingReviews.length, pendingFeedback.length)
            });
        })().catch((error) => {
            logger_1.logger.error('Error returning to admin panel', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка');
        });
        return;
    });
    bot.action('promo_back', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery();
            await ctx.scene.leave();
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
                return;
            }
            const stats = await (0, models_1.getAdminStats)();
            const pendingReviews = await (0, models_1.getPendingReviews)();
            const pendingFeedback = await (0, models_1.getPendingFeedbackMessages)();
            const reviewsAlert = pendingReviews.length > 0
                ? `📝 Відгуків на модерацію: *${pendingReviews.length}* 🔔`
                : '✅ Всі відгуки оброблені';
            const feedbackAlert = pendingFeedback.length > 0
                ? `📞 Нових повідомлень: *${pendingFeedback.length}* 🔔`
                : '✅ Всі повідомлення прочитані';
            await ctx.reply(`🛠️ <b>Панель адміністратора</b>\n\n` +
                `📊 *Статистика:*\n` +
                `📚 Книг в каталозі: ${stats.totalBooks}\n` +
                `${reviewsAlert}\n` +
                `${feedbackAlert}`, {
                parse_mode: 'Markdown',
                reply_markup: (0, adminKeyboards_1.getAdminMenuKeyboard)(pendingReviews.length, pendingFeedback.length)
            });
        })().catch((error) => {
            logger_1.logger.error('Error returning to admin panel from promo', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка');
        });
        return;
    });
    bot.action('view_feedback_history', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Завантаження історії повідомлень...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const messages = await (0, models_1.getAllFeedbackMessages)();
            logger_1.logger.info('Feedback history loaded', { count: messages.length });
            if (messages.length === 0) {
                await ctx.reply('📭 <b>Історія порожня</b>\n\n' +
                    'Ще немає жодного повідомлення зворотного зв\'язку.', { parse_mode: 'Markdown' });
                return;
            }
            await ctx.reply(`📜 <b>Історія повідомлень зворотного зв'язку</b>\n\n` +
                `Всього повідомлень: ${messages.length}\n` +
                `Нових: ${messages.filter(m => m.status === 'pending').length}\n` +
                `Прочитаних: ${messages.filter(m => m.status === 'read').length}\n` +
                `З відповіддю: ${messages.filter(m => m.status === 'replied').length}`, { parse_mode: 'Markdown' });
            for (const msg of messages) {
                try {
                    if (!msg.message || msg.message.trim() === '') {
                        continue;
                    }
                    const statusEmoji = msg.status === 'pending' ? '🔔 НОВЕ' :
                        msg.status === 'read' ? '✅ Прочитано' :
                            '💬 Відповіли';
                    const escapeHtml = (text) => {
                        return text
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;');
                    };
                    const safeName = escapeHtml(msg.user_name || 'Користувач');
                    const safeUsername = msg.user_username ? escapeHtml(msg.user_username) : '';
                    const safeMessage = escapeHtml(msg.message);
                    const safeCreatedAt = escapeHtml(new Date(msg.created_at).toLocaleString('uk-UA'));
                    const safeReadAt = msg.read_at ? escapeHtml(new Date(msg.read_at).toLocaleString('uk-UA')) : '';
                    let feedbackText = `📞 <b>Повідомлення #${msg.id}</b> ${statusEmoji}\n\n`;
                    feedbackText += `👤 Від: ${safeName}\n`;
                    feedbackText += `🆔 User ID: <code>${msg.user_id}</code>\n`;
                    if (msg.user_username) {
                        feedbackText += `📱 Username: @${safeUsername}\n`;
                    }
                    feedbackText += `\n💬 <b>Повідомлення:</b>\n"${safeMessage}"\n\n`;
                    feedbackText += `📅 Дата: ${safeCreatedAt}`;
                    if (msg.read_at) {
                        feedbackText += `\n👁️ Прочитано: ${safeReadAt}`;
                    }
                    await ctx.reply(feedbackText, {
                        parse_mode: 'HTML',
                        reply_markup: (0, adminKeyboards_1.getFeedbackActionKeyboard)(msg.id, msg.user_id)
                    });
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (msgError) {
                    logger_1.logger.error('Error displaying feedback message', msgError instanceof Error ? msgError : new Error(String(msgError)), { feedbackId: msg.id });
                }
            }
            await ctx.reply('✅ Вся історія завантажена', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('📞 Показати лише нові', 'view_feedback')],
                    [telegraf_1.Markup.button.callback('🏠 Головна', 'home')]
                ]).reply_markup
            });
        })().catch((error) => {
            logger_1.logger.error('Error showing feedback history', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при отриманні історії повідомлень.');
        });
        return;
    });
};
//# sourceMappingURL=adminHandlers.js.map