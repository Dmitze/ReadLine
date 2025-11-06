// Admin keyboards
import { Markup } from 'telegraf';

export const getAdminMenuKeyboard = () => {
  return Markup
    .inlineKeyboard([
      [Markup.button.callback('📋 Перегляд заявок', 'view_requests')],
      [Markup.button.callback('➕ Додати книгу', 'add_book')],
      [Markup.button.callback('📊 Статистика', 'admin_stats')]
    ])
    .reply_markup;
};

export const getRequestActionKeyboard = (requestId: number) => {
  return Markup
    .inlineKeyboard([
      [Markup.button.callback('✅ Підтвердити', `approve_${requestId}`)],
      [Markup.button.callback('❌ Відхилити', `reject_${requestId}`)]
    ])
    .reply_markup;
};

export const getGenresKeyboard = (genres: string[]) => {
  const keyboard = genres.map(genre => [genre]);
  return Markup
    .keyboard(keyboard)
    .oneTime()
    .resize()
    .reply_markup;
};