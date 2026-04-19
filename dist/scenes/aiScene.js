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
const aiHelper_1 = require("../utils/aiHelper");
const logger_1 = require("../utils/logger");
const aiScene = new telegraf_1.Scenes.BaseScene('AI_SCENE');
aiScene.enter(async (ctx) => {
    await ctx.reply('<b>🤖 AI-ПОМІЧНИК ЧИТАЛЬНОГО ЗАЛУ</b>\n\n' +
        '<i>Розумний помічник для роботи з книгами та літературою</i>\n\n' +
        '<b>Я можу допомогти вам з:</b>\n' +
        '📚 <b>Рекомендаціями книг</b> - знайду ідеальну книгу для вас\n' +
        '🔍 <b>Пошуком книг</b> - опишіть, що вас цікавить\n' +
        '✍️ <b>Інформацією про авторів</b> - розповім про письменників\n' +
        '📖 <b>Поясненням жанрів</b> - допоможу розібратися в стилях\n' +
        '💡 <b>Питаннями про літературу</b> - відповідам на будь-які питання\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '<b>✍️ Напишіть ваше питання:</b>\n\n' +
        '<b>💡 Приклади запитань:</b>\n' +
        '• "Порекомендуй книгу про космос та пригоди"\n' +
        '• "Розкажи про жанр фантастика та його особливості"\n' +
        '• "Хто такий Тарас Шевченко та які його найкращі твори?"\n' +
        '• "Які книги подобаються любителям детективів?"\n' +
        '• "Дай топ 5 класичних романів"\n\n' +
        '💡 Або використовуйте /cancel для виходу', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[{ text: '⬅️ Назад до меню', callback_data: 'ai_back' }]],
        },
    });
});
aiScene.command('cancel', async (ctx) => {
    await ctx.scene?.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('👋 Вихід з AI-помічника', {
        reply_markup: getMainMenuKeyboard(),
    });
    return;
});
aiScene.action('ai_ask_more', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('✍️ Напишіть наступне питання:');
});
aiScene.action('ai_back', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene?.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('🏠 Повернувся до головного меню', {
        reply_markup: getMainMenuKeyboard(),
    });
});
aiScene.on('text', async (ctx) => {
    const { withTimeout, retryOperation } = await Promise.resolve().then(() => __importStar(require('../utils/errorHandler')));
    const { CONFIG } = await Promise.resolve().then(() => __importStar(require('../constants')));
    if (!('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текстове повідомлення.');
        return;
    }
    const question = ctx.message.text;
    if (!question || question.length < 3) {
        await ctx.reply('⚠️ Питання занадто коротке. Напишіть більше деталей.');
        return;
    }
    const thinkingMsg = await ctx.reply('🤔 Думаю...');
    const aiResponse = await withTimeout(() => retryOperation(() => (0, aiHelper_1.askAI)(question, ctx.from?.id), 2, 1000), CONFIG.AI_TIMEOUT_MS, 'AI request timeout');
    await ctx.deleteMessage(thinkingMsg.message_id).catch((err) => {
        logger_1.logger.debug('Failed to delete thinking message', { error: err?.message });
    });
    const modelInfo = aiResponse.provider !== 'Fallback'
        ? `\n\n<i>🤖 Модель: ${aiResponse.model} (${aiResponse.provider})</i>`
        : '';
    await ctx.reply(`🤖 AI-ПОМІЧНИК:\n\n${aiResponse.text}${modelInfo}`, {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [{ text: '💬 Запитати ще', callback_data: 'ai_ask_more' }],
            [{ text: '⬅️ Назад до меню', callback_data: 'ai_back' }],
        ]).reply_markup,
    });
});
aiScene.on('message', async (ctx) => {
    await ctx.reply('❓ Будь ласка, напишіть текстове питання.\n' + 'Або натисніть "⬅️ Назад до меню" для виходу.');
});
aiScene.leave((ctx) => {
    logger_1.logger.debug('AIScene cleanup completed', { userId: ctx.from?.id });
});
exports.default = aiScene;
//# sourceMappingURL=aiScene.js.map