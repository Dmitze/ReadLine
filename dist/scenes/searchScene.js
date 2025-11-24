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
    await ctx.editMessageText('📖 <b>ПОШУК ЗА НАЗВОЮ</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Введіть назву легенди яку шукаєш:\n\n' +
        '💡 Приклад: Кобзар', { parse_mode: 'HTML' });
});
searchScene.action('search_by_author', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'author';
    await ctx.editMessageText('👤 <b>ПОШУК ЗА АВТОРОМ</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        "Введіть ім'я скальда-автора:\n\n" +
        '💡 Приклад: Шевченко', { parse_mode: 'HTML' });
});
searchScene.action('search_by_genre', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'genre';
    await ctx.editMessageText('📚 <b>ПОШУК ЗА ЖАНРОМ (БИТВОЮ)</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Введіть тип битви яку хочеш пережити:\n\n' +
        '💡 Приклад: Історична', { parse_mode: 'HTML' });
});
searchScene.action('search_general', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'general';
    await ctx.editMessageText('🔍 <b>ПОВНИЙ ПОШУК</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Введи будь-яке слово (назву, імя автора, жанр):\n\n' +
        '✨ <b>СУПЕРСИЛИ РОЗВІДКИ:</b>\n' +
        '⚔️ Знаходить навіть з помилками: "Кобзарь" → "Кобзар"\n' +
        '🗡️ Розуміє синоніми: "Sci-Fi" → "Фантастика"\n' +
        '📚 Автодоповнення при введенні\n\n' +
        '💡 Розвідка шукає по всіх полях книги', { parse_mode: 'HTML' });
});
searchScene.action('search_back', async (ctx) => {
    await ctx.answerCbQuery('⚔️ Повернення на базу');
    await ctx.scene?.leave();
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('🗡️ Повернувся на базу! Обери наступну битву:', {
        reply_markup: getMainMenuKeyboard(),
    });
});
searchScene.action('search_ai', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'ai';
    await ctx.editMessageText('🤖 <b>AI РОЗВІДКА</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Розповідь AI Мудреці про яку легенду ти шукаєш:\n\n' +
        '💡 <b>ПРИКЛАДИ:</b>\n' +
        '⚔️ "Романтичні битви у древньому Києві"\n' +
        '🗡️ "Детективи з крутою розв\'язкою"\n' +
        '📚 "Щось легке для відпочинку увечері"\n' +
        '📖 "Легенди як у Толкіена"', { parse_mode: 'HTML' });
});
exports.default = searchScene;
//# sourceMappingURL=searchScene.js.map