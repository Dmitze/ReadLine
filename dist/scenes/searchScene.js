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
const searchFunctions_1 = require("../database/searchFunctions");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const logger_1 = require("../utils/logger");
const searchScene = new telegraf_1.Scenes.BaseScene('SEARCH_SCENE');
searchScene.enter(async (ctx) => {
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    await ctx.reply('🔍 *Розширений пошук книг*\n\n' +
        'Оберіть тип пошуку або введіть запит:', {
        parse_mode: 'Markdown',
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
    await ctx.editMessageText('📖 *Пошук за назвою*\n\n' +
        'Введіть назву книги:\n\n' +
        '💡 *Приклад:* Кобзар', { parse_mode: 'Markdown' });
});
searchScene.action('search_by_author', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'author';
    await ctx.editMessageText('👤 *Пошук за автором*\n\n' +
        'Введіть ім\'я автора:\n\n' +
        '💡 *Приклад:* Шевченко', { parse_mode: 'Markdown' });
});
searchScene.action('search_by_genre', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'genre';
    await ctx.editMessageText('📚 *Пошук за жанром*\n\n' +
        'Введіть жанр:\n\n' +
        '💡 *Приклад:* Історична', { parse_mode: 'Markdown' });
});
searchScene.action('search_general', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.state.searchType = 'general';
    await ctx.editMessageText('🔍 *Розумний пошук*\n\n' +
        'Введіть будь-який запит (назва, автор, жанр):\n\n' +
        '✨ *Можливості:*\n' +
        '• Пошук з помилками: "Кобзарь" → "Кобзар"\n' +
        '• Синоніми: "Sci-Fi" → "Фантастика"\n' +
        '• Автодоповнення при введенні\n\n' +
        '💡 Пошук буде виконано по всіх полях', { parse_mode: 'Markdown' });
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
    if (searchTerm.length < 2) {
        await ctx.reply('❌ Пошуковий запит занадто короткий. Введіть мінімум 2 символи.');
        return;
    }
    try {
        console.log('🔍 Search request:', searchTerm, 'from user:', ctx.from?.id, 'type:', searchType);
        if (searchType === 'ai') {
            await ctx.reply('🤖 Аналізую ваш запит та шукаю книги...');
            try {
                const { naturalLanguageSearch } = await Promise.resolve().then(() => __importStar(require('../utils/aiHelper')));
                const { getAllAvailableBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
                const allBooks = await getAllAvailableBooks();
                if (allBooks.length === 0) {
                    await ctx.reply('📭 На жаль, в бібліотеці поки немає книг');
                    return ctx.scene?.leave();
                }
                const books = await naturalLanguageSearch(searchTerm, allBooks);
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
                const userId = ctx.from?.id;
                for (const book of books) {
                    const isSaved = userId ? await isBookSaved(userId, book.id) : false;
                    const caption = `📖 *${book.title}*\n` +
                        `👤 ${book.author}\n` +
                        `📚 ${book.genre}\n\n` +
                        `${book.description?.substring(0, 150) || 'Немає опису'}...`;
                    if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                        try {
                            await ctx.replyWithPhoto(book.photo_file_id, {
                                caption,
                                parse_mode: 'Markdown',
                                reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                            });
                        }
                        catch (error) {
                            await ctx.reply(caption, {
                                parse_mode: 'Markdown',
                                reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                            });
                        }
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
            }
            catch (error) {
                logger_1.logger.error('Error in AI search', error instanceof Error ? error : new Error(String(error)));
                await ctx.reply('❌ Виникла помилка при AI пошуку. Спробуйте звичайний пошук.');
            }
            return ctx.scene?.leave();
        }
        const SEARCH_LIMIT = 10;
        let searchResult;
        let books = [];
        let suggestions = [];
        let hasAiRecommendations = false;
        let searchTypeText = '';
        let aiMessage = '';
        switch (searchType) {
            case 'title':
                books = await (0, searchFunctions_1.searchBooksByTitle)(searchTerm, SEARCH_LIMIT);
                suggestions = await (0, searchFunctions_1.getSearchSuggestions)(searchTerm, 3);
                searchTypeText = '📖 за назвою';
                break;
            case 'author':
                books = await (0, searchFunctions_1.searchBooksByAuthor)(searchTerm, SEARCH_LIMIT);
                suggestions = await (0, searchFunctions_1.getSearchSuggestions)(searchTerm, 3);
                searchTypeText = '👤 за автором';
                break;
            case 'genre':
                books = await (0, searchFunctions_1.searchBooksByGenre)(searchTerm, SEARCH_LIMIT);
                suggestions = await (0, searchFunctions_1.getSearchSuggestions)(searchTerm, 3);
                searchTypeText = '📚 за жанром';
                break;
            default:
                searchResult = await (0, searchFunctions_1.enhancedSearch)(searchTerm, SEARCH_LIMIT, ctx.from?.id);
                books = searchResult.books;
                suggestions = searchResult.suggestions;
                hasAiRecommendations = searchResult.hasAiRecommendations;
                aiMessage = searchResult.aiMessage || '';
                searchTypeText = `🤖 розумний (${searchResult.searchStrategy})`;
        }
        console.log('📚 Search results:', books.length, 'books found');
        if (books.length === 0) {
            let noResultsMessage = '📭 *За вашим запитом нічого не знайдено*\n\n' +
                `Пошуковий запит: "${searchTerm}"\n\n`;
            if (suggestions.length > 0) {
                noResultsMessage += '💡 *Можливо, ви мали на увазі:*\n';
                suggestions.slice(0, 5).forEach((suggestion, i) => {
                    noResultsMessage += `${i + 1}. ${suggestion}\n`;
                });
                noResultsMessage += '\n';
            }
            noResultsMessage += '🔍 *Спробуйте:*\n' +
                '• Перевірити правопис\n' +
                '• Використати менш конкретні слова\n' +
                '• Скористатися каталогом за жанрами\n' +
                '• Спробувати пошук за автором\n\n' +
                '🤖 *Розумні підказки:*\n' +
                '• "Любовний" → "Романтика"\n' +
                '• "Sci-Fi" → "Фантастика"\n' +
                '• "Детектив" → "Кримінал"\n' +
                '• "Історичний" → "Історія"';
            await ctx.reply(noResultsMessage, { parse_mode: 'Markdown' });
            try {
                const aiRecommendations = await (0, searchFunctions_1.enhancedSearch)('популярні книги', 3, ctx.from?.id);
                if (aiRecommendations.books.length > 0) {
                    await ctx.reply('🤖 *AI рекомендує популярні книги:*', { parse_mode: 'Markdown' });
                    for (const book of aiRecommendations.books) {
                        const caption = `📖 *${book.title}*\n👤 ${book.author}\n📚 ${book.genre}\n⭐ ${book.rating || 'Немає рейтингу'}`;
                        if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                            try {
                                await ctx.replyWithPhoto(book.photo_file_id, {
                                    caption,
                                    parse_mode: 'Markdown',
                                    reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, false)
                                });
                            }
                            catch (error) {
                                await ctx.reply(caption, {
                                    parse_mode: 'Markdown',
                                    reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, false)
                                });
                            }
                        }
                        else {
                            await ctx.reply(caption, {
                                parse_mode: 'Markdown',
                                reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, false)
                            });
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error getting AI recommendations:', error);
            }
            return ctx.scene?.leave();
        }
        let resultsMessage = `🔍 *Результати пошуку ${searchTypeText}*\n\n`;
        if (aiMessage) {
            resultsMessage += `${aiMessage}\n\n`;
        }
        resultsMessage += `Знайдено: ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}\n` +
            `Запит: "${searchTerm}"`;
        if (hasAiRecommendations) {
            resultsMessage += '\n\n🤖 *Включено AI-рекомендації на основі схожих книг*';
        }
        if (suggestions.length > 0 && books.length < 8) {
            resultsMessage += '\n\n💡 *Схожі запити:* ' + suggestions.slice(0, 4).join(', ');
        }
        if (searchResult && searchResult.searchStrategy) {
            const strategyNames = {
                'exact': 'точний збіг',
                'partial': 'часткове співпадіння',
                'semantic': 'семантичний пошук',
                'fuzzy': 'нечіткий пошук',
                'ai_recommendations': 'AI-рекомендації'
            };
            const strategyName = strategyNames[searchResult.searchStrategy] || searchResult.searchStrategy;
            resultsMessage += `\n\n🎯 *Стратегія:* ${strategyName}`;
        }
        await ctx.reply(resultsMessage, { parse_mode: 'Markdown' });
        const { isBookSaved } = await Promise.resolve().then(() => __importStar(require('../database/models')));
        const userId = ctx.from?.id;
        for (const book of books) {
            const isSaved = userId ? await isBookSaved(userId, book.id) : false;
            const caption = `📖 *${book.title}*\n👤 Автор: ${book.author}\n📚 Жанр: ${book.genre}\n📝 ${book.description?.substring(0, 100) || 'Немає опису'}...`;
            if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
                try {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                    });
                }
                catch (error) {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                    });
                }
            }
            else {
                await ctx.reply(caption, {
                    parse_mode: 'Markdown',
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
    }
    catch (error) {
        console.error('❌ Search error:', error);
        logger_1.logger.error('Error searching books', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id, searchTerm });
        await ctx.reply('❌ Виникла помилка при пошуку книг. Спробуйте ще раз.');
    }
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