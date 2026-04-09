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
const models_1 = require("../database/models");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const logger_1 = require("../utils/logger");
const aiHelper_1 = require("../utils/aiHelper");
const searchScene = new telegraf_1.Scenes.BaseScene('SEARCH_SCENE');
searchScene.enter(async (ctx) => {
    ctx.scene.state.searchType = null;
    await showSearchTypeMenu(ctx, false);
});
const SEARCH_TYPE_PROMPTS = {
    title: '📖 <b>ПОШУК ЗА НАЗВОЮ</b>\n\nВведіть назву книги:\n\n💡 Приклад: <i>Кобзар</i>',
    author: '👤 <b>ПОШУК ЗА АВТОРОМ</b>\n\nВведіть ім\'я автора:\n\n💡 Приклад: <i>Шевченко</i>',
    genre: '📚 <b>ПОШУК ЗА ЖАНРОМ</b>\n\nВведіть жанр:\n\n💡 Приклад: <i>Фантастика</i>',
    general: '🔍 <b>ЗАГАЛЬНИЙ ПОШУК</b>\n\nВведіть будь-яке слово (назву, автора, жанр):\n\n💡 Знаходить навіть з помилками: "Кобзарь" → "Кобзар"',
    ai: '🤖 <b>РОЗУМНИЙ ПОШУК (AI)</b>\n\nОпишіть що ви шукаєте:\n\n💡 Приклади:\n• "Романтична книга про море"\n• "Детектив з крутою розв\'язкою"\n• "Щось легке для читання перед сном"',
};
const backToSearchTypeKeyboard = telegraf_1.Markup.inlineKeyboard([
    [{ text: '⬅️ Змінити тип пошуку', callback_data: 'search_choose_type' }],
]).reply_markup;
async function showSearchTypeMenu(ctx, edit = false) {
    const text = '🔍 <b>Розширений пошук книг</b>\n\nОберіть тип пошуку:';
    const keyboard = telegraf_1.Markup.inlineKeyboard([
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
    ]).reply_markup;
    if (edit) {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    else {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
}
for (const type of ['search_by_title', 'search_by_author', 'search_by_genre', 'search_general', 'search_ai']) {
    searchScene.action(type, async (ctx) => {
        await ctx.answerCbQuery();
        const key = type.replace('search_by_', '').replace('search_', '');
        ctx.scene.state.searchType = key === 'general' ? 'general' : key === 'ai' ? 'ai' : key;
        await ctx.editMessageText(SEARCH_TYPE_PROMPTS[key] ?? SEARCH_TYPE_PROMPTS['general'], {
            parse_mode: 'HTML',
            reply_markup: backToSearchTypeKeyboard,
        });
    });
}
searchScene.action('search_choose_type', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = null;
    await showSearchTypeMenu(ctx, true);
});
searchScene.action('search_back', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene?.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('🏠 Повернувся до головного меню:', {
        reply_markup: getMainMenuKeyboard(),
    });
});
searchScene.on('text', async (ctx) => {
    const searchType = ctx.scene.state.searchType;
    const query = ctx.message.text.trim();
    if (!searchType) {
        await ctx.reply('⚠️ Спочатку оберіть тип пошуку кнопками вище.', { parse_mode: 'HTML' });
        return;
    }
    if (query.length < 2) {
        await ctx.reply('⚠️ Запит занадто короткий. Введіть мінімум 2 символи.');
        return;
    }
    const thinkingMsg = await ctx.reply('🔍 Шукаю...');
    try {
        if (searchType === 'ai') {
            const { isAIEnabled } = await Promise.resolve().then(() => __importStar(require('../utils/aiHelper')));
            if (!isAIEnabled()) {
                await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => { });
                await ctx.reply('❌ AI недоступний. Спробуйте загальний пошук.');
                return;
            }
            const prompt = `У нас є бібліотека книг. Користувач шукає: "${query}".\n` +
                `Визнач 3-5 коротких ключових слів (тільки назви книг або імена авторів або один жанр) для пошуку в базі даних SQLite. ` +
                `Відповідай ТІЛЬКИ списком через кому, без пояснень, без лапок. Наприклад: Козачка, Марко Вовчок, Фантастика`;
            const keywords = await (0, aiHelper_1.askAI)(prompt, ctx.from?.id);
            await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => { });
            const keywordList = [
                query,
                ...keywords.split(',').map((k) => k.trim()).filter(Boolean),
            ].slice(0, 5);
            const seenIds = new Set();
            const foundBooks = [];
            for (const kw of keywordList) {
                if (kw.length < 2)
                    continue;
                const results = await (0, models_1.searchBooks)(kw, 5);
                for (const b of results) {
                    if (!seenIds.has(b.id)) {
                        seenIds.add(b.id);
                        foundBooks.push(b);
                    }
                }
                if (foundBooks.length >= 5)
                    break;
            }
            if (foundBooks.length === 0) {
                await ctx.reply(`🤖 AI шукав за: <i>${keywordList.join(', ')}</i>\n\n😔 Нічого не знайдено в бібліотеці.\n\nСпробуйте загальний пошук.`, {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [{ text: '🔍 Загальний пошук', callback_data: 'search_general' }],
                        [{ text: '⬅️ Змінити тип пошуку', callback_data: 'search_choose_type' }],
                    ]).reply_markup,
                });
                return;
            }
            await ctx.reply(`🤖 AI знайшов <b>${foundBooks.length}</b> ${foundBooks.length === 1 ? 'книгу' : 'книги'} за запитом "<i>${query}</i>":`, { parse_mode: 'HTML' });
            for (const book of foundBooks.slice(0, 5)) {
                const { formatBookCaption } = await Promise.resolve().then(() => __importStar(require('../utils/helpers')));
                const { isBookSaved } = await Promise.resolve().then(() => __importStar(require('../database/models')));
                const caption = await formatBookCaption(book);
                const isSaved = ctx.from?.id ? await isBookSaved(ctx.from.id, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, { caption, parse_mode: 'HTML', reply_markup: keyboard });
                }
                else {
                    await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard });
                }
            }
            await ctx.reply('🔍 Шукати ще?', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [{ text: '🔍 Новий пошук', callback_data: 'search_new' }],
                    [{ text: '⬅️ Назад до меню', callback_data: 'search_back' }],
                ]).reply_markup,
            });
            return;
        }
        let books;
        if (searchType === 'genre') {
            books = await (0, models_1.getBooksByGenre)(query);
        }
        else if (searchType === 'title') {
            const { searchBooksByField } = await Promise.resolve().then(() => __importStar(require('../database/tables/books')));
            books = await searchBooksByField('title', query, 10);
        }
        else if (searchType === 'author') {
            const { searchBooksByField } = await Promise.resolve().then(() => __importStar(require('../database/tables/books')));
            books = await searchBooksByField('author', query, 10);
        }
        else {
            books = await (0, models_1.searchBooks)(query, 10);
        }
        await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => { });
        if (!books || books.length === 0) {
            await ctx.reply(`😔 <b>Нічого не знайдено</b> за запитом "<i>${query}</i>"\n\n` +
                'Спробуйте інший запит або загальний пошук.', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [{ text: '🔍 Новий пошук', callback_data: 'search_new' }],
                    [{ text: '⬅️ Назад', callback_data: 'search_back' }],
                ]).reply_markup,
            });
            return;
        }
        await ctx.reply(`✅ <b>Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}</b> за запитом "<i>${query}</i>":`, { parse_mode: 'HTML' });
        for (const book of books.slice(0, 5)) {
            const { formatBookCaption } = await Promise.resolve().then(() => __importStar(require('../utils/helpers')));
            const { isBookSaved } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            const caption = await formatBookCaption(book);
            const isSaved = ctx.from?.id ? await isBookSaved(ctx.from.id, book.id) : false;
            const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
            if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                await ctx.replyWithPhoto(book.photo_file_id, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                });
            }
            else {
                await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard });
            }
        }
        if (books.length > 5) {
            await ctx.reply(`📚 Показано 5 з ${books.length}. Уточніть запит для кращих результатів.`);
        }
        await ctx.reply('🔍 Шукати ще?', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [{ text: '🔍 Новий пошук', callback_data: 'search_new' }],
                [{ text: '⬅️ Назад до меню', callback_data: 'search_back' }],
            ]).reply_markup,
        });
        logger_1.logger.userAction(ctx.from?.id || 0, 'search', { query, type: searchType, results: books.length });
    }
    catch (error) {
        await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id).catch(() => { });
        logger_1.logger.error('Search error', error instanceof Error ? error : new Error(String(error)));
        await ctx.reply('❌ Помилка пошуку. Спробуйте ще раз.');
    }
});
searchScene.action('search_new', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = null;
    await showSearchTypeMenu(ctx, false);
});
exports.default = searchScene;
//# sourceMappingURL=searchScene.js.map