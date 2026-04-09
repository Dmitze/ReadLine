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
exports.registerBookActionHandlers = registerBookActionHandlers;
const logger_1 = require("../../utils/logger");
const constants_1 = require("../../constants");
const models_1 = require("../../database/models");
const mainKeyboards_1 = require("../../keyboards/mainKeyboards");
const helpers_1 = require("../../utils/helpers");
const constants_2 = require("../../constants");
function registerBookActionHandlers(bot) {
    bot.action(/save_(\d+)/, async (ctx) => {
        const { retryOperation, sendErrorToUser } = await Promise.resolve().then(() => __importStar(require('../../utils/errorHandler')));
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            const bookId = parseInt(match[1], 10);
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача');
                return;
            }
            await retryOperation(async () => {
                const isSaved = await (0, models_1.isBookSaved)(userId, bookId);
                if (isSaved) {
                    await (0, models_1.unsaveBook)(userId, bookId);
                    await ctx.answerCbQuery('💔 Видалено зі збережених', { show_alert: false });
                }
                else {
                    await (0, models_1.saveBook)(userId, bookId);
                    const book = await (0, models_1.getBookById)(bookId);
                    if (book && book.genre) {
                        const { getUserFavoriteGenres, updateUserFavoriteGenres } = await Promise.resolve().then(() => __importStar(require('../../database/userFunctions')));
                        const currentGenres = await getUserFavoriteGenres(userId);
                        if (!currentGenres.includes(book.genre)) {
                            const updatedGenres = [...currentGenres, book.genre];
                            await updateUserFavoriteGenres(userId, updatedGenres);
                            logger_1.logger.info('Added genre to user favorites', { userId, genre: book.genre });
                        }
                    }
                    await ctx.answerCbQuery('❤️ Збережено!', { show_alert: false });
                }
            }, 2, constants_2.TIMEOUTS.MESSAGE_SEND_DELAY);
        })().catch((error) => {
            logger_1.logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)), {
                userId: ctx.from?.id,
            });
            sendErrorToUser(ctx, error, '❌ Помилка при збереженні. Спробуйте ще раз.');
        });
        return;
    });
    bot.action(/view_saved_book_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            const bookId = parseInt(match[1], 10);
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача');
                return;
            }
            await ctx.answerCbQuery('📚 Розгортаю скиток...');
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.reply('❌ Легенду не знайдено в архівах');
                return;
            }
            const caption = await (0, helpers_1.formatBookCaption)(book);
            const isSaved = await (0, models_1.isBookSaved)(userId, bookId);
            const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
            if (book.photo_file_id &&
                book.photo_file_id !== 'default_book_cover' &&
                book.photo_file_id.length > constants_2.LIMITS.FILE_ID_MIN) {
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
            logger_1.logger.userAction(userId, 'view_saved_book', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error viewing saved book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.GENERIC);
        });
        return;
    });
    bot.action(/view_book_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            const bookId = parseInt(match[1], 10);
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача');
                return;
            }
            await ctx.answerCbQuery('📖 Викликаю скарб...');
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.reply('❌ Скарб потеряно в тумані часу...');
                return;
            }
            const caption = await (0, helpers_1.formatBookCaption)(book);
            const isSaved = await (0, models_1.isBookSaved)(userId, bookId);
            const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
            if (book.photo_file_id &&
                book.photo_file_id !== 'default_book_cover' &&
                book.photo_file_id.length > constants_2.LIMITS.FILE_ID_MIN) {
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
            logger_1.logger.userAction(userId, 'view_book', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error viewing book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.GENERIC);
        });
        return;
    });
    bot.action(/download_pdf_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            const bookId = parseInt(match[1], 10);
            logger_1.logger.info('PDF download requested', {
                userId: ctx.from?.id,
                bookId,
            });
            await ctx.answerCbQuery('📜 Скопіюю величезне письмо...');
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                logger_1.logger.warn('Book not found for download', { bookId });
                await ctx.reply('❌ Письмо загубилось в архівах...');
                return;
            }
            logger_1.logger.info('Book file availability', {
                bookId,
                title: book.title,
                hasPdfFileId: !!book.pdf_file_id,
                hasFileUrl: !!book.file_url,
                pdfFileId: book.pdf_file_id ? 'present' : 'missing',
                fileUrl: book.file_url ? 'present' : 'missing',
            });
            if (!book.pdf_file_id && !book.file_url) {
                logger_1.logger.warn('No PDF file available', { bookId, title: book.title });
                await ctx.reply(`❌ Рукопис легенди "${book.title}" заховано надійно.\n\n` +
                    '⚔️ Зверни наCommandIra для розкриття таємниці.');
                return;
            }
            await (0, models_1.incrementDownloads)(bookId);
            try {
                const telegramFileId = book.pdf_file_id || book.file_url;
                logger_1.logger.info('PDF download attempt', {
                    bookId,
                    hasTelegramFileId: !!telegramFileId,
                    fileIdStart: telegramFileId ? telegramFileId.substring(0, 10) : 'none',
                    isValidTelegramId: telegramFileId ? /^[A-Za-z0-9_-]+$/.test(telegramFileId) : false,
                });
                if (telegramFileId && /^[A-Za-z0-9_-]+$/.test(telegramFileId)) {
                    logger_1.logger.info('Sending PDF via Telegram file_id', {
                        bookId,
                        fileIdLength: telegramFileId.length,
                    });
                    await ctx.replyWithDocument(telegramFileId, {
                        caption: `📄 ${book.title} - ${book.author}`,
                    });
                    logger_1.logger.info('PDF sent successfully', { bookId, userId: ctx.from?.id });
                }
                else if (book.file_url && (book.file_url.startsWith('http://') || book.file_url.startsWith('https://'))) {
                    logger_1.logger.info('Sending PDF via URL', { bookId, urlLength: book.file_url.length });
                    await ctx.reply(`📥 Посилання для завантаження PDF:\n\n${book.file_url}`, {
                        disable_web_page_preview: false,
                    });
                    logger_1.logger.info('PDF URL sent successfully', { bookId, userId: ctx.from?.id });
                }
                else {
                    logger_1.logger.warn('No valid PDF file ID or URL', {
                        bookId,
                        telegramFileId: telegramFileId ? 'present' : 'missing',
                        fileUrl: book.file_url ? 'present' : 'missing',
                    });
                }
            }
            catch (fileError) {
                logger_1.logger.error('Error sending PDF file', fileError instanceof Error ? fileError : new Error(String(fileError)), {
                    bookId,
                    title: book.title,
                    hasPdfFileId: !!book.pdf_file_id,
                    hasFileUrl: !!book.file_url,
                });
                if (book.file_url) {
                    await ctx.reply('📥 Письмо затримується магіцею Телеграму.\n\n' +
                        `🗡️ Спробай інший шлях:\n${book.file_url}`, {
                        disable_web_page_preview: false,
                    });
                }
                else {
                    await ctx.reply('❌ Письмо втекло із скарбниці.\n\n' +
                        '⚔️ Причини:\n' +
                        '• Час стер письмо\n' +
                        '• Письмо ще не прибуло\n\n' +
                        '📬 Повідомте Командиру через /feedback');
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'download_pdf', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error downloading PDF', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.DOWNLOAD_ERROR);
        });
        return;
    });
    bot.action(/download_epub_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            await ctx.answerCbQuery('📖 Готую портативну версію...');
            const bookId = parseInt(match[1], 10);
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.reply('❌ Легенду не знайдено');
                return;
            }
            if (!book.epub_file_id && !book.epub_url) {
                await ctx.reply('❌ Портативна версія не готова для цієї легенди');
                return;
            }
            await (0, models_1.incrementDownloads)(bookId);
            try {
                const telegramFileId = book.epub_file_id || book.epub_url;
                if (telegramFileId && telegramFileId.startsWith('BQAc')) {
                    await ctx.replyWithDocument(telegramFileId, {
                        caption: `📱 ${book.title} - ${book.author}`,
                    });
                }
                else if (book.epub_url && (book.epub_url.startsWith('http://') || book.epub_url.startsWith('https://'))) {
                    await ctx.reply(`📥 Посилання для завантаження EPUB:\n\n${book.epub_url}`, {
                        disable_web_page_preview: false,
                    });
                }
                else {
                    throw new Error('EPUB file not available');
                }
            }
            catch (fileError) {
                logger_1.logger.error('Error sending EPUB file', fileError instanceof Error ? fileError : new Error(String(fileError)));
                if (book.epub_url) {
                    await ctx.reply(`📥 Портативна версія затримується.\n\n🗡️ Альтернативний шлях:\n${book.epub_url}`, {
                        disable_web_page_preview: false,
                    });
                }
                else {
                    await ctx.reply('❌ Портативна версія втекла. Спробуй пізніше або повідомте Командиру.');
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'download_epub', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error downloading EPUB', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.DOWNLOAD_ERROR);
        });
        return;
    });
    bot.action(/download_audio_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            await ctx.answerCbQuery('🎧 Готую голосну розповідь...');
            const bookId = parseInt(match[1], 10);
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.reply('❌ Голос автора потерян в просторах');
                return;
            }
            if (!book.audio_file_id && !book.audio_external_link) {
                await ctx.reply('🎧 Голос цієї легенди ще мовчить...');
                return;
            }
            await (0, models_1.incrementDownloads)(bookId);
            if (book.audio_file_id) {
                await ctx.replyWithAudio(book.audio_file_id, {
                    caption: `🎧 ${book.title} - ${book.author}`,
                    performer: book.narrator || book.author,
                    title: book.title,
                });
            }
            else if (book.audio_external_link) {
                let message = '🎧 <b>ГОЛОСНА ЛЕГЕНДА</b>\n\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                message += `📖 ${book.title}\n`;
                message += `✍️ Скальд: ${book.author}\n`;
                if (book.narrator) {
                    message += `🎙️ Розповідач: ${book.narrator}\n`;
                }
                message += `\n🔗 Слухай твою легенду: ${book.audio_external_link}`;
                await ctx.reply(message, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: false,
                });
            }
            logger_1.logger.userAction(ctx.from.id, 'download_audio', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error downloading audio', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.DOWNLOAD_ERROR);
        });
        return;
    });
    bot.action(/reviews_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            await ctx.answerCbQuery('📊 Читаю думки воїнів...');
            const bookId = parseInt(match[1], 10);
            const allReviews = await (0, models_1.getBookReviews)(bookId);
            const reviews = allReviews.slice(0, 5);
            if (reviews.length === 0) {
                await ctx.reply('📭 Про цю легенду ще нікто не розповів. Будь першим реценцентом!');
                return;
            }
            let message = '📝 <b>РЕПОРТАЖІ ВОЇНІВ</b>\n\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            reviews.forEach((review, index) => {
                const stars = review.rating ? '⭐'.repeat(review.rating) : '';
                const userName = review.user_username
                    ? `@${review.user_username}`
                    : review.user_first_name || 'Читач';
                message += `${index + 1}. ${stars}\n`;
                message += `   ${review.comment || 'Без коментаря'}\n`;
                message += `   — ${userName}\n\n`;
            });
            await ctx.reply(message, { parse_mode: 'HTML' });
            logger_1.logger.userAction(ctx.from.id, 'view_reviews', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error showing reviews', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.REVIEW_ERROR);
        });
        return;
    });
    bot.action(/similar_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            await ctx.answerCbQuery('🔮 Розшукую союзників...');
            const bookId = parseInt(match[1], 10);
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.reply('❌ Легенда потеряна');
                return;
            }
            const { getBooksByGenre } = await Promise.resolve().then(() => __importStar(require('../../database/models')));
            const allSimilarBooks = await getBooksByGenre(book.genre);
            const filteredBooks = allSimilarBooks.filter((b) => b.id !== bookId).slice(0, 5);
            if (filteredBooks.length === 0) {
                await ctx.reply('🏜️ Союзників цього жанру ще не знайдено в архівах');
                return;
            }
            let message = `📚 <b>⚔️ СОЮЗНИКИ З БИТВИ (${book.genre})</b>\n\n` + '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            filteredBooks.forEach((b, index) => {
                message += `${index + 1}. <b>${b.title}</b> - ${b.author}\n`;
            });
            const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
            await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard(filteredBooks.map((b) => [Markup.button.callback(`📖 ${b.title}`, `view_book_${b.id}`)])).reply_markup,
            });
            logger_1.logger.userAction(ctx.from.id, 'view_similar_books', { bookId, genre: book.genre });
        })().catch((error) => {
            logger_1.logger.error('Error showing similar books', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.GENERIC);
        });
        return;
    });
    bot.action(/rate_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            await ctx.answerCbQuery('Відкриття сцени оцінки...');
            const bookId = parseInt(match[1], 10);
            ctx.session = ctx.session || {};
            ctx.session.bookToRate = bookId;
            await ctx.scene.enter('RATE_BOOK_SCENE', { bookId });
            logger_1.logger.userAction(ctx.from.id, 'start_rate_book', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error starting rate book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.GENERIC);
        });
        return;
    });
    bot.action(/order_book_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            const bookId = parseInt(match[1], 10);
            await ctx.answerCbQuery('📋 Відкриваємо форму замовлення...');
            await ctx.scene.enter('BOOK_ORDER_SCENE', { bookId });
            logger_1.logger.userAction(ctx.from.id, 'start_order_book', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error starting book order', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply(constants_1.ERRORS.GENERIC);
        });
        return;
    });
}
//# sourceMappingURL=bookActions.js.map