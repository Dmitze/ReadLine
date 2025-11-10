"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const models_1 = require("../database/models");
const recommendationFunctions_1 = require("../database/recommendationFunctions");
const tagFunctions_1 = require("../database/tagFunctions");
const catalogFunctions_1 = require("../database/catalogFunctions");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const helpers_1 = require("../utils/helpers");
const bookDisplay_1 = require("../utils/bookDisplay");
const logger_1 = require("../utils/logger");
const constants_1 = require("../constants");
const cache_1 = require("../utils/cache");
exports.default = (bot) => {
    console.log('✅ User handlers registering...');
    bot.hears([constants_1.BUTTONS.CATALOG_OLD, constants_1.BUTTONS.CATALOG], async (ctx) => {
        try {
            await ctx.reply('📚 *КАТАЛОГ КНИГ*\n\n' +
                'Оберіть спосіб перегляду:', {
                parse_mode: 'Markdown',
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
                    ],
                    [
                        telegraf_1.Markup.button.callback('🤖 AI-підбір', 'catalog_ai')
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
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.reply(constants_1.ERRORS.GENERIC);
                return;
            }
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
        ctx.scene?.enter('PROFILE_SCENE');
        logger_1.logger.userAction(ctx.from.id, 'enter_profile');
        return;
    });
    bot.hears(constants_1.BUTTONS.FEEDBACK, async (ctx) => {
        ctx.scene?.enter('FEEDBACK_SCENE');
        logger_1.logger.userAction(ctx.from.id, 'enter_feedback');
        return;
    });
    bot.hears(constants_1.BUTTONS.AI_ASSISTANT, async (ctx) => {
        ctx.scene?.enter('AI_SCENE');
        logger_1.logger.userAction(ctx.from.id, 'enter_ai');
        return;
    });
    bot.hears(constants_1.BUTTONS.HELP, async (ctx) => {
        logger_1.logger.userAction(ctx.from.id, 'view_help');
        return ctx.reply('📖 *ДОВІДКА ПО БОТУ*\n\n' +
            '🎯 *ОСНОВНІ ФУНКЦІЇ:*\n\n' +
            '📖 *Каталог* - перегляд книг за жанрами\n' +
            '🔍 *Пошук* - швидкий пошук книг\n' +
            '⭐ *Топ книги* - найкращі книги за рейтингом\n' +
            '🆕 *Новинки* - останні додані книги\n' +
            '💾 *Моя бібліотека* - збережені книги\n' +
            '👤 *Профіль* - ваша статистика\n' +
            '📞 *Зворотній зв\'язок* - зв\'язок з адміном\n\n' +
            '⚙️ *КОМАНДИ:*\n' +
            '/start - Головне меню\n' +
            '/help - Ця довідка\n' +
            '/admin - Панель адміністратора\n\n' +
            '💡 Використовуйте кнопки для навігації!', { parse_mode: 'Markdown' });
    });
    bot.on('message', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message))
            return;
        const messageText = ctx.message.text;
        if (messageText.startsWith('/'))
            return;
        try {
            const genres = await (0, models_1.getGenres)();
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
                    const caption = `📖 *${book.title}*
👤 Автор: ${book.author}
� Жванр: ${book.genre}
� Опис:  ${book.description}
� Статус: b${book.is_available ? 'Доступна' : 'Недоступна'}`;
                    if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
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
                if (total > BOOKS_PER_PAGE) {
                    await ctx.reply(`ℹ️ Показано ${books.length} з ${total} книг.\n\n` +
                        `Для перегляду інших книг використайте:\n` +
                        `🔍 Пошук книги - пошук за назвою або автором`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error getting books by genre', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.reply('❌ Виникла помилка при отриманні книг.');
        }
        return;
    });
    bot.action(/save_(\d+)/, async (ctx) => {
        try {
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
            const isSaved = await (0, models_1.isBookSaved)(userId, bookId);
            if (isSaved) {
                await (0, models_1.unsaveBook)(userId, bookId);
                await ctx.answerCbQuery('💔 Видалено зі збережених', { show_alert: false });
            }
            else {
                await (0, models_1.saveBook)(userId, bookId);
                await ctx.answerCbQuery('❤️ Збережено!', { show_alert: false });
            }
        }
        catch (error) {
            logger_1.logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка при збереженні');
        }
        return;
    });
    bot.action(/view_saved_book_(\d+)/, async (ctx) => {
        try {
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
                try {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                catch (photoError) {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            else {
                await ctx.reply(caption, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            }
            logger_1.logger.userAction(userId, 'view_saved_book', { bookId });
        }
        catch (error) {
            logger_1.logger.error('Error viewing saved book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка при завантаженні');
        }
        return;
    });
    bot.action(/view_book_(\d+)/, async (ctx) => {
        try {
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
                try {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                catch (photoError) {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            else {
                await ctx.reply(caption, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            }
            logger_1.logger.userAction(userId || 0, 'view_book_from_list', { bookId });
        }
        catch (error) {
            logger_1.logger.error('Error viewing book from list', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка при завантаженні');
        }
        return;
    });
    bot.action(/download_pdf_(\d+)/, async (ctx) => {
        try {
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
            const pdfFileId = book.pdf_file_id || (book.file_type === 'file' ? book.file_url : null);
            if (pdfFileId) {
                await ctx.telegram.sendDocument(ctx.from.id, pdfFileId, {
                    caption: `📥 ${book.title}\n👤 ${book.author}\n\n✅ PDF файл завантажено!`
                });
                await ctx.answerCbQuery('📥 PDF надіслано вам у приватні повідомлення');
            }
            else {
                await ctx.answerCbQuery('❌ PDF файл недоступний');
            }
        }
        catch (error) {
            logger_1.logger.error('Error downloading PDF', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка при завантаженні');
        }
        return;
    });
    bot.action(/download_audio_(\d+)/, async (ctx) => {
        try {
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
            if (book.audio_file_id) {
                await ctx.answerCbQuery('🎧 Завантаження аудіоплеєра...');
                ctx.scene.state = { bookId };
                await ctx.scene?.enter('AUDIO_PLAYER_SCENE');
            }
            else {
                await ctx.answerCbQuery('❌ Аудіокнига недоступна');
            }
        }
        catch (error) {
            logger_1.logger.error('Error opening audio player', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка при завантаженні');
        }
        return;
    });
    bot.action(/reviews_(\d+)/, async (ctx) => {
        try {
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
            let reviewsText = `📊 *Відгуки про книгу*\n\n📖 ${book.title}\n👤 ${book.author}\n`;
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
            await ctx.reply(reviewsText, { parse_mode: 'Markdown' });
            await ctx.answerCbQuery();
        }
        catch (error) {
            logger_1.logger.error('Error showing reviews', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка при отриманні відгуків');
        }
        return;
    });
    bot.action(/similar_(\d+)/, async (ctx) => {
        try {
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
            await ctx.reply(`🔍 *Схожі книги* (жанр: ${book.genre}):\n\n` +
                filtered.map((b, i) => `${i + 1}. 📖 ${b.title}\n   👤 ${b.author}`).join('\n\n'), { parse_mode: 'Markdown' });
            await ctx.answerCbQuery();
        }
        catch (error) {
            logger_1.logger.error('Error showing similar books', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка при пошуку схожих книг');
        }
        return;
    });
    bot.action(/rate_(\d+)/, async (ctx) => {
        const match = ctx.match;
        if (!match || !match[1]) {
            await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
            return;
        }
        const bookId = parseInt(match[1]);
        ctx.scene?.enter('RATE_BOOK_SCENE', { bookId });
        await ctx.answerCbQuery();
        return;
    });
    bot.hears('⚡ Швидкий пошук', async (ctx) => {
        try {
            await ctx.reply('⚡ *ШВИДКИЙ ПОШУК*\n\n' +
                '🔍 Введіть назву книги, автора або жанр:\n\n' +
                '💡 *Приклади:*\n' +
                '• Кобзар\n' +
                '• Шевченко\n' +
                '• Фантастика\n' +
                '• Любовний роман\n\n' +
                '✨ Пошук працює навіть з помилками в словах!\n' +
                '🤖 Включає AI-рекомендації та розумний пошук', {
                parse_mode: 'Markdown',
                reply_markup: telegraf_1.Markup.keyboard([['⬅️ Назад до меню']]).resize().reply_markup
            });
            ctx.scene?.enter('SEARCH_SCENE', { searchType: 'general' });
            logger_1.logger.userAction(ctx.from.id, 'quick_search');
        }
        catch (error) {
            logger_1.logger.error('Error in quick search', error, { userId: ctx.from?.id });
            await ctx.reply('❌ Виникла помилка. Спробуйте ще раз.');
        }
        return;
    });
    bot.hears('⭐ Мої улюблені', async (ctx) => {
        try {
            console.log('⭐ My favorites request from user:', ctx.from?.id);
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.reply('❌ Не вдалося ідентифікувати користувача');
                return;
            }
            const savedBooks = await (0, models_1.getSavedBooks)(userId);
            console.log('📚 Saved books found:', savedBooks.length);
            if (savedBooks.length === 0) {
                await ctx.reply('⭐ *Мої улюблені*\n\n' +
                    'У вас ще немає улюблених книг.\n\n' +
                    '💡 Зберігайте цікаві книги натискаючи кнопку 💾 ЗБЕРЕГТИ при перегляді книги.\n\n' +
                    '🔍 Спробуйте:\n' +
                    '• Перейти в каталог книг\n' +
                    '• Знайти цікаву книгу\n' +
                    '• Натиснути кнопку 💾 ЗБЕРЕГТИ', { parse_mode: 'Markdown' });
                return;
            }
            await (0, bookDisplay_1.displaySavedBooks)(ctx, savedBooks);
            logger_1.logger.userAction(userId, 'view_favorites', { booksCount: savedBooks.length });
        }
        catch (error) {
            console.error('❌ Error in favorites:', error);
            logger_1.logger.error('Error showing favorites', error, { userId: ctx.from?.id });
            await ctx.reply('❌ Виникла помилка при отриманні улюблених книг.');
        }
        return;
    });
    bot.hears('🎲 Випадкова книга', async (ctx) => {
        try {
            console.log('🎲 Random book request from user:', ctx.from?.id);
            const randomBook = await (0, recommendationFunctions_1.getRandomBook)();
            console.log('📖 Random book result:', randomBook ? `${randomBook.title} (ID: ${randomBook.id})` : 'null');
            if (!randomBook) {
                console.log('⚠️ No random book found, trying fallback...');
                const topBooks = await (0, models_1.getTopBooks)(1);
                console.log('🏆 Top books fallback:', topBooks.length);
                if (topBooks.length > 0) {
                    await ctx.reply('🎲 *Випадкова книга*\n\n' +
                        'Ось чудова книга з нашого каталогу:', { parse_mode: 'Markdown' });
                    const book = topBooks[0];
                    const userId = ctx.from?.id;
                    const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                    const caption = await (0, helpers_1.formatBookCaption)(book);
                    const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                    if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
                        try {
                            await ctx.replyWithPhoto(book.photo_file_id, {
                                caption,
                                parse_mode: 'Markdown',
                                reply_markup: keyboard
                            });
                        }
                        catch (photoError) {
                            await ctx.reply(caption, {
                                parse_mode: 'Markdown',
                                reply_markup: keyboard
                            });
                        }
                    }
                    else {
                        await ctx.reply(caption, {
                            parse_mode: 'Markdown',
                            reply_markup: keyboard
                        });
                    }
                    logger_1.logger.userAction(ctx.from.id, 'random_book_fallback');
                    return;
                }
                await ctx.reply('📭 *Бібліотека порожня*\n\n' +
                    'В каталозі поки що немає жодної книги.\n\n' +
                    '💡 Зверніться до адміністратора для додавання книг через /admin', { parse_mode: 'Markdown' });
                return;
            }
            if (!randomBook.is_available) {
                console.log('⚠️ Random book is not available:', randomBook.id);
                await ctx.reply('❌ Вибрана книга наразі недоступна. Спробуйте ще раз.');
                return;
            }
            const userId = ctx.from?.id;
            const isSaved = userId ? await (0, models_1.isBookSaved)(userId, randomBook.id) : false;
            await ctx.reply('🎲 *Випадкова книга для вас:*', { parse_mode: 'Markdown' });
            const caption = await (0, helpers_1.formatBookCaption)(randomBook);
            const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(randomBook, isSaved);
            if (randomBook.photo_file_id && randomBook.photo_file_id !== 'default_book_cover' && randomBook.photo_file_id.length > 20) {
                try {
                    await ctx.replyWithPhoto(randomBook.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                catch (photoError) {
                    console.log('⚠️ Photo error, sending as text');
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            else {
                await ctx.reply(caption, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            }
            logger_1.logger.userAction(ctx.from.id, 'random_book', { bookId: randomBook.id });
        }
        catch (error) {
            console.error('❌ Error in random book:', error);
            logger_1.logger.error('Error showing random book', error, { userId: ctx.from?.id });
            await ctx.reply('❌ Виникла помилка при отриманні книги. Спробуйте пізніше.');
        }
        return;
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
        try {
            await ctx.answerCbQuery();
            const genres = await cache_1.cache.getOrSet(cache_1.CACHE_KEYS.GENRES, () => (0, models_1.getGenres)(), cache_1.CACHE_TTL.LONG);
            const keyboard = (0, mainKeyboards_1.getGenreKeyboard)(genres);
            await ctx.reply('📚 Оберіть жанр:', {
                reply_markup: keyboard
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing genres', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('catalog_rating', async (ctx) => {
        try {
            await ctx.answerCbQuery('⭐ Завантаження книг з високим рейтингом...');
            const books = await (0, catalogFunctions_1.getHighRatedBooks)(4, 10);
            if (books.length === 0) {
                await ctx.reply('📭 Поки що немає книг з рейтингом 4+ зірки.');
                return;
            }
            await ctx.reply(`⭐ *КНИГИ З ВИСОКИМ РЕЙТИНГОМ*\n\n` +
                `Знайдено ${books.length} ${books.length === 1 ? 'книга' : 'книг'} з рейтингом 4+ зірки:`, { parse_mode: 'Markdown' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_rating');
        }
        catch (error) {
            logger_1.logger.error('Error showing high rated books', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('catalog_new', async (ctx) => {
        try {
            await ctx.answerCbQuery('🆕 Завантаження новинок...');
            const books = await cache_1.cache.getOrSet(cache_1.CACHE_KEYS.NEW_BOOKS, () => (0, models_1.getNewestBooks)(10), cache_1.CACHE_TTL.SHORT);
            if (books.length === 0) {
                await ctx.reply('📭 Книг ще немає в бібліотеці.');
                return;
            }
            await ctx.reply(`🆕 *НОВИНКИ БІБЛІОТЕКИ*\n\n` +
                `Останні ${books.length} додані ${books.length === 1 ? 'книга' : 'книг'}:`, { parse_mode: 'Markdown' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_new');
        }
        catch (error) {
            logger_1.logger.error('Error showing new books', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('catalog_tags', async (ctx) => {
        try {
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
            await ctx.reply('🏷️ *КАТАЛОГ ЗА ТЕГАМИ*\n\n' +
                'Оберіть тег для перегляду книг:', {
                parse_mode: 'Markdown',
                reply_markup: telegraf_1.Markup.inlineKeyboard(tagButtons).reply_markup
            });
            logger_1.logger.userAction(ctx.from.id, 'catalog_tags');
        }
        catch (error) {
            logger_1.logger.error('Error showing tags catalog', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('catalog_alpha', async (ctx) => {
        try {
            await ctx.answerCbQuery('🔤 Завантаження книг за алфавітом...');
            const { books, total } = await (0, catalogFunctions_1.getBooksSortedByTitle)(10, 0);
            if (books.length === 0) {
                await ctx.reply('📭 Книг ще немає в бібліотеці.');
                return;
            }
            await ctx.reply(`🔤 *КНИГИ ЗА АЛФАВІТОМ*\n\n` +
                `Показано ${books.length} з ${total} ${total === 1 ? 'книги' : 'книг'}:`, { parse_mode: 'Markdown' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            if (total > 10) {
                await ctx.reply(`ℹ️ Показано 10 з ${total} книг. Використовуйте пошук для інших книг.`);
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_alpha');
        }
        catch (error) {
            logger_1.logger.error('Error showing books by title', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('catalog_audio', async (ctx) => {
        try {
            await ctx.answerCbQuery('🎧 Завантаження аудіокниг...');
            const books = await (0, catalogFunctions_1.getBooksWithAudio)(10);
            if (books.length === 0) {
                await ctx.reply('📭 Поки що немає аудіокниг в бібліотеці.');
                return;
            }
            await ctx.reply(`🎧 *АУДІОКНИГИ*\n\n` +
                `Знайдено ${books.length} ${books.length === 1 ? 'аудіокнига' : 'аудіокниг'}:`, { parse_mode: 'Markdown' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_audio');
        }
        catch (error) {
            logger_1.logger.error('Error showing audio books', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('catalog_downloads', async (ctx) => {
        try {
            await ctx.answerCbQuery('📥 Завантаження популярних книг...');
            const books = await (0, models_1.getMostDownloadedBooks)(10);
            if (books.length === 0) {
                await ctx.reply('📭 Поки що немає завантажених книг.');
                return;
            }
            await ctx.reply(`📥 *НАЙПОПУЛЯРНІШІ КНИГИ*\n\n` +
                `Топ ${books.length} найбільш завантажуваних ${books.length === 1 ? 'книга' : 'книг'}:`, { parse_mode: 'Markdown' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'catalog_downloads');
        }
        catch (error) {
            logger_1.logger.error('Error showing most downloaded books', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/view_tag_(\d+)/, async (ctx) => {
        try {
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
                `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}:`, { parse_mode: 'Markdown' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'view_tag', { tagId, tagName: tag.name });
        }
        catch (error) {
            logger_1.logger.error('Error showing books by tag', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/search_tag_(\d+)/, async (ctx) => {
        try {
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
                    'Спробуйте інший тег або використайте звичайний пошук.', { parse_mode: 'Markdown' });
                return;
            }
            await ctx.reply(`🏷️ *Книги з тегом "${tag.name}"*\n\n` +
                `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}:`, { parse_mode: 'Markdown' });
            for (const book of books) {
                const caption = await (0, helpers_1.formatBookCaption)(book);
                const userId = ctx.from?.id;
                const isSaved = userId ? await (0, models_1.isBookSaved)(userId, book.id) : false;
                const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
                if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
                    await ctx.replyWithPhoto(book.photo_file_id, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
                else {
                    await ctx.reply(caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            }
            logger_1.logger.userAction(ctx.from.id, 'search_by_tag', { tagName: tag.name, resultsCount: books.length });
        }
        catch (error) {
            logger_1.logger.error('Error searching by tag', error);
            await ctx.answerCbQuery('❌ Помилка пошуку');
            await ctx.reply(constants_1.ERRORS.GENERIC);
        }
    });
    bot.action('catalog_ai', async (ctx) => {
        try {
            await ctx.answerCbQuery('🤖 Запускаю AI-підбір...');
            return ctx.scene.enter('AI_FILTER_SCENE');
        }
        catch (error) {
            logger_1.logger.error('Error starting AI filter', error);
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    console.log('✅ User handlers registered (including AI features)');
};
//# sourceMappingURL=userHandlers.js.map