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
const bookOrderFunctions_1 = require("../database/bookOrderFunctions");
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
profileScene.action('show_personal_collection', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const userService = (0, UserManagementService_1.createUserManagementService)(models_1.db);
    const result = await userService.getPersonalCollection(userId, 5);
    if (result.isErr() || result.unwrap().books.length === 0) {
        await ctx.reply('📚 Поки що рекомендацій немає. Збережіть більше книг!');
        return;
    }
    const { books, source } = result.unwrap();
    const sourceLabel = source === 'smart_recommendations'
        ? '🤖 Персональні рекомендації на основі ваших вподобань'
        : source === 'top_books'
            ? '🏆 Популярні книги'
            : '🆕 Нові надходження';
    await ctx.reply(`<b>${sourceLabel}</b>`, { parse_mode: 'HTML' });
    for (const book of books) {
        const caption = `📖 <b>${(0, helpers_1.escapeHtml)(book.title)}</b>\n👤 ${(0, helpers_1.escapeHtml)(book.author || '')}\n📚 ${(0, helpers_1.escapeHtml)(book.genre || '')}`;
        const replyMarkup = (0, mainKeyboards_1.getEnhancedBookKeyboard)(book, false);
        if (book.photo_url) {
            await ctx.replyWithPhoto(book.photo_url, { caption, parse_mode: 'HTML', reply_markup: replyMarkup });
        }
        else {
            await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: replyMarkup });
        }
    }
});
profileScene.action('start_ai_assistant', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('AI_SCENE');
});
profileScene.action('show_my_orders', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId)
        return;
    try {
        const orders = await (0, bookOrderFunctions_1.getUserBookOrders)(userId);
        if (orders.length === 0) {
            await ctx.reply('📋 У вас ще немає замовлень.');
            return;
        }
        let text = '📋 <b>Ваші замовлення:</b>\n\n';
        orders.forEach((order, i) => {
            text += `${i + 1}. 📖 <b>${(0, helpers_1.escapeHtml)(order.book_title)}</b>\n`;
            text += `   👤 ${(0, helpers_1.escapeHtml)(order.book_author)}\n`;
            text += `   📅 ${order.created_at ? new Date(order.created_at).toLocaleDateString('uk-UA') : '—'}\n\n`;
        });
        await ctx.reply(text, { parse_mode: 'HTML' });
    }
    catch (error) {
        logger_1.logger.error('Failed to get user orders', error instanceof Error ? error : new Error(String(error)));
        await ctx.reply('❌ Не вдалося завантажити замовлення.');
    }
});
profileScene.action('show_stats', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId)
        return;
    const userService = (0, UserManagementService_1.createUserManagementService)(models_1.db);
    const result = await userService.getUserStats(userId);
    if (result.isErr()) {
        await ctx.reply('❌ Не вдалося завантажити статистику.');
        return;
    }
    const statsText = userService.formatDetailedStatsText(result.unwrap());
    await ctx.reply(statsText, { parse_mode: 'HTML' });
});
profileScene.action('profile_back', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('🏠 Головне меню', { reply_markup: getMainMenuKeyboard() });
});
profileScene.leave((ctx) => {
    logger_1.logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});
exports.default = profileScene;
//# sourceMappingURL=profileScene.js.map