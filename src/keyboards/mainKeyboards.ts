// Main user keyboards
import { Markup } from 'telegraf';

export const getMainMenuKeyboard = () => {
  return Markup
    .keyboard([
      ['📖 Перегляд каталогу', '🔍 Пошук книги'],
      ['📋 Мої заявки', '👤 Мій профіль'],
      ['ℹ️ Допомога']
    ])
    .resize()
    .oneTime()
    .reply_markup;
};

export const getGenreKeyboard = (genres: string[]) => {
  const keyboard = genres.map(genre => [genre]);
  keyboard.push(['⬅️ Назад']);
  
  return Markup
    .keyboard(keyboard)
    .resize()
    .reply_markup;
};

export const getBookOrderKeyboard = (bookId: number) => {
  return Markup
    .inlineKeyboard([
      Markup.button.callback('🎯 Замовити цю книгу', `order_${bookId}`)
    ])
    .reply_markup;
};

export const getBackKeyboard = () => {
  return Markup
    .keyboard([['⬅️ Назад']])
    .resize()
    .reply_markup;
};