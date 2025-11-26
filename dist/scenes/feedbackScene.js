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
const feedbackScene = new telegraf_1.Scenes.BaseScene('FEEDBACK_SCENE');
feedbackScene.enter(async (ctx) => {
    const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
    await ctx.reply("📞 *ЗВОРОТНІЙ ЗВ'ЯЗОК*\n\n" +
        'Ви можете надіслати повідомлення адміністратору.\n\n' +
        '💬 Напишіть ваше повідомлення, питання або пропозицію.\n' +
        "Адміністратор отримає його одразу і зв'яжеться з вами.\n\n" +
        '📝 Що можна писати:\n' +
        '• Питання про книги\n' +
        '• Скарги або проблеми\n' +
        '• Пропозиції покращень\n' +
        '• Запити на додавання книг\n\n' +
        '✍️ Напишіть ваше повідомлення:\n\n' +
        '💡 Або використовуйте /cancel для скасування', {
        parse_mode: 'Markdown',
    });
});
feedbackScene.on('text', async (ctx) => {
    if (!('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текстове повідомлення.');
        return;
    }
    const userId = ctx.from?.id;
    const userName = ctx.from?.first_name || 'Користувач';
    const userUsername = ctx.from?.username;
    const message = ctx.message.text;
    if (!message || message.length < 3) {
        await ctx.reply('⚠️ Повідомлення занадто коротке. Будь ласка, напишіть більше деталей.');
        return;
    }
    if (!userId) {
        const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.', {
            reply_markup: getMainMenuKeyboard(),
        });
        return ctx.scene?.leave();
    }
    const { addFeedbackMessage, getAllAdmins } = await Promise.resolve().then(() => __importStar(require('../database/models')));
    await addFeedbackMessage({
        user_id: userId,
        user_name: userName,
        user_username: userUsername,
        message: message,
    })
        .then((feedbackId) => {
        logger_1.logger.info('Feedback message saved', { feedbackId, userId });
    })
        .catch((dbError) => {
        logger_1.logger.error('Error saving feedback to DB', dbError instanceof Error ? dbError : new Error(String(dbError)), { userId });
    });
    const admins = await getAllAdmins();
    if (admins.length === 0) {
        const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
        await ctx.reply('✅ *Повідомлення збережено!*\n\n' +
            'Ваше повідомлення збережено в системі.\n' +
            "Адміністратор переглянеце його найближчим часом і зв'яжеться з вами.\n\n" +
            '📱 Очікуйте відповіді в приватних повідомленнях.', { parse_mode: 'Markdown', reply_markup: getMainMenuKeyboard() });
        return ctx.scene?.leave();
    }
    const escapeMarkdown = (text) => {
        return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    };
    const safeName = escapeMarkdown(userName);
    const safeUsername = userUsername ? escapeMarkdown(userUsername) : '';
    const safeMessage = escapeMarkdown(message);
    const adminMessage = "📞 *НОВЕ ПОВІДОМЛЕННЯ ЗВОРОТНОГО ЗВ'ЯЗКУ*\n\n" +
        `👤 Від: ${safeName}\n` +
        `🆔 User ID: \`${userId}\`\n` +
        `📱 Username: ${userUsername ? '@' + safeUsername : 'немає'}\n\n` +
        '💬 *Повідомлення:*\n' +
        `"${safeMessage}"\n\n` +
        `📅 Дата: ${escapeMarkdown(new Date().toLocaleString('uk-UA'))}`;
    let sentCount = 0;
    for (const admin of admins) {
        await ctx.telegram
            .sendMessage(admin.user_id, adminMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '💬 Відповісти',
                            url: `tg://user?id=${userId}`,
                        },
                    ],
                ],
            },
        })
            .then(() => {
            sentCount++;
        })
            .catch((error) => {
            logger_1.logger.error('Error sending to admin', error instanceof Error ? error : new Error(String(error)), { adminId: admin.user_id });
        });
    }
    if (sentCount > 0) {
        await ctx.reply('✅ *Повідомлення надіслано!*\n\n' +
            `Ваше повідомлення отримали ${sentCount} адміністратор${sentCount > 1 ? 'и' : ''}.\n` +
            'Очікуйте відповіді найближчим часом.\n\n' +
            "📱 Адміністратор може зв'язатися з вами через приватні повідомлення.", { parse_mode: 'Markdown' });
    }
    else {
        await ctx.reply('✅ *Повідомлення збережено!*\n\n' +
            'Не вдалося надіслати адміністраторам напряму, але ваше повідомлення збережено в системі.\n' +
            "Адміністратор переглянеце його в панелі управління і зв'яжеться з вами.\n\n" +
            '📱 Очікуйте відповіді в приватних повідомленнях.', { parse_mode: 'Markdown' });
    }
    await ctx.scene?.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('🏠 Повертаємось до головного меню', {
        reply_markup: getMainMenuKeyboard(),
    });
    return;
});
feedbackScene.command('cancel', async (ctx) => {
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('❌ Відправка повідомлення скасована.', {
        reply_markup: getMainMenuKeyboard(),
    });
    return ctx.scene?.leave();
});
feedbackScene.hears('/cancel', async (ctx) => {
    await ctx.scene?.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('❌ Відправка повідомлення скасована', {
        reply_markup: getMainMenuKeyboard(),
    });
    return;
});
exports.default = feedbackScene;
//# sourceMappingURL=feedbackScene.js.map