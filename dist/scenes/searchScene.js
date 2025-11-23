"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const searchScene = new telegraf_1.Scenes.BaseScene('SEARCH_SCENE');
searchScene.enter(async (ctx) => {
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    await ctx.reply('🔍 <b>Розширений пошук книг</b>\n\n' + 'Оберіть тип пошуку або введіть запит:', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
            [
                { text: '📖 За назвою', callback_data: 'search_by_title' },
                { text: '👤 За автором', callback_data: 'search_by_author' },
            ],
            [
                { text: '📚 За жанром', callback_data: 'search_by_genre' },
                { text: '🔍 Загальний пошук', callback_data: 'search_general' },
            ],
            [{ text: '🤖 Розумний пошук (AI)', callback_data: 'search_ai' }],
            [{ text: '⬅️ Назад', callback_data: 'search_back' }],
        ]).reply_markup,
    });
});
searchScene.action('search_by_title', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'title';
    await ctx.editMessageText('📖 <b>Пошук за назвою</b>\n\n' + 'Введіть назву книги:\n\n' + '💡 <i>Приклад:</i> Кобзар', { parse_mode: 'HTML' });
});
searchScene.action('search_by_author', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'author';
    await ctx.editMessageText('👤 <b>Пошук за автором</b>\n\n' + "Введіть ім'я автора:\n\n" + '💡 <i>Приклад:</i> Шевченко', { parse_mode: 'HTML' });
});
searchScene.action('search_by_genre', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'genre';
    await ctx.editMessageText('📚 <b>Пошук за жанром</b>\n\n' + 'Введіть жанр:\n\n' + '💡 <i>Приклад:</i> Історична', { parse_mode: 'HTML' });
});
searchScene.action('search_general', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'general';
    await ctx.editMessageText('🔍 <b>Розумний пошук</b>\n\n' +
        'Введіть будь-який запит (назва, автор, жанр):\n\n' +
        '✨ <b>Можливості:</b>\n' +
        '• Пошук з помилками: "Кобзарь" → "Кобзар"\n' +
        '• Синоніми: "Sci-Fi" → "Фантастика"\n' +
        '• Автодоповнення при введенні\n\n' +
        '💡 Пошук буде виконано по всіх полях', { parse_mode: 'HTML' });
});
searchScene.action('search_back', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene?.leave();
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('👋 Повертаємось до головного меню', {
        reply_markup: getMainMenuKeyboard(),
    });
});
searchScene.action('search_ai', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'ai';
    await ctx.editMessageText('🤖 *Розумний пошук (AI)*\n\n' +
        'Опишіть що шукаєте своїми словами:\n\n' +
        '💡 *Приклади:*\n' +
        '• "книги про кохання в Києві"\n' +
        '• "детективи з несподіваною розв\'язкою"\n' +
        '• "щось легке для відпочинку"\n' +
        '• "книги як у Толкіена"', { parse_mode: 'Markdown' });
});
exports.default = searchScene;
//# sourceMappingURL=searchScene.js.map