"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackKeyboard = exports.getBookOrderKeyboard = exports.getGenreKeyboard = exports.getMainMenuKeyboard = void 0;
const telegraf_1 = require("telegraf");
const getMainMenuKeyboard = () => {
    return telegraf_1.Markup
        .keyboard([
        ['📖 Перегляд каталогу', '🔍 Пошук книги'],
        ['📋 Мої заявки', '👤 Мій профіль'],
        ['ℹ️ Допомога']
    ])
        .resize()
        .oneTime()
        .reply_markup;
};
exports.getMainMenuKeyboard = getMainMenuKeyboard;
const getGenreKeyboard = (genres) => {
    const keyboard = genres.map(genre => [genre]);
    keyboard.push(['⬅️ Назад']);
    return telegraf_1.Markup
        .keyboard(keyboard)
        .resize()
        .reply_markup;
};
exports.getGenreKeyboard = getGenreKeyboard;
const getBookOrderKeyboard = (bookId) => {
    return telegraf_1.Markup
        .inlineKeyboard([
        telegraf_1.Markup.button.callback('🎯 Замовити цю книгу', `order_${bookId}`)
    ])
        .reply_markup;
};
exports.getBookOrderKeyboard = getBookOrderKeyboard;
const getBackKeyboard = () => {
    return telegraf_1.Markup
        .keyboard([['⬅️ Назад']])
        .resize()
        .reply_markup;
};
exports.getBackKeyboard = getBackKeyboard;
//# sourceMappingURL=mainKeyboards.js.map