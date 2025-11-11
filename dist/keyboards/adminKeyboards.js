"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedbackActionKeyboard = exports.getReviewModerationKeyboard = exports.getGenresKeyboard = exports.getAdminMenuKeyboard = void 0;
const telegraf_1 = require("telegraf");
const getAdminMenuKeyboard = (pendingReviews = 0, pendingFeedback = 0) => {
    const reviewsButtonText = pendingReviews > 0
        ? `📝 Відгуки (${pendingReviews}) 🔔`
        : '📝 Модерація';
    const feedbackButtonText = pendingFeedback > 0
        ? `📞 Повідомлення (${pendingFeedback}) 🔔`
        : '📞 Повідомлення';
    return telegraf_1.Markup
        .inlineKeyboard([
        [telegraf_1.Markup.button.callback('➕ Додати книгу', 'add_book')],
        [telegraf_1.Markup.button.callback('📚 Управління книгами', 'manage_books')],
        [telegraf_1.Markup.button.callback('🎁 Керування промокодами', 'manage_promo_codes')],
        [telegraf_1.Markup.button.callback(reviewsButtonText, 'moderate_reviews')],
        [telegraf_1.Markup.button.callback(feedbackButtonText, 'view_feedback')],
        [telegraf_1.Markup.button.callback('📊 Статистика', 'admin_stats')]
    ])
        .reply_markup;
};
exports.getAdminMenuKeyboard = getAdminMenuKeyboard;
const getGenresKeyboard = (genres) => {
    const keyboard = genres.map(genre => [genre]);
    return telegraf_1.Markup
        .keyboard(keyboard)
        .oneTime()
        .resize()
        .reply_markup;
};
exports.getGenresKeyboard = getGenresKeyboard;
const getReviewModerationKeyboard = (reviewId) => {
    return telegraf_1.Markup
        .inlineKeyboard([
        [telegraf_1.Markup.button.callback('✅ Опублікувати', `publish_review_${reviewId}`)],
        [telegraf_1.Markup.button.callback('❌ Видалити', `delete_review_${reviewId}`)]
    ])
        .reply_markup;
};
exports.getReviewModerationKeyboard = getReviewModerationKeyboard;
const getFeedbackActionKeyboard = (feedbackId, userId) => {
    return telegraf_1.Markup
        .inlineKeyboard([
        [
            telegraf_1.Markup.button.callback('✉️ Відповісти', `reply_feedback_${feedbackId}`),
            telegraf_1.Markup.button.callback('✅ Прочитано', `mark_feedback_read_${feedbackId}`)
        ],
        [telegraf_1.Markup.button.url('👤 Профіль користувача', `tg://user?id=${userId}`)]
    ])
        .reply_markup;
};
exports.getFeedbackActionKeyboard = getFeedbackActionKeyboard;
//# sourceMappingURL=adminKeyboards.js.map