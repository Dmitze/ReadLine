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
exports.displayBookList = displayBookList;
exports.displaySingleBook = displaySingleBook;
exports.displayNoBooks = displayNoBooks;
exports.displayTopBooks = displayTopBooks;
exports.displayNewBooks = displayNewBooks;
exports.displaySavedBooks = displaySavedBooks;
exports.displaySearchResults = displaySearchResults;
const helpers_1 = require("./helpers");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const constants_1 = require("../constants");
const helpers_2 = require("./helpers");
const logger_1 = require("./logger");
function truncateInlineLabel(text, max = 50) {
    if (text.length <= max)
        return text;
    return `${text.slice(0, max - 1)}…`;
}
async function displayBookList(ctx, books, options = {}) {
    const { title, subtitle, isSaved = false, showIndex = false, indexPrefix = '' } = options;
    try {
        if (title) {
            let headerText = `<b>${title}</b>`;
            if (subtitle) {
                headerText += `\n\n${subtitle}`;
            }
            await ctx.reply(headerText, { parse_mode: 'HTML' });
        }
        for (const [index, book] of books.entries()) {
            await displaySingleBook(ctx, book, {
                isSaved,
                index: showIndex ? index + 1 : undefined,
                indexPrefix,
            });
        }
        logger_1.logger.debug('Displayed book list', {
            count: books.length,
            title,
        });
    }
    catch (error) {
        logger_1.logger.error('Error displaying book list', error, {
            booksCount: books.length,
            title,
        });
        throw error;
    }
}
async function displaySingleBook(ctx, book, options = {}) {
    const { isSaved = false, index, indexPrefix = '', tags } = options;
    try {
        let caption = '';
        if (index !== undefined) {
            caption = `${indexPrefix}#${index}\n\n`;
        }
        caption += await (0, helpers_1.formatBookCaption)(book, tags);
        const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
        if (book.photo_file_id && book.photo_file_id !== constants_1.CONFIG.DEFAULT_BOOK_COVER) {
            await ctx.replyWithPhoto(book.photo_file_id, {
                caption,
                parse_mode: 'HTML',
                reply_markup: keyboard,
            });
        }
        else {
            await ctx.reply(caption, {
                parse_mode: 'HTML',
                reply_markup: keyboard,
            });
        }
        logger_1.logger.debug('Displayed single book', {
            bookId: book.id,
            title: book.title,
        });
    }
    catch (error) {
        logger_1.logger.error('Error displaying single book', error, {
            bookId: book.id,
            title: book.title,
        });
        throw error;
    }
}
async function displayNoBooks(ctx, message = '📭 Книг не знайдено.') {
    await ctx.reply(message);
    logger_1.logger.debug('Displayed no books message', { message });
}
async function displayTopBooks(ctx, books, limit = constants_1.CONFIG.MAX_TOP_BOOKS) {
    if (books.length === 0) {
        await displayNoBooks(ctx, constants_1.UX.emptyTop);
        return;
    }
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    const limitedBooks = books.slice(0, limit);
    const keyboard = limitedBooks.map((book, index) => [
        Markup.button.callback(truncateInlineLabel(`${index + 1}. ⭐${book.rating?.toFixed(1) ?? '—'} · ${book.title}`), `view_book_${book.id}`),
    ]);
    keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);
    const header = `🏆 <b>${constants_1.UX.topListTitle}</b>\n` +
        `<i>${limitedBooks.length} із ${books.length} · ${constants_1.UX.listOpenCardHint}</i>`;
    await ctx.reply(header, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
}
async function displayNewBooks(ctx, books, limit = constants_1.CONFIG.MAX_NEW_BOOKS) {
    if (books.length === 0) {
        await displayNoBooks(ctx, constants_1.UX.emptyNew);
        return;
    }
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    const limitedBooks = books.slice(0, limit);
    const keyboard = limitedBooks.map((book, index) => [
        Markup.button.callback(truncateInlineLabel(`${index + 1}. 📖 ${book.title} · ${book.author}`), `view_book_${book.id}`),
    ]);
    keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);
    const noun = limitedBooks.length === 1 ? 'книга' : limitedBooks.length < 5 ? 'книги' : 'книг';
    const header = `🆕 <b>${constants_1.UX.newListTitle}</b>\n` +
        `<i>Останні ${limitedBooks.length} ${noun} · ${constants_1.UX.listOpenCardHint}</i>`;
    await ctx.reply(header, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
}
async function displaySavedBooks(ctx, books) {
    if (books.length === 0) {
        await ctx.reply(constants_1.UX.emptyLibraryHtml, { parse_mode: 'HTML' });
        return;
    }
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    const shown = books.slice(0, constants_1.CONFIG.MAX_SAVED_BOOKS_DISPLAY);
    const keyboard = shown.map((book, index) => [
        Markup.button.callback(truncateInlineLabel(`${index + 1}. ${book.title} · ${book.author}`), `view_saved_book_${book.id}`),
    ]);
    keyboard.push([Markup.button.callback('🏠 На головну', 'home')]);
    const extra = books.length > constants_1.CONFIG.MAX_SAVED_BOOKS_DISPLAY
        ? `\n\n<i>Показано ${constants_1.CONFIG.MAX_SAVED_BOOKS_DISPLAY} з ${books.length}. Решту знайдіть через пошук.</i>`
        : '';
    const noun = books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг';
    const header = `💾 <b>${constants_1.UX.savedListTitle}</b>\n` +
        `<i>${books.length} ${noun} · ${constants_1.UX.listOpenCardHint}</i>${extra}`;
    await ctx.reply(header, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
}
async function displaySearchResults(ctx, books, searchTerm) {
    if (books.length === 0) {
        await ctx.reply(constants_1.UX.searchEmptyHtml((0, helpers_2.escapeHtml)(searchTerm)), { parse_mode: 'HTML' });
        return;
    }
    const resultsText = books.length === constants_1.CONFIG.MAX_SEARCH_RESULTS
        ? `Показано перші ${books.length} результатів`
        : `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}`;
    await displayBookList(ctx, books, {
        title: '🔍 РЕЗУЛЬТАТИ ПОШУКУ',
        subtitle: `Запит: "${searchTerm}"\n${resultsText}`,
    });
}
//# sourceMappingURL=bookDisplay.js.map