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
const models_1 = require("../../database/models");
const adminKeyboards_1 = require("../../keyboards/adminKeyboards");
const logger_1 = require("../../utils/logger");
const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
exports.default = (bot) => {
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
            const bookIds = reviews.map((r) => r.book_id);
            const booksMap = await (0, models_1.getBooksByIds)(bookIds);
            for (const review of reviews) {
                try {
                    const book = booksMap.get(review.book_id);
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
                        reviewText += '💬 Коментар: <i>(відсутній)</i>\n\n';
                    }
                    reviewText += `📅 Дата: ${safeDate}`;
                    await ctx.reply(reviewText, {
                        parse_mode: 'HTML',
                        reply_markup: (0, adminKeyboards_1.getReviewModerationKeyboard)(review.id),
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
            const { publishReview } = await Promise.resolve().then(() => __importStar(require('../../database/models')));
            const result = await publishReview(reviewId);
            if (result > 0) {
                const message = ctx.callbackQuery?.message;
                const messageText = message && 'text' in message ? message.text : 'Відгук';
                await ctx.editMessageText(messageText + '\n\n✅ <b>ОПУБЛІКОВАНО</b>', {
                    parse_mode: 'Markdown',
                });
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
            const { deleteReview } = await Promise.resolve().then(() => __importStar(require('../../database/models')));
            const result = await deleteReview(reviewId);
            if (result > 0) {
                const message = ctx.callbackQuery?.message;
                const messageText = message && 'text' in message ? message.text : 'Відгук';
                await ctx.editMessageText(messageText + '\n\n❌ <b>ВИДАЛЕНО</b>', {
                    parse_mode: 'Markdown',
                });
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
};
//# sourceMappingURL=reviews.js.map