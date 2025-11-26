"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBreadcrumbs = formatBreadcrumbs;
exports.createNavigationKeyboard = createNavigationKeyboard;
exports.createBreadcrumbText = createBreadcrumbText;
exports.getQuickActionsKeyboard = getQuickActionsKeyboard;
exports.getStandardMainMenu = getStandardMainMenu;
const telegraf_1 = require("telegraf");
function formatBreadcrumbs(items) {
    return items.map((item) => item.label).join(' > ');
}
function createNavigationKeyboard(options) {
    const { showHome = true, showBack = true, backAction = 'back', additionalButtons = [] } = options;
    const keyboard = [...additionalButtons];
    const navRow = [];
    if (showBack) {
        navRow.push(telegraf_1.Markup.button.callback('⬅️ Назад', backAction));
    }
    if (showHome) {
        navRow.push(telegraf_1.Markup.button.callback('🏠 На головну', 'home'));
    }
    if (navRow.length > 0) {
        keyboard.push(navRow);
    }
    return telegraf_1.Markup.inlineKeyboard(keyboard);
}
function createBreadcrumbText(breadcrumbs, content) {
    const breadcrumbText = formatBreadcrumbs(breadcrumbs);
    return `📍 ${breadcrumbText}\n\n${content}`;
}
function getQuickActionsKeyboard() {
    return telegraf_1.Markup.keyboard([
        ['⚡ Швидкий пошук', '⭐ Мої улюблені'],
        ['📚 Продовжити читати', '🎲 Випадкова книга'],
        ['📖 Каталог', '🔍 Пошук'],
        ['⭐ Топ книги', '🆕 Новинки'],
        ['💾 Моя бібліотека', '👤 Профіль'],
        ['🤖 AI Помічник', 'ℹ️ Допомога'],
        ["📞 Зворотній зв'язок"],
    ]).resize().reply_markup;
}
function getStandardMainMenu() {
    return telegraf_1.Markup.keyboard([
        ['📖 Каталог', '🔍 Пошук'],
        ['⭐ Топ книги', '🆕 Новинки'],
        ['💾 Моя бібліотека', '👤 Профіль'],
        ['🤖 AI Помічник', 'ℹ️ Допомога'],
        ["📞 Зворотній зв'язок"],
    ]).resize().reply_markup;
}
//# sourceMappingURL=navigation.js.map