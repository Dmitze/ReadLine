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
profileScene.leave((ctx) => {
    logger_1.logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});
exports.default = profileScene;
//# sourceMappingURL=profileScene.js.map