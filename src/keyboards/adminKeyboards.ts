// Admin keyboards
import { Markup } from 'telegraf';

export const getAdminMenuKeyboard = (pendingCount: number = 0, pendingReviews: number = 0, pendingFeedback: number = 0) => {
  // pendingCount більше не використовується (заявки видалені)
    
  const reviewsButtonText = pendingReviews > 0
    ? `📝 Відгуки (${pendingReviews}) 🔔`
    : '📝 Модерація';
    
  const feedbackButtonText = pendingFeedback > 0
    ? `📞 Повідомлення (${pendingFeedback}) 🔔`
    : '📞 Повідомлення';
  
  return Markup
    .inlineKeyboard([
      [Markup.button.callback('➕ Додати книгу', 'add_book')],
      [Markup.button.callback('📚 Управління книгами', 'manage_books')],
      [Markup.button.callback('🎁 Керування промокодами', 'manage_promo_codes')],
      [Markup.button.callback(reviewsButtonText, 'moderate_reviews')],
      [Markup.button.callback(feedbackButtonText, 'view_feedback')],
      [Markup.button.callback('📊 Статистика', 'admin_stats')]
    ])
    .reply_markup;
};

// getRequestActionKeyboard видалено - більше не використовуємо заявки

export const getGenresKeyboard = (genres: string[]) => {
  const keyboard = genres.map(genre => [genre]);
  return Markup
    .keyboard(keyboard)
    .oneTime()
    .resize()
    .reply_markup;
};

export const getReviewModerationKeyboard = (reviewId: number) => {
  return Markup
    .inlineKeyboard([
      [Markup.button.callback('✅ Опублікувати', `publish_review_${reviewId}`)],
      [Markup.button.callback('❌ Видалити', `delete_review_${reviewId}`)]
    ])
    .reply_markup;
};

export const getFeedbackActionKeyboard = (feedbackId: number, userId: number) => {
  return Markup
    .inlineKeyboard([
      [
        Markup.button.callback('✉️ Відповісти', `reply_feedback_${feedbackId}`),
        Markup.button.callback('✅ Прочитано', `mark_feedback_read_${feedbackId}`)
      ],
      [Markup.button.url('👤 Профіль користувача', `tg://user?id=${userId}`)]
    ])
    .reply_markup;
};
