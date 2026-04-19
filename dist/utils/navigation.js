"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBreadcrumbs = formatBreadcrumbs;
exports.createNavigationKeyboard = createNavigationKeyboard;
exports.createBreadcrumbText = createBreadcrumbText;
exports.getQuickActionsKeyboard = getQuickActionsKeyboard;
exports.getStandardMainMenu = getStandardMainMenu;
const telegraf_1 = require("telegraf");
const constants_1 = require("../constants");
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
        [constants_1.BUTTONS.CATALOG, constants_1.BUTTONS.SEARCH],
        [constants_1.BUTTONS.TOP_BOOKS, constants_1.BUTTONS.NEW_BOOKS],
        ['💾 Моя бібліотека', '👤 Профіль'],
        ['🤖 AI Помічник', 'ℹ️ Допомога'],
        [constants_1.BUTTONS.FEEDBACK],
    ]).resize().reply_markup;
}
function getStandardMainMenu() {
    return telegraf_1.Markup.keyboard([
        [constants_1.BUTTONS.CATALOG, constants_1.BUTTONS.SEARCH],
        [constants_1.BUTTONS.TOP_BOOKS, constants_1.BUTTONS.NEW_BOOKS],
        [constants_1.BUTTONS.MY_LIBRARY, constants_1.BUTTONS.PROFILE],
        [constants_1.BUTTONS.AI_ASSISTANT, constants_1.BUTTONS.HELP],
        [constants_1.BUTTONS.FEEDBACK],
    ]).resize().reply_markup;
}
//# sourceMappingURL=navigation.js.map