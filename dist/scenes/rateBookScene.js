"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const models_1 = require("../database/models");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const helpers_1 = require("../utils/helpers");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const rateBookScene = new telegraf_1.Scenes.WizardScene('RATE_BOOK_SCENE', async (ctx) => {
    const bookId = ctx.session?.bookToRate ||
        ctx.scene?.state?.bookId ||
        ctx.wizard?.state?.bookId;
    if (!bookId) {
        logger_1.logger.error('Rate book scene: bookId not found', new Error('Missing bookId'), {
            session: ctx.session,
            sceneState: ctx.scene?.state,
            wizardState: ctx.wizard?.state,
        });
        await ctx.reply('❌ Помилка: книга не знайдена. Спробуйте ще раз.');
        return ctx.scene?.leave();
    }
    if (ctx.wizard?.state) {
        ctx.wizard.state.bookId = bookId;
    }
    const book = await (0, models_1.getBookById)(bookId);
    if (!book) {
        await ctx.reply('❌ Помилка: книга не знайдена.');
        return ctx.scene?.leave();
    }
    await ctx.reply(`⭐ <b>Оцініть книгу</b>\n\n📖 ${book.title}${(0, helpers_1.getBookIdText)(book.id)}\n👤 ${book.author}\n\nОберіть рейтинг (1-5 зірок):`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    telegraf_1.Markup.button.callback('⭐', 'rating_1'),
                    telegraf_1.Markup.button.callback('⭐⭐', 'rating_2'),
                    telegraf_1.Markup.button.callback('⭐⭐⭐', 'rating_3'),
                ],
                [
                    telegraf_1.Markup.button.callback('⭐⭐⭐⭐', 'rating_4'),
                    telegraf_1.Markup.button.callback('⭐⭐⭐⭐⭐', 'rating_5'),
                ],
                [telegraf_1.Markup.button.callback('❌ Скасувати', 'rating_cancel')],
            ],
        },
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery))
        return;
    const action = ctx.callbackQuery.data;
    if (action === 'rating_cancel') {
        await ctx.editMessageText('❌ Оцінювання скасовано.');
        await ctx.reply('Виберіть дію:', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        return ctx.scene?.leave();
    }
    const rating = (0, helpers_1.safeParseInt)(action.replace('rating_', ''), 1);
    if (rating < 1 || rating > 5) {
        await ctx.answerCbQuery('❌ Некоректний рейтинг');
        return;
    }
    (ctx.wizard?.state).rating = rating;
    await ctx.editMessageText(`✅ Ви обрали: ${'⭐'.repeat(rating)}\n\n` +
        '💬 Хочете додати коментар? (опціонально)\n\n' +
        'Напишіть ваш відгук або натисніть "Пропустити"', {
        reply_markup: {
            inline_keyboard: [[telegraf_1.Markup.button.callback('⏭️ Пропустити', 'skip_comment')]],
        },
    });
    return ctx.wizard.next();
}, async (ctx) => {
    const bookId = ctx.wizard?.state?.bookId ||
        ctx.session?.bookToRate ||
        ctx.scene?.state?.bookId;
    const rating = ctx.wizard?.state?.rating;
    let comment = null;
    if (ctx.callbackQuery &&
        'data' in ctx.callbackQuery &&
        ctx.callbackQuery.data === 'skip_comment') {
        comment = null;
    }
    else if (ctx.message && 'text' in ctx.message) {
        comment = ctx.message.text;
    }
    else {
        await ctx.reply('❌ Будь ласка, надішліть текст або натисніть "Пропустити".');
        return;
    }
    if (!bookId || !rating) {
        logger_1.logger.error('Rate book scene: missing bookId or rating', new Error('Missing data'), {
            bookId,
            rating,
            wizardState: ctx.wizard?.state,
        });
        await ctx.reply('❌ Помилка: не вдалося зберегти відгук. Спробуйте ще раз.');
        return ctx.scene?.leave();
    }
    const reviewData = {
        book_id: bookId,
        user_id: ctx.from.id,
        user_name: ctx.from.first_name || 'Користувач',
        rating: rating,
        comment: comment,
        is_published: false,
    };
    const validation = (0, validation_1.validateReviewData)(reviewData);
    if (!validation.isValid) {
        await ctx.reply('❌ *Помилка валідації:*\n\n' +
            validation.errors.join('\n') +
            '\n\nСпробуйте оцінити книгу ще раз.', { parse_mode: 'Markdown' });
        return ctx.scene?.leave();
    }
    await (0, models_1.addReview)(reviewData);
    await ctx.reply('✅ *Дякуємо за відгук!*\n\n' +
        `⭐ Ваша оцінка: ${'⭐'.repeat(rating)}\n` +
        `💬 Коментар: ${comment || 'без коментаря'}\n\n` +
        '📝 Відгук буде опублікований після модерації адміністратором.', { parse_mode: 'Markdown' });
    await ctx.reply('Виберіть дію:', {
        reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
    });
    return ctx.scene?.leave();
});
exports.default = rateBookScene;
//# sourceMappingURL=rateBookScene.js.map