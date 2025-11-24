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
profileScene.action(/personal_page_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match?.[1] || '0', 10);
    const sceneState = ctx.scene.state;
    const allBooks = sceneState.personalCollectionBooks || [];
    if (!allBooks || allBooks.length === 0) {
        await ctx.answerCbQuery('❌ Помилка при завантаженні даних', { show_alert: true });
        return;
    }
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    const booksPerPage = 5;
    const paginatedBooks = allBooks.slice(page * booksPerPage, (page + 1) * booksPerPage);
    const totalPages = Math.ceil(allBooks.length / booksPerPage);
    let messageText = '📚 <b>Персональна підбірка для вас</b>\n\n';
    messageText += `Сторінка ${page + 1} з ${totalPages}\n\n`;
    paginatedBooks.forEach((book, index) => {
        const rating = book.rating ? `⭐${book.rating.toFixed(1)}` : '';
        messageText += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}${rating ? ` ${rating}` : ''}\n`;
    });
    const keyboard = paginatedBooks.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
    ]);
    const navButtons = [];
    if (page > 0) {
        navButtons.push(Markup.button.callback('⬅️ Назад', `personal_page_${page - 1}`));
    }
    if (page + 1 < totalPages) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `personal_page_${page + 1}`));
    }
    if (navButtons.length > 0) {
        keyboard.push(navButtons);
    }
    keyboard.push([Markup.button.callback('⬅️ До профілю', 'back_to_profile_from_personal')]);
    await ctx.editMessageText(messageText, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
});
profileScene.action('back_to_profile_from_personal', async (ctx) => {
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
    const userService = (0, UserManagementService_1.createUserManagementService)(models_1.db);
    const collectionResult = await userService.getPersonalCollection(userId, 10);
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
            messageText += '🤖 Створено на основі ваших вподобань, тегів та рейтингів\n\n';
            break;
        case 'top_books':
            messageText += '🤖 На основі найкращих книг каталогу\n\n';
            break;
        case 'new_books':
            messageText += '🤖 Найновіші книги каталогу\n\n';
            break;
    }
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    const booksPerPage = 5;
    const page = 0;
    const paginatedBooks = collectionData.books.slice(page * booksPerPage, (page + 1) * booksPerPage);
    const totalPages = Math.ceil(collectionData.books.length / booksPerPage);
    messageText += `Сторінка 1 з ${totalPages}\n\n`;
    paginatedBooks.forEach((book, index) => {
        const rating = book.rating ? `⭐${book.rating.toFixed(1)}` : '';
        messageText += `${index + 1}. <b>${book.title}</b> - ${book.author}${rating ? ` ${rating}` : ''}\n`;
    });
    const keyboard = paginatedBooks.map((book) => [
        Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
    ]);
    const navButtons = [];
    if (totalPages > 1) {
        navButtons.push(Markup.button.callback('Вперед ➡️', `personal_page_1`));
    }
    if (navButtons.length > 0) {
        keyboard.push(navButtons);
    }
    keyboard.push([Markup.button.callback('⬅️ До профілю', 'back_to_profile_from_personal')]);
    await ctx.reply(messageText, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
    const sceneState = ctx.scene.state;
    sceneState.personalCollectionBooks = collectionData.books;
    logger_1.logger.userAction(userId, 'ai_personal_collection', { booksFound: collectionData.count });
});
profileScene.leave((ctx) => {
    logger_1.logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});
exports.default = profileScene;
//# sourceMappingURL=profileScene.js.map