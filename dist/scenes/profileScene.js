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
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
const recommendationFunctions_1 = require("../database/recommendationFunctions");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const profileScene = new telegraf_1.Scenes.BaseScene('PROFILE_SCENE');
profileScene.enter(async (ctx) => {
    if (!ctx.from?.id) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
        return ctx.scene?.leave();
    }
    const userId = ctx.from.id;
    const firstName = (0, helpers_1.escapeHtml)(ctx.from.first_name || '');
    const lastName = (0, helpers_1.escapeHtml)(ctx.from.last_name || '');
    const username = ctx.from.username ? `@${(0, helpers_1.escapeHtml)(ctx.from.username)}` : 'не встановлено';
    const { getUserDetailedStats } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
    const stats = await getUserDetailedStats(userId);
    let profileText = '<b>👤 Ваш профіль</b>\n\n';
    profileText += `🆔 ID: ${userId}\n`;
    profileText += `👤 Ім'я: ${firstName} ${lastName}\n`;
    profileText += `🔖 Username: ${username}\n\n`;
    profileText += '<b>📊 Статистика</b>\n';
    profileText += `💾 Збережених книг: ${stats.savedBooksCount}\n`;
    profileText += `⭐ Залишено відгуків: ${stats.reviewsCount}\n`;
    const hours = Math.floor(stats.totalListeningTime / 3600);
    const minutes = Math.floor((stats.totalListeningTime % 3600) / 60);
    profileText += `🎧 Прослухано: ${hours}г ${minutes}хв\n`;
    const { getSavedBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
    const { getBookTags } = await Promise.resolve().then(() => __importStar(require('../database/tagFunctions')));
    const savedBooks = await getSavedBooks(userId);
    const genresFromBooks = new Set();
    savedBooks.forEach(book => {
        if (book.genre) {
            genresFromBooks.add(book.genre);
        }
    });
    const allGenres = [...new Set([...stats.favoriteGenres, ...Array.from(genresFromBooks)])];
    if (allGenres.length > 0) {
        profileText += '\n<b>📚 Улюблені жанри:</b>\n';
        allGenres.slice(0, 5).forEach((genre, i) => {
            profileText += `${i + 1}. ${genre}\n`;
        });
    }
    else {
        profileText += '\n<i>📚 Улюблені жанри ще не встановлені</i>\n';
    }
    if (savedBooks.length > 0) {
        const allUserTags = new Set();
        for (const book of savedBooks) {
            const bookTags = await getBookTags(book.id);
            bookTags.forEach(tag => allUserTags.add(tag.name));
        }
        if (allUserTags.size > 0) {
            profileText += '\n<b>🏷️ Ваші інтереси (теги):</b>\n';
            const tagsArray = Array.from(allUserTags).slice(0, 10);
            profileText += tagsArray.map(tag => `#${tag}`).join(' ') + '\n';
        }
    }
    profileText += '\n<i>💡 Продовжуйте читати та залишати відгуки!</i>';
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    await ctx.reply(profileText, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
            [{ text: '🤖 Персональні рекомендації', callback_data: 'show_personal_collection' }],
            [{ text: '🎯 AI Підбір книги', callback_data: 'start_ai_assistant' }],
            [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
            [{ text: '⬅️ Назад', callback_data: 'profile_back' }]
        ]).reply_markup
    });
    logger_1.logger.userAction(userId, 'view_profile');
});
profileScene.action('show_stats', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const { getUserDetailedStats } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
    const stats = await getUserDetailedStats(userId);
    const hours = Math.floor(stats.totalListeningTime / 3600);
    const minutes = Math.floor((stats.totalListeningTime % 3600) / 60);
    let statsText = '📊 <b>Ваша детальна статистика</b>\n\n';
    statsText += `💾 Збережено книг: ${stats.savedBooksCount}\n`;
    statsText += `⭐ Залишено відгуків: ${stats.reviewsCount}\n`;
    statsText += `🎧 Прослухано: ${hours}г ${minutes}хв\n\n`;
    if (stats.favoriteGenres.length > 0) {
        statsText += '📚 *Улюблені жанри:*\n';
        stats.favoriteGenres.forEach((genre, index) => {
            statsText += `${index + 1}. ${genre}\n`;
        });
        statsText += '\n';
    }
    else {
        statsText += '📚 *Улюблені жанри:* не встановлені\n\n';
    }
    statsText += '💡 Продовжуйте читати та слухати!';
    await ctx.reply(statsText, { parse_mode: 'HTML' });
    logger_1.logger.userAction(userId, 'view_stats');
});
profileScene.action('start_ai_assistant', async (ctx) => {
    await ctx.answerCbQuery('🤖 Запускаю AI Підбір...');
    logger_1.logger.userAction(ctx.from.id, 'start_ai_assistant_from_profile');
    await ctx.scene?.leave();
    return ctx.scene?.enter('AI_ASSISTANT_SCENE');
});
profileScene.action('profile_back', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene?.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('👋 Повертаємось до головного меню', {
        reply_markup: getMainMenuKeyboard()
    });
});
profileScene.action('show_personal_collection', async (ctx) => {
    await ctx.answerCbQuery('🤖 Генерую персональну підбірку...');
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка ідентифікації користувача');
        return;
    }
    await ctx.reply('🤖 Аналізую ваші вподобання та створюю персональну підбірку...');
    const { isBookSaved, getTopBooks, getNewestBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
    let collection = await (0, recommendationFunctions_1.getSmartRecommendations)(userId, 5);
    if (collection.length === 0) {
        const topBooks = await getTopBooks(3);
        if (topBooks.length > 0) {
            collection = topBooks;
            await ctx.reply('📚 <b>Персональна підбірка для вас</b>\n\n' +
                '🤖 На основі найкращих книг каталогу\n' +
                `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`, { parse_mode: 'HTML' });
        }
        else {
            const newBooks = await getNewestBooks(3);
            if (newBooks.length > 0) {
                collection = newBooks;
                await ctx.reply('📚 <b>Персональна підбірка для вас</b>\n\n' +
                    '🤖 Найновіші книги каталогу\n' +
                    `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`, { parse_mode: 'HTML' });
            }
            else {
                await ctx.reply('😔 Не вдалося створити персональну підбірку. В каталозі поки немає книг.');
                return;
            }
        }
    }
    else {
        await ctx.reply('📚 <b>Персональна підбірка для вас</b>\n\n' +
            '🤖 Створено на основі ваших вподобань, тегів та рейтингів\n' +
            `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`, { parse_mode: 'HTML' });
    }
    const { formatBookCaption } = await Promise.resolve().then(() => __importStar(require('../utils/helpers')));
    for (const book of collection) {
        const caption = await formatBookCaption(book);
        const isSaved = await isBookSaved(userId, book.id);
        const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
        if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
            await ctx.replyWithPhoto(book.photo_file_id, {
                caption,
                parse_mode: 'HTML',
                reply_markup: keyboard
            }).catch((photoError) => {
                logger_1.logger.debug('Photo error, sending as text');
                ctx.reply(caption, {
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
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    logger_1.logger.userAction(userId, 'ai_personal_collection', { booksFound: collection.length });
});
profileScene.leave((ctx) => {
    logger_1.logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});
exports.default = profileScene;
//# sourceMappingURL=profileScene.js.map