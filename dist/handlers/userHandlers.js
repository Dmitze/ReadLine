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
const tagFunctions_1 = require("../database/tagFunctions");
const catalogFunctions_1 = require("../database/catalogFunctions");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const helpers_1 = require("../utils/helpers");
const bookDisplay_1 = require("../utils/bookDisplay");
const logger_1 = require("../utils/logger");
const constants_1 = require("../constants");
const cache_1 = require("../utils/cache");
const userValidation_1 = require("../utils/userValidation");
let handlersRegistered = false;
exports.default = (bot) => {
    if (handlersRegistered) {
        logger_1.logger.warn('User handlers already registered, skipping');
        return;
    }
    handlersRegistered = true;
    logger_1.logger.info('User handlers registering');
    bot.hears('🎁 Отримати промокод', async (ctx) => {
        try {
            logger_1.logger.info('Promo code button pressed', { userId: ctx.from?.id });
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.reply('❌ Не вдалося ідентифікувати користувача');
                return;
            }
            const { hasUserReceivedPromoCode, getAvailablePromoCodesCount, getAvailablePromoCode, markPromoCodeAsUsed } = await Promise.resolve().then(() => __importStar(require('../database/promoCodeFunctions')));
            logger_1.logger.info('Checking if user already received promo code', { userId });
            const hasReceived = await hasUserReceivedPromoCode(userId);
            logger_1.logger.info('User promo code check result', { userId, hasReceived });
            if (hasReceived) {
                await ctx.reply('❌ <b>Ви вже отримували промокод</b>\n\n' +
                    'Кожен користувач може отримати промокод лише один раз.\n\n' +
                    '💡 Використайте отриманий промокод при замовленні на сайті Yakaboo.ua\n\n' +
                    '🌐 https://www.yakaboo.ua', { parse_mode: 'HTML' });
                return;
            }
            logger_1.logger.info('Checking available promo codes count', { userId });
            const availableCount = await getAvailablePromoCodesCount();
            logger_1.logger.info('Available promo codes count', { userId, availableCount });
            if (availableCount === 0) {
                await ctx.reply('😔 <b>Наразі промокодів немає в наявності</b>\n\n' +
                    '🔄 Будь ласка, спробуйте пізніше.\n\n' +
                    '📚 А поки що можете ознайомитися з нашим каталогом книг!', { parse_mode: 'HTML' });
                return;
            }
            logger_1.logger.info('Getting available promo code for user', { userId });
            const promoCode = await getAvailablePromoCode(userId);
            logger_1.logger.info('Got promo code', { userId, promoCode: promoCode ? promoCode.code : null });
            if (!promoCode) {
                logger_1.logger.error('No promo code available for user', new Error('No promo code'), { userId });
                await ctx.reply('❌ Сталася помилка при отриманні промокоду. Спробуйте пізніше.');
                return;
            }
            logger_1.logger.info('Marking promo code as used', { userId, promoCodeId: promoCode.id });
            await markPromoCodeAsUsed(userId, promoCode.id);
            await ctx.reply(`🎉 *ВІТАЄМО! ВАШ ПРОМОКОД:*\n\n` +
                `🎫 \`${promoCode.code}\`\n\n` +
                `💾 *Збережіть цей код!* Використовуйте його при замовленні на сайті Yakaboo.ua\n\n` +
                `🌐 *Посилання:* https://www.yakaboo.ua`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🌐 Перейти на Yakaboo.ua', url: 'https://www.yakaboo.ua' }],
                        [{ text: '🏠 На головну', callback_data: 'home' }]
                    ]
                }
            });
            logger_1.logger.userAction(userId, 'received_promo_code', { code: promoCode.code, promoId: promoCode.id });
        }
        catch (error) {
            logger_1.logger.error('Error getting promo code', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.reply('❌ Виникла помилка. Спробуйте ще раз.');
        }
    });
    bot.hears([constants_1.BUTTONS.CATALOG_OLD, constants_1.BUTTONS.CATALOG], async (ctx) => {
        try {
            await ctx.reply('📚 <b>КАТАЛОГ КНИГ</b>\n\n' +
                'Оберіть спосіб перегляду:', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [
                        telegraf_1.Markup.button.callback('📖 За жанрами', 'catalog_genres'),
                        telegraf_1.Markup.button.callback('⭐ За рейтингом', 'catalog_rating')
                    ],
                    [
                        telegraf_1.Markup.button.callback('🆕 Новинки', 'catalog_new'),
                        telegraf_1.Markup.button.callback('🔤 За алфавітом', 'catalog_alpha')
                    ],
                    [
                        telegraf_1.Markup.button.callback('🎧 З аудіо', 'catalog_audio'),
                        telegraf_1.Markup.button.callback('📥 За завантаженнями', 'catalog_downloads')
                    ],
                    [
                        telegraf_1.Markup.button.callback('🏷️ За тегами', 'catalog_tags')
                    ]
                ]).reply_markup
            });
            logger_1.logger.userAction(ctx.from.id, 'view_catalog');
        }
        catch (error) {
            logger_1.logger.error('Error showing catalog', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.GENERIC);
        }
    });
    bot.hears('⬅️ Назад', async (ctx) => {
        await ctx.reply('👋 Повертаємось до головного меню', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
        });
    });
    bot.hears(['🏆 Топ книги', constants_1.BUTTONS.TOP_BOOKS], async (ctx) => {
        try {
            const topBooks = await cache_1.cache.getOrSet(cache_1.CACHE_KEYS.TOP_BOOKS, () => (0, models_1.getTopBooks)(constants_1.CONFIG.MAX_TOP_BOOKS), cache_1.CACHE_TTL.MEDIUM);
            await (0, bookDisplay_1.displayTopBooks)(ctx, topBooks);
            logger_1.logger.userAction(ctx.from.id, 'view_top_books');
        }
        catch (error) {
            logger_1.logger.error('Error showing top books', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.NO_TOP_BOOKS);
        }
    });
    bot.hears(constants_1.BUTTONS.NEW_BOOKS, async (ctx) => {
        try {
            const newBooks = await (0, models_1.getNewestBooks)(5);
            if (newBooks.length === 0) {
                await ctx.reply('📭 В бібліотеці поки що немає книг.');
                return;
            }
            await (0, bookDisplay_1.displayNewBooks)(ctx, newBooks, 5);
            logger_1.logger.userAction(ctx.from.id, 'view_new_books');
        }
        catch (error) {
            logger_1.logger.error('Error showing new books', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.NO_NEW_BOOKS);
        }
    });
    bot.hears(constants_1.BUTTONS.MY_LIBRARY, async (ctx) => {
        try {
            if (!(await (0, userValidation_1.checkUserIdOrReply)(ctx)))
                return;
            const userId = (0, userValidation_1.validateUserId)(ctx);
            const savedBooks = await (0, models_1.getSavedBooks)(userId);
            await (0, bookDisplay_1.displaySavedBooks)(ctx, savedBooks);
            logger_1.logger.userAction(userId, 'view_library');
        }
        catch (error) {
            logger_1.logger.error('Error showing saved books', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.NO_SAVED_BOOKS);
        }
    });
    bot.hears([constants_1.BUTTONS.PROFILE_OLD, constants_1.BUTTONS.PROFILE], async (ctx) => {
        logger_1.logger.userAction(ctx.from.id, 'enter_profile');
        return ctx.scene?.enter('PROFILE_SCENE');
    });
    bot.hears(constants_1.BUTTONS.FEEDBACK, async (ctx) => {
        logger_1.logger.userAction(ctx.from.id, 'enter_feedback');
        return ctx.scene?.enter('FEEDBACK_SCENE');
    });
    bot.hears(constants_1.BUTTONS.AI_ASSISTANT, async (ctx) => {
        logger_1.logger.userAction(ctx.from.id, 'enter_ai');
        return ctx.scene?.enter('AI_SCENE');
    });
    bot.hears(constants_1.BUTTONS.HELP, async (ctx) => {
        logger_1.logger.userAction(ctx.from.id, 'view_help');
        return ctx.reply('<b>📖 ДОВІДКА ПО БОТУ</b>\n\n' +
            '<b>🎯 ОСНОВНІ ФУНКЦІЇ:</b>\n\n' +
            '📖 <b>Каталог</b> - перегляд книг за жанрами\n' +
            '🔍 <b>Пошук</b> - швидкий пошук книг\n' +
            '⭐ <b>Топ книги</b> - найкращі книги за рейтингом\n' +
            '🆕 <b>Новинки</b> - останні додані книги\n' +
            '💾 <b>Моя бібліотека</b> - збережені книги\n' +
            '👤 <b>Профіль</b> - ваша статистика\n' +
            '📞 <b>Зворотній зв\'язок</b> - зв\'язок з адміном\n\n' +
            '<b>⚙️ КОМАНДИ:</b>\n' +
            '/start - Головне меню\n' +
            '/help - Ця довідка\n' +
            '/admin - Панель адміністратора\n\n' +
            '💡 Використовуйте кнопки для навігації!', { parse_mode: 'HTML' });
    });
    bot.on('message', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message))
            return;
        const messageText = ctx.message.text;
        if (messageText.startsWith('/'))
            return;
        try {
            const genres = await cache_1.cache.getOrSet(cache_1.CACHE_KEYS.GENRES, models_1.getGenres, cache_1.CACHE_TTL.LONG);
            if (genres.includes(messageText)) {
                const BOOKS_PER_PAGE = 5;
                const { books, total } = await (0, models_1.getBooksByGenreWithPagination)(messageText, BOOKS_PER_PAGE, 0);
                if (books.length === 0) {
                    await ctx.reply('📭 На жаль, в цьому жанрі ще немає книг.');
                    return;
                }
                await ctx.reply(`📚 Знайдено ${total} ${total === 1 ? 'книгу' : 'книг'} в жанрі "${messageText}".\n` +
                    `Показано перші ${books.length}:`);
                for (const book of books) {
                    const caption = await (0, helpers_1.formatBookCaption)(book);
                    const userId = ctx.from?.id;
                    const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                    if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
                        try {
                            await ctx.replyWithPhoto(book.photo_file_id, {
                                caption,
                                parse_mode: 'HTML',
                                reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                            });
                        }
                        catch (error) {
                            await ctx.reply(caption, {
                                parse_mode: 'HTML',
                                reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                            });
                        }
                    }
                    else {
                        await ctx.reply(caption, {
                            parse_mode: 'HTML',
                            reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                        });
                    }
                }
                if (total > BOOKS_PER_PAGE) {
                    const totalPages = Math.ceil(total / BOOKS_PER_PAGE);
                    const currentPage = 1;
                    const paginationButtons = [];
                    if (currentPage < totalPages) {
                        paginationButtons.push(telegraf_1.Markup.button.callback(`➡️ Наступна сторінка (${currentPage + 1}/${totalPages})`, `genre_page_${messageText}_${currentPage + 1}`));
                    }
                    await ctx.reply(`ℹ️ Показано ${books.length} з ${total} книг (сторінка ${currentPage}/${totalPages})`, {
                        reply_markup: telegraf_1.Markup.inlineKeyboard([paginationButtons]).reply_markup
                    });
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error getting books by genre', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.reply('❌ Виникла помилка при отриманні книг.');
        }
        return;
    });
    bot.action(/genre_page_(.+)_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match || !match[1] || !match[2]) {
                await ctx.answerCbQuery('❌ Помилка');
                return;
            }
            const genre = match[1];
            const page = parseInt(match[2]);
            const BOOKS_PER_PAGE = 5;
            const offset = (page - 1) * BOOKS_PER_PAGE;
            await ctx.answerCbQuery(`Завантаження сторінки ${page}...`);
            const { books, total } = await (0, models_1.getBooksByGenreWithPagination)(genre, BOOKS_PER_PAGE, offset);
            if (books.length === 0) {
                await ctx.answerCbQuery('❌ Книги не знайдено');
                return;
            }
            await ctx.reply(`📚 Жанр "${genre}" - сторінка ${page}:`);
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
                    try {
                        await ctx.replyWithPhoto(book.photo_file_id, {
                            caption,
                            parse_mode: 'HTML',
                            reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                        });
                    }
                    catch (error) {
                        await ctx.reply(caption, {
                            parse_mode: 'HTML',
                            reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                        });
                    }
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved)
                    });
                }
            }
            const totalPages = Math.ceil(total / BOOKS_PER_PAGE);
            const paginationButtons = [];
            if (page > 1) {
                paginationButtons.push(telegraf_1.Markup.button.callback(`⬅️ Попередня (${page - 1}/${totalPages})`, `genre_page_${genre}_${page - 1}`));
            }
            if (page < totalPages) {
                paginationButtons.push(telegraf_1.Markup.button.callback(`➡️ Наступна (${page + 1}/${totalPages})`, `genre_page_${genre}_${page + 1}`));
            }
            if (paginationButtons.length > 0) {
                await ctx.reply(`ℹ️ Показано ${books.length} з ${total} книг (сторінка ${page}/${totalPages})`, {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([paginationButtons]).reply_markup
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error in genre pagination', error instanceof Error ? error : new Error(String(error)));
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/save_(\d+)/, async (ctx) => {
        const { retryOperation, sendErrorToUser } = await Promise.resolve().then(() => __importStar(require('../utils/errorHandler')));
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            const bookId = parseInt(match[1]);
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
                        const { getUserFavoriteGenres, updateUserFavoriteGenres } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
                        const currentGenres = await getUserFavoriteGenres(userId);
                        if (!currentGenres.includes(book.genre)) {
                            const updatedGenres = [...currentGenres, book.genre];
                            await updateUserFavoriteGenres(userId, updatedGenres);
                            logger_1.logger.info('Added genre to user favorites', { userId, genre: book.genre });
                        }
                    }
                    await ctx.answerCbQuery('❤️ Збережено!', { show_alert: false });
                }
            }, 2, 500);
        })().catch((error) => {
            logger_1.logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
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
            const bookId = parseInt(match[1]);
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача');
                return;
            }
            await ctx.answerCbQuery('Завантаження...');
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.reply('❌ Книга не знайдена');
                return;
            }
            const caption = await (0, helpers_1.formatBookCaption)(book);
            const isSaved = await (0, models_1.isBookSaved)(userId, bookId);
            const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
            if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
                await ctx.replyWithPhoto(book.photo_file_id, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                }).catch(async () => {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                });
            }
            else {
                await ctx.reply(caption, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                });
            }
            logger_1.logger.userAction(userId, 'view_saved_book', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error viewing saved book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при завантаженні');
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
            const bookId = parseInt(match[1]);
            const userId = ctx.from?.id;
            await ctx.answerCbQuery('Завантаження...');
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.reply('❌ Книга не знайдена');
                return;
            }
            const caption = await (0, helpers_1.formatBookCaption)(book);
            const isSaved = userId ? await (0, models_1.isBookSaved)(userId, bookId) : false;
            const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
            if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
                await ctx.replyWithPhoto(book.photo_file_id, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                }).catch(async () => {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                });
            }
            else {
                await ctx.reply(caption, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                });
            }
            logger_1.logger.userAction(userId || 0, 'view_book_from_list', { bookId });
        })().catch((error) => {
            logger_1.logger.error('Error viewing book from list', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при завантаженні');
        });
        return;
    });
    bot.action(/download_pdf_(\d+)/, async (ctx) => {
        const { withTimeout, ErrorType, sendErrorToUser } = await Promise.resolve().then(() => __importStar(require('../utils/errorHandler')));
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
                return;
            }
            const bookId = parseInt(match[1]);
            await withTimeout(async () => {
                await (0, models_1.incrementDownloads)(bookId);
                const book = await (0, models_1.getBookById)(bookId);
                if (!book) {
                    await ctx.answerCbQuery('❌ Книга не знайдена');
                    return;
                }
                const pdfFileId = book.pdf_file_id || book.file_url;
                if (pdfFileId) {
                    await ctx.telegram.sendDocument(ctx.from.id, pdfFileId, {
                        caption: `📥 ${book.title}\n👤 ${book.author}\n\n✅ Файл завантажено!`
                    });
                    await ctx.answerCbQuery('📥 Файл надіслано вам у приватні повідомлення');
                }
                else {
                    await ctx.answerCbQuery('❌ Файл недоступний');
                }
            }, 30000, 'PDF download timeout');
        })().catch((error) => {
            logger_1.logger.error('Error downloading PDF', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            sendErrorToUser(ctx, error, '❌ Помилка при завантаженні файлу. Спробуйте пізніше.');
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
            const bookId = parseInt(match[1]);
            await (0, models_1.incrementDownloads)(bookId);
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.answerCbQuery('❌ Книга не знайдена');
                return;
            }
            const audioFileId = book.audio_file_id;
            if (audioFileId) {
                await ctx.answerCbQuery('🎧 Відправляю аудіокнигу...');
                let caption = `🎧 <b>${book.title}</b>\n`;
                caption += `👤 ${book.author}\n`;
                if (book.narrator) {
                    caption += `🎙️ Читає: ${book.narrator}\n`;
                }
                if (book.audio_duration) {
                    const hours = Math.floor(book.audio_duration / 3600);
                    const minutes = Math.floor((book.audio_duration % 3600) / 60);
                    if (hours > 0) {
                        caption += `⏱️ Тривалість: ${hours}г ${minutes}хв\n`;
                    }
                    else {
                        caption += `⏱️ Тривалість: ${minutes}хв\n`;
                    }
                }
                await ctx.replyWithAudio(audioFileId, {
                    caption,
                    parse_mode: 'HTML'
                });
                logger_1.logger.userAction(ctx.from.id, 'listen_audiobook', { bookId, title: book.title });
            }
            else {
                await ctx.answerCbQuery('❌ Аудіокнига недоступна');
            }
        })().catch((error) => {
            logger_1.logger.error('Error sending audio', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при відправці аудіо');
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
            const bookId = parseInt(match[1]);
            const book = await (0, models_1.getBookById)(bookId);
            const reviews = await (0, models_1.getBookReviews)(bookId);
            if (!book) {
                await ctx.answerCbQuery('❌ Книга не знайдена');
                return;
            }
            if (reviews.length === 0) {
                await ctx.answerCbQuery('📝 Поки що немає відгуків', { show_alert: true });
                return;
            }
            let reviewsText = `📊 <b>Відгуки про книгу</b>\n\n📖 ${book.title}\n👤 ${book.author}\n`;
            reviewsText += `⭐ Середній рейтинг: ${book.rating?.toFixed(1) || 0}/5\n\n`;
            reviews.slice(0, 5).forEach((review, index) => {
                reviewsText += `${index + 1}. ${'⭐'.repeat(review.rating)} - ${review.user_name || 'Користувач'}\n`;
                if (review.comment) {
                    reviewsText += `   💬 "${review.comment}"\n`;
                }
                reviewsText += `\n`;
            });
            if (reviews.length > 5) {
                reviewsText += `\n...та ще ${reviews.length - 5} відгуків`;
            }
            await ctx.reply(reviewsText, { parse_mode: 'HTML' });
            await ctx.answerCbQuery();
        })().catch((error) => {
            logger_1.logger.error('Error showing reviews', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при отриманні відгуків');
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
            const bookId = parseInt(match[1]);
            const book = await (0, models_1.getBookById)(bookId);
            if (!book) {
                await ctx.answerCbQuery('❌ Книга не знайдена');
                return;
            }
            const similarBooks = await (0, models_1.getBooksByGenre)(book.genre);
            const filtered = similarBooks.filter(b => b.id !== bookId).slice(0, 3);
            if (filtered.length === 0) {
                await ctx.answerCbQuery('📭 Схожих книг не знайдено', { show_alert: true });
                return;
            }
            await ctx.reply(`🔍 <b>Схожі книги</b> (жанр: ${book.genre}):\n\n` +
                filtered.map((b, i) => `${i + 1}. 📖 ${b.title}\n   👤 ${b.author}`).join('\n\n'), { parse_mode: 'HTML' });
            await ctx.answerCbQuery();
        })().catch((error) => {
            logger_1.logger.error('Error showing similar books', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при пошуку схожих книг');
        });
        return;
    });
    bot.action(/rate_(\d+)/, async (ctx) => {
        const match = ctx.match;
        if (!match || !match[1]) {
            await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
            return;
        }
        const bookId = parseInt(match[1]);
        await ctx.answerCbQuery();
        return ctx.scene?.enter('RATE_BOOK_SCENE', { bookId });
    });
    bot.hears('🏠 На головну', async (ctx) => {
        await ctx.reply('🏠 Повертаємось на головну', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
        });
        logger_1.logger.userAction(ctx.from.id, 'home');
        return;
    });
    bot.action('home', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('🏠 Повертаємось на головну', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
        });
        logger_1.logger.userAction(ctx.from.id, 'home_inline');
        return;
    });
    bot.action('catalog_genres', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery();
            const genres = await cache_1.cache.getOrSet(cache_1.CACHE_KEYS.GENRES, () => (0, models_1.getGenres)(), cache_1.CACHE_TTL.LONG);
            const keyboard = (0, mainKeyboards_1.getGenreKeyboard)(genres);
            await ctx.reply('📚 Оберіть жанр:', {
                reply_markup: keyboard
            });
        })().catch((error) => {
            logger_1.logger.error('Error showing genres', error);
            ctx.answerCbQuery('❌ Помилка');
        });
    });
    bot.action('catalog_rating', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('⭐ Завантаження книг з високим рейтингом...');
            const books = await (0, catalogFunctions_1.getHighRatedBooks)(4, 10);
            if (books.length === 0) {
                await ctx.reply('📭 Поки що немає книг з рейтингом 4+ зірки.');
                return;
            }
            await ctx.reply(`⭐ <b>КНИГИ З ВИСОКИМ РЕЙТИНГОМ</b>\n\n` +
                `Знайдено ${books.length} ${books.length === 1 ? 'книга' : 'книг'} з рейтингом 4+ зірки:`, { parse_mode: 'HTML' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_rating');
        })().catch((error) => {
            logger_1.logger.error('Error showing high rated books', error);
            ctx.answerCbQuery('❌ Помилка');
        });
    });
    bot.action('catalog_new', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('🆕 Завантаження новинок...');
            const books = await cache_1.cache.getOrSet(cache_1.CACHE_KEYS.NEW_BOOKS, () => (0, models_1.getNewestBooks)(10), cache_1.CACHE_TTL.SHORT);
            if (books.length === 0) {
                await ctx.reply('📭 Книг ще немає в бібліотеці.');
                return;
            }
            await ctx.reply(`🆕 <b>НОВИНКИ БІБЛІОТЕКИ</b>\n\n` +
                `Останні ${books.length} додані ${books.length === 1 ? 'книга' : 'книг'}:`, { parse_mode: 'HTML' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_new');
        })().catch((error) => {
            logger_1.logger.error('Error showing new books', error);
            ctx.answerCbQuery('❌ Помилка');
        });
    });
    bot.action('catalog_tags', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery();
            const allTags = await (0, tagFunctions_1.getAllTags)();
            if (allTags.length === 0) {
                await ctx.reply('🏷️ Теги ще не додані до системи.');
                return;
            }
            const tagButtons = [];
            for (let i = 0; i < allTags.length; i += 2) {
                const row = [
                    telegraf_1.Markup.button.callback(allTags[i].name, `view_tag_${allTags[i].id}`)
                ];
                if (i + 1 < allTags.length) {
                    row.push(telegraf_1.Markup.button.callback(allTags[i + 1].name, `view_tag_${allTags[i + 1].id}`));
                }
                tagButtons.push(row);
            }
            await ctx.reply('🏷️ <b>КАТАЛОГ ЗА ТЕГАМИ</b>\n\n' +
                'Оберіть тег для перегляду книг:', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard(tagButtons).reply_markup
            });
            logger_1.logger.userAction(ctx.from.id, 'catalog_tags');
        })().catch((error) => {
            logger_1.logger.error('Error showing tags catalog', error);
            ctx.answerCbQuery('❌ Помилка');
        });
    });
    bot.action('catalog_alpha', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('🔤 Завантаження книг за алфавітом...');
            const { books, total } = await (0, catalogFunctions_1.getBooksSortedByTitle)(10, 0);
            if (books.length === 0) {
                await ctx.reply('📭 Книг ще немає в бібліотеці.');
                return;
            }
            await ctx.reply(`🔤 <b>КНИГИ ЗА АЛФАВІТОМ</b>\n\n` +
                `Показано ${books.length} з ${total} ${total === 1 ? 'книги' : 'книг'}:`, { parse_mode: 'HTML' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
            }
            if (total > 10) {
                await ctx.reply(`ℹ️ Показано 10 з ${total} книг. Використовуйте пошук для інших книг.`);
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_alpha');
        })().catch((error) => {
            logger_1.logger.error('Error showing books by title', error);
            ctx.answerCbQuery('❌ Помилка');
        });
    });
    bot.action('catalog_audio', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('🎧 Завантаження аудіокниг...');
            const books = await (0, catalogFunctions_1.getBooksWithAudio)(10);
            if (books.length === 0) {
                await ctx.reply('📭 Поки що немає аудіокниг в бібліотеці.');
                return;
            }
            await ctx.reply(`🎧 <b>АУДІОКНИГИ</b>\n\n` +
                `Знайдено ${books.length} ${books.length === 1 ? 'аудіокнига' : 'аудіокниг'}:`, { parse_mode: 'HTML' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_audio');
        })().catch((error) => {
            logger_1.logger.error('Error showing audio books', error);
            ctx.answerCbQuery('❌ Помилка');
        });
    });
    bot.action('catalog_downloads', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('📥 Завантаження популярних книг...');
            const books = await (0, models_1.getMostDownloadedBooks)(10);
            if (books.length === 0) {
                await ctx.reply('📭 Поки що немає завантажених книг.');
                return;
            }
            await ctx.reply(`📥 <b>НАЙПОПУЛЯРНІШІ КНИГИ</b>\n\n` +
                `Топ ${books.length} найбільш завантажуваних ${books.length === 1 ? 'книга' : 'книг'}:`, { parse_mode: 'HTML' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_downloads');
        })().catch((error) => {
            logger_1.logger.error('Error showing most downloaded books', error);
            ctx.answerCbQuery('❌ Помилка');
        });
    });
    bot.action(/view_tag_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка');
                return;
            }
            const tagId = parseInt(match[1]);
            const allTags = await (0, tagFunctions_1.getAllTags)();
            const tag = allTags.find(t => t.id === tagId);
            if (!tag) {
                await ctx.answerCbQuery('❌ Тег не знайдено');
                return;
            }
            await ctx.answerCbQuery(`🏷️ Завантаження книг з тегом: ${tag.name}`);
            const books = await (0, tagFunctions_1.searchBooksByTag)(tag.name, 10);
            if (books.length === 0) {
                await ctx.reply(`🏷️ Книг з тегом "${tag.name}" поки що немає.`);
                return;
            }
            await ctx.reply(`🏷️ *Книги з тегом "${tag.name}"*\n\n` +
                `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}:`, { parse_mode: 'HTML' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'view_tag', { tagId, tagName: tag.name });
        })().catch((error) => {
            logger_1.logger.error('Error showing books by tag', error);
            ctx.answerCbQuery('❌ Помилка');
        });
    });
    bot.action(/search_tag_(\d+)/, async (ctx) => {
        (async () => {
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка');
                return;
            }
            const tagId = parseInt(match[1]);
            const allTags = await (0, tagFunctions_1.getAllTags)();
            const tag = allTags.find(t => t.id === tagId);
            if (!tag) {
                await ctx.answerCbQuery('❌ Тег не знайдено');
                return;
            }
            await ctx.answerCbQuery(`🔍 Шукаємо за тегом: ${tag.name}`);
            const books = await (0, tagFunctions_1.searchBooksByTag)(tag.name, 10);
            if (books.length === 0) {
                await ctx.reply(`📭 *Книг з тегом "${tag.name}" не знайдено*\n\n` +
                    'Спробуйте інший тег або використайте звичайний пошук.', { parse_mode: 'HTML' });
                return;
            }
            await ctx.reply(`🏷️ *Книги з тегом "${tag.name}"*\n\n` +
                `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}:`, { parse_mode: 'HTML' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'search_by_tag', { tagName: tag.name, resultsCount: books.length });
        })().catch((error) => {
            logger_1.logger.error('Error searching by tag', error);
            ctx.answerCbQuery('❌ Помилка пошуку');
            ctx.reply(constants_1.ERRORS.GENERIC);
        });
    });
    logger_1.logger.info('User handlers registered (including AI features and promo codes)');
};
//# sourceMappingURL=userHandlers.js.map