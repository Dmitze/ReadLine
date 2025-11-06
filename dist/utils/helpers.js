"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRequestInfo = exports.formatBookCaption = void 0;
const formatBookCaption = (book) => {
    let caption = `📖 *${book.title}*\n`;
    caption += `👤 Автор: ${book.author}\n`;
    caption += `📚 Жанр: ${book.genre}\n`;
    caption += `📝 Опис: ${book.description}\n`;
    caption += `📍 Статус: ${book.is_available ? 'Доступна' : 'Недоступна'}`;
    return caption;
};
exports.formatBookCaption = formatBookCaption;
const formatRequestInfo = (request, book) => {
    let info = `📋 Заявка #${request.id}\n`;
    info += `📖 Книга: ${book.title}\n`;
    info += `👤 ПІБ: ${request.full_name}\n`;
    info += `🎯 Підрозділ: ${request.unit}\n`;
    info += `📞 Телефон: ${request.phone}\n`;
    info += `📅 Дата: ${request.created_at}`;
    return info;
};
exports.formatRequestInfo = formatRequestInfo;
//# sourceMappingURL=helpers.js.map