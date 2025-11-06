"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGenresKeyboard = exports.getRequestActionKeyboard = exports.getAdminMenuKeyboard = void 0;
const telegraf_1 = require("telegraf");
const getAdminMenuKeyboard = () => {
    return telegraf_1.Markup
        .inlineKeyboard([
        [telegraf_1.Markup.button.callback('📋 Перегляд заявок', 'view_requests')],
        [telegraf_1.Markup.button.callback('➕ Додати книгу', 'add_book')],
        [telegraf_1.Markup.button.callback('📊 Статистика', 'admin_stats')]
    ])
        .reply_markup;
};
exports.getAdminMenuKeyboard = getAdminMenuKeyboard;
const getRequestActionKeyboard = (requestId) => {
    return telegraf_1.Markup
        .inlineKeyboard([
        [telegraf_1.Markup.button.callback('✅ Підтвердити', `approve_${requestId}`)],
        [telegraf_1.Markup.button.callback('❌ Відхилити', `reject_${requestId}`)]
    ])
        .reply_markup;
};
exports.getRequestActionKeyboard = getRequestActionKeyboard;
const getGenresKeyboard = (genres) => {
    const keyboard = genres.map(genre => [genre]);
    return telegraf_1.Markup
        .keyboard(keyboard)
        .oneTime()
        .resize()
        .reply_markup;
};
exports.getGenresKeyboard = getGenresKeyboard;
//# sourceMappingURL=adminKeyboards.js.map