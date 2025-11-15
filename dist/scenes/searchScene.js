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
const helpers_1 = require("../utils/helpers");
const SEARCH_LIMIT = 10;
const searchScene = new telegraf_1.Scenes.BaseScene('SEARCH_SCENE');
searchScene.enter(async (ctx) => {
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    await ctx.reply('🔍 <b>Розширений пошук книг</b>\n\n' +
        'Оберіть тип пошуку або введіть запит:', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
            [
                { text: '📖 За назвою', callback_data: 'search_by_title' },
                { text: '👤 За автором', callback_data: 'search_by_author' }
            ],
            [
                { text: '📚 За жанром', callback_data: 'search_by_genre' },
                { text: '🔍 Загальний пошук', callback_data: 'search_general' }
            ],
            [
                { text: '🤖 Розумний пошук (AI)', callback_data: 'search_ai' }
            ],
            [{ text: '⬅️ Назад', callback_data: 'search_back' }]
        ]).reply_markup
    });
});
searchScene.action('search_by_title', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'title';
    await ctx.editMessageText('📖 <b>Пошук за назвою</b>\n\n' +
        'Введіть назву книги:\n\n' +
        '💡 <i>Приклад:</i> Кобзар', { parse_mode: 'HTML' });
});
searchScene.action('search_by_author', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'author';
    await ctx.editMessageText('👤 <b>Пошук за автором</b>\n\n' +
        'Введіть ім\'я автора:\n\n' +
        '💡 <i>Приклад:</i> Шевченко', { parse_mode: 'HTML' });
});
searchScene.action('search_by_genre', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'genre';
    await ctx.editMessageText('📚 <b>Пошук за жанром</b>\n\n' +
        'Введіть жанр:\n\n' +
        '💡 <i>Приклад:</i> Історична', { parse_mode: 'HTML' });
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
        reply_markup: getMainMenuKeyboard()
    });
});
searchScene.on('text', async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст для пошуку.');
        return ctx.scene?.leave();
    }
    const searchTerm = ctx.message.text.trim();
    const searchType = ctx.scene.state?.searchType || 'general';
    if (searchTerm === '⬅️ Назад до меню') {
        const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
        await ctx.reply('👋 Повертаємось до головного меню', {
            reply_markup: getMainMenuKeyboard()
        });
        return ctx.scene?.leave();
    }
    const { CONFIG } = await Promise.resolve().then(() => __importStar(require('../constants')));
    if (searchTerm.length < CONFIG.MIN_SEARCH_LENGTH) {
        await ctx.reply(`❌ Пошуковий запит занадто короткий. Введіть мінімум ${CONFIG.MIN_SEARCH_LENGTH} символи.`);
        return;
    }
    if (searchTerm.length > CONFIG.MAX_SEARCH_LENGTH) {
        await ctx.reply(`❌ Пошуковий запит занадто довгий. Максимум ${CONFIG.MAX_SEARCH_LENGTH} символів.\n\n` +
            'Спробуйте скоротити запит або використати ключові слова.');
        return;
    }
    logger_1.logger.info('Search request', { searchTerm, userId: ctx.from?.id, searchType });
    if (searchType === 'ai') {
        await ctx.reply('🤖 Аналізую ваш запит та шукаю книги...');
        const userId = ctx.from?.id;
        const { naturalLanguageSearch } = await Promise.resolve().then(() => __importStar(require('../utils/aiHelper')));
        const { db } = await Promise.resolve().then(() => __importStar(require('../database/models')));
        const { CONFIG } = await Promise.resolve().then(() => __importStar(require('../constants')));
        const allBooks = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM books WHERE is_available = 1 ORDER BY rating DESC, downloads_count DESC LIMIT ${CONFIG.AI_MAX_BOOKS}`, [], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows || []);
            });
        });
        if (allBooks.length === 0) {
            await ctx.reply('📭 На жаль, в бібліотеці поки немає книг');
            return ctx.scene?.leave();
        }
        if (allBooks.length === CONFIG.AI_MAX_BOOKS) {
            await ctx.reply(`⚠️ Пошук обмежено першими ${CONFIG.AI_MAX_BOOKS} найпопулярніших книг для швидкості`);
        }
        const books = await naturalLanguageSearch(searchTerm, allBooks, userId);
        if (books.length === 0) {
            await ctx.reply('😔 Не знайдено книг за вашим запитом.\n\n' +
                'Спробуйте:\n' +
                '• Описати інакше\n' +
                '• Використати інші ключові слова\n' +
                '• Звичайний пошук');
            return ctx.scene?.leave();
        }
        await ctx.reply(`✨ *AI знайшов ${books.length} ${books.length === 1 ? 'книгу' : books.length < 5 ? 'книги' : 'книг'}*\n\n` +
            `Запит: "${searchTerm}"`, { parse_mode: 'Markdown' });
        const { isBookSaved } = await Promise.resolve().then(() => __importStar(require('../database/models')));
        for (const book of books) {
            const isSaved = userId ? await isBookSaved(userId, book.id) : false;
            const caption = `📖 *${book.title}*${(0, helpers_1.getBookIdText)(book.id).replace(/\n/g, '\n')}\n` +
                `👤 ${book.author}\n` +
                `📚 ${book.genre}\n\n` +
                `${book.description?.substring(0, 150) || 'Немає опису'}...`;
            if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                await ctx.replyWithPhoto(book.photo_file_id, {
                    caption,
                    parse_mode: 'Markdown',
                    reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                }).catch(async () => {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                    });
                });
            }
            else {
                await ctx.reply(caption, {
                    parse_mode: 'Markdown',
                    reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                });
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        logger_1.logger.userAction(ctx.from?.id || 0, 'ai_search', { query: searchTerm, booksFound: books.length });
        return ctx.scene?.leave();
    }
    let books = [];
    let searchTypeText = '';
    books = await (0, models_1.searchBooks)(searchTerm, SEARCH_LIMIT);
    switch (searchType) {
        case 'title':
            searchTypeText = '📖 за назвою';
            break;
        case 'author':
            searchTypeText = '👤 за автором';
            break;
        case 'genre':
            searchTypeText = '📚 за жанром';
            break;
        default:
            searchTypeText = '🔍 загальний';
    }
    logger_1.logger.info('Search results', { booksFound: books.length });
    if (books.length === 0) {
        const noResultsMessage = '📭 <b>За вашим запитом нічого не знайдено</b>\n\n' +
            `Пошуковий запит: "${searchTerm}"\n\n` +
            '<b>🔍 Спробуйте:</b>\n' +
            '• Перевірити правопис\n' +
            '• Використати менш конкретні слова\n' +
            '• Скористатися каталогом за жанрами\n' +
            '• Спробувати інший пошук';
        await ctx.reply(noResultsMessage, { parse_mode: 'HTML' });
        return ctx.scene?.leave();
    }
    const resultsMessage = `<b>🔍 Результати пошуку ${searchTypeText}</b>\n\n` +
        `Знайдено: ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}\n` +
        `Запит: "${searchTerm}"`;
    await ctx.reply(resultsMessage, { parse_mode: 'HTML' });
    const { isBookSaved } = await Promise.resolve().then(() => __importStar(require('../database/models')));
    const userId = ctx.from?.id;
    for (const book of books) {
        const isSaved = userId ? await isBookSaved(userId, book.id) : false;
        const caption = `📖 <b>${book.title}</b>${(0, helpers_1.getBookIdText)(book.id)}\n👤 Автор: ${book.author}\n📚 Жанр: ${book.genre}\n📝 ${book.description?.substring(0, 100) || 'Немає опису'}...`;
        if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
            await ctx.replyWithPhoto(book.photo_file_id, {
                caption,
                parse_mode: 'HTML',
                reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
            }).catch(async () => {
                await ctx.reply(caption, {
                    parse_mode: 'HTML',
                    reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                });
            });
        }
        else {
            await ctx.reply(caption, {
                parse_mode: 'HTML',
                reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
            });
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    if (books.length === SEARCH_LIMIT) {
        await ctx.reply(`ℹ️ Показано перші ${SEARCH_LIMIT} результатів.\n` +
            `Уточніть пошуковий запит для більш точних результатів.`);
    }
    logger_1.logger.userAction(ctx.from?.id || 0, 'search_completed', {
        searchTerm,
        searchType,
        resultsCount: books.length
    });
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('🔍 Пошук завершено', {
        reply_markup: getMainMenuKeyboard()
    });
    return ctx.scene?.leave();
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