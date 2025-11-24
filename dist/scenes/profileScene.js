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
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const UserManagementService_1 = require("../services/UserManagementService");
const models_1 = require("../database/models");
const profileScene = new telegraf_1.Scenes.BaseScene('PROFILE_SCENE');
profileScene.enter(async (ctx) => {
    if (!ctx.from?.id) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
        return ctx.scene?.leave();
    }
    const userId = ctx.from.id;
    const userService = (0, UserManagementService_1.createUserManagementService)(models_1.db);
    const profileResult = await userService.getUserProfile(userId);
    if (profileResult.isErr()) {
        logger_1.logger.error('Failed to get user profile', profileResult.error);
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
        return ctx.scene?.leave();
    }
    const profile = profileResult.unwrap();
    profile.firstName = (0, helpers_1.escapeHtml)(ctx.from.first_name || '');
    profile.lastName = (0, helpers_1.escapeHtml)(ctx.from.last_name || '');
    profile.username = ctx.from.username ? `@${(0, helpers_1.escapeHtml)(ctx.from.username)}` : 'не встановлено';
    const profileText = userService.formatProfileText(profile);
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    await ctx.reply(profileText, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
            [{ text: '🤖 Персональні рекомендації', callback_data: 'show_personal_collection' }],
            [{ text: '🎯 AI Підбір книги', callback_data: 'start_ai_assistant' }],
            [{ text: '📋 Мої замовлення', callback_data: 'show_my_orders' }],
            [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
            [{ text: '⬅️ Назад', callback_data: 'profile_back' }],
        ]).reply_markup,
    });
    logger_1.logger.userAction(userId, 'view_profile');
});
profileScene.action('show_stats', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const userService = (0, UserManagementService_1.createUserManagementService)(models_1.db);
    const statsResult = await userService.getUserStats(userId);
    if (statsResult.isErr()) {
        logger_1.logger.error('Failed to get user stats', statsResult.error);
        await ctx.reply('❌ Помилка при завантаженні статистики.');
        return;
    }
    const stats = statsResult.unwrap();
    const statsText = userService.formatDetailedStatsText(stats);
    await ctx.reply(statsText, { parse_mode: 'HTML' });
    logger_1.logger.userAction(userId, 'view_stats');
});
profileScene.action('start_ai_assistant', async (ctx) => {
    await ctx.answerCbQuery('🤖 Запускаю AI Підбір...');
    if (ctx.from?.id) {
        logger_1.logger.userAction(ctx.from.id, 'start_ai_assistant_from_profile');
    }
    await ctx.scene?.leave();
    return ctx.scene?.enter('AI_ASSISTANT_SCENE');
});
profileScene.action('show_my_orders', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача');
        return;
    }
    try {
        const { getUserBookOrders } = await Promise.resolve().then(() => __importStar(require('../database/bookOrderFunctions')));
        const orders = await getUserBookOrders(userId);
        if (!orders || orders.length === 0) {
            await ctx.reply('📋 У вас поки немає замовлень книг.');
            return;
        }
        let ordersText = '📋 <b>МОЇ ЗАМОВЛЕННЯ</b>\n\n';
        orders.forEach((order, index) => {
            ordersText += `<b>#${index + 1} Замовлення ${order.id}</b>\n`;
            ordersText += `📖 Книга: ${(0, helpers_1.escapeHtml)(order.book_title || 'Невідома')}\n`;
            ordersText += `👤 Автор: ${(0, helpers_1.escapeHtml)(order.book_author || 'Невідомий')}\n`;
            ordersText += `📅 Дата: ${new Date(order.created_at || '').toLocaleDateString('uk-UA')}\n\n`;
        });
        await ctx.reply(ordersText, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: '⬅️ Назад до профілю', callback_data: 'back_to_profile_from_orders' }]],
            },
        });
        logger_1.logger.userAction(userId, 'view_my_orders', { ordersCount: orders.length });
    }
    catch (error) {
        logger_1.logger.error('Error fetching user orders', error);
        await ctx.reply('❌ Помилка при завантаженні замовлень.');
    }
});
profileScene.action('back_to_profile_from_orders', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const userService = (0, UserManagementService_1.createUserManagementService)(models_1.db);
    const profileResult = await userService.getUserProfile(userId);
    if (profileResult.isErr()) {
        await ctx.reply('❌ Помилка при завантаженні профілю.');
        return;
    }
    const profile = profileResult.unwrap();
    profile.firstName = (0, helpers_1.escapeHtml)(ctx.from.first_name || '');
    profile.lastName = (0, helpers_1.escapeHtml)(ctx.from.last_name || '');
    profile.username = ctx.from.username ? `@${(0, helpers_1.escapeHtml)(ctx.from.username)}` : 'не встановлено';
    const profileText = userService.formatProfileText(profile);
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    await ctx.editMessageText(profileText, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
            [{ text: '🤖 Персональні рекомендації', callback_data: 'show_personal_collection' }],
            [{ text: '🎯 AI Підбір книги', callback_data: 'start_ai_assistant' }],
            [{ text: '📋 Мої замовлення', callback_data: 'show_my_orders' }],
            [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
            [{ text: '⬅️ Назад', callback_data: 'profile_back' }],
        ]).reply_markup,
    });
});
profileScene.action('profile_back', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene?.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('👋 Повертаємось до головного меню', {
        reply_markup: getMainMenuKeyboard(),
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
    const userService = (0, UserManagementService_1.createUserManagementService)(models_1.db);
    const collectionResult = await userService.getPersonalCollection(userId, 5);
    if (collectionResult.isErr()) {
        logger_1.logger.error('Failed to get personal collection', collectionResult.error);
        await ctx.reply('❌ Помилка при створенні персональної підбірки.');
        return;
    }
    const collectionData = collectionResult.unwrap();
    if (collectionData.books.length === 0) {
        await ctx.reply('😔 Не вдалося створити персональну підбірку. В каталозі поки немає книг.');
        return;
    }
    let messageText = '📚 <b>Персональна підбірка для вас</b>\n\n';
    switch (collectionData.source) {
        case 'smart_recommendations':
            messageText += '🤖 Створено на основі ваших вподобань, тегів та рейтингів\n';
            break;
        case 'top_books':
            messageText += '🤖 На основі найкращих книг каталогу\n';
            break;
        case 'new_books':
            messageText += '🤖 Найновіші книги каталогу\n';
            break;
    }
    messageText += `📖 Знайдено ${collectionData.count} ${collectionData.count === 1 ? 'книгу' : 'книг'}`;
    await ctx.reply(messageText, { parse_mode: 'HTML' });
    const { formatBookCaption } = await Promise.resolve().then(() => __importStar(require('../utils/helpers')));
    const { isBookSaved } = await Promise.resolve().then(() => __importStar(require('../database/models')));
    for (const book of collectionData.books) {
        const caption = await formatBookCaption(book);
        const isSaved = await isBookSaved(userId, book.id);
        const keyboard = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, isSaved);
        if (book.photo_file_id &&
            book.photo_file_id !== 'default_book_cover' &&
            book.photo_file_id.length > 20) {
            await ctx
                .replyWithPhoto(book.photo_file_id, {
                caption,
                parse_mode: 'HTML',
                reply_markup: keyboard,
            })
                .catch((photoError) => {
                logger_1.logger.debug('Photo error, sending as text');
                ctx.reply(caption, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                });
            });
        }
        else {
            await ctx.reply(caption, {
                parse_mode: 'HTML',
                reply_markup: keyboard,
            });
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    logger_1.logger.userAction(userId, 'ai_personal_collection', { booksFound: collectionData.count });
});
profileScene.leave((ctx) => {
    logger_1.logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});
exports.default = profileScene;
//# sourceMappingURL=profileScene.js.map