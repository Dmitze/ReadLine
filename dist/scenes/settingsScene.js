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
const userPreferences_1 = require("../utils/userPreferences");
const logger_1 = require("../utils/logger");
const settingsScene = new telegraf_1.Scenes.BaseScene('SETTINGS_SCENE');
settingsScene.enter(async (ctx) => {
    await ctx.reply('⚙️ <b>Налаштування</b>\n\n' + 'Оберіть що хочете налаштувати:', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📱 Тип клавіатури', callback_data: 'settings_keyboard' }],
                [{ text: '🔔 Сповіщення', callback_data: 'settings_notifications' }],
                [{ text: '🏠 На головну', callback_data: 'settings_exit' }],
            ],
        },
    });
});
settingsScene.action('settings_keyboard', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('📱 <b>Тип клавіатури</b>\n\n' +
        'Оберіть тип клавіатури який найкраще підходить для вашого пристрою:\n\n' +
        '📱 <b>Мобільний</b> - великі кнопки, 2 в ряд\n' +
        '📲 <b>Планшет</b> - компактніші кнопки, 3 в ряд\n' +
        '💻 <b>Десктоп</b> - inline клавіатури, 4 в ряд', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📱 Мобільний', callback_data: 'keyboard_mobile' }],
                [{ text: '📲 Планшет', callback_data: 'keyboard_tablet' }],
                [{ text: '💻 Десктоп', callback_data: 'keyboard_desktop' }],
                [{ text: '⬅️ Назад', callback_data: 'settings_back' }],
            ],
        },
    });
});
settingsScene.action(/keyboard_(mobile|tablet|desktop)/, async (ctx) => {
    if (!ctx.match) {
        await ctx.answerCbQuery('❌ Помилка');
        return;
    }
    const deviceType = ctx.match[1];
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.answerCbQuery('❌ Помилка');
        return;
    }
    try {
        const success = (0, userPreferences_1.setUserKeyboardPreference)(userId, deviceType);
        if (success) {
            const deviceNames = {
                mobile: '📱 Мобільний',
                tablet: '📲 Планшет',
                desktop: '💻 Десктоп',
            };
            await ctx.answerCbQuery('✅ Збережено');
            await ctx.editMessageText('✅ <b>Тип клавіатури змінено</b>\n\n' +
                `Обрано: ${deviceNames[deviceType]}\n\n` +
                'Зміни застосуються при наступному відкритті меню.', {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Назад до налаштувань', callback_data: 'settings_back' }],
                        [{ text: '🏠 На головну', callback_data: 'settings_exit' }],
                    ],
                },
            });
            logger_1.logger.userAction(userId, 'change_keyboard_type', { deviceType });
        }
        else {
            await ctx.answerCbQuery('❌ Помилка збереження');
        }
    }
    catch (error) {
        logger_1.logger.error('Error changing keyboard type', error, { userId });
        await ctx.answerCbQuery('❌ Помилка');
    }
});
settingsScene.action('settings_notifications', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.answerCbQuery('❌ Помилка');
        return;
    }
    const { getUserNotificationSettings } = await Promise.resolve().then(() => __importStar(require('../utils/notifications')));
    const settings = await getUserNotificationSettings(userId);
    const frequencyNames = {
        daily: 'Щодня',
        every_4_days: 'Раз на 4 дні',
        weekly: 'Раз на тиждень',
        disabled: 'Вимкнено',
    };
    await ctx.answerCbQuery();
    await ctx.editMessageText('🔔 <b>Налаштування сповіщень</b>\n\n' +
        `Статус: ${settings.enabled ? '✅ Увімкнено' : '❌ Вимкнено'}\n` +
        `Частота: ${frequencyNames[settings.frequency]}\n` +
        `Час: ${settings.preferredTime || '10:00'}\n\n` +
        'Оберіть що хочете змінити:', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: settings.enabled ? '🔕 Вимкнути сповіщення' : '🔔 Увімкнути сповіщення',
                        callback_data: 'notif_toggle',
                    },
                ],
                [{ text: '⏰ Змінити частоту', callback_data: 'notif_frequency' }],
                [{ text: '🕐 Змінити час', callback_data: 'notif_time' }],
                [{ text: '⬅️ Назад', callback_data: 'settings_back' }],
            ],
        },
    });
});
settingsScene.action('notif_toggle', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.answerCbQuery('❌ Помилка');
        return;
    }
    const { getUserNotificationSettings, setUserNotificationSettings } = await Promise.resolve().then(() => __importStar(require('../utils/notifications')));
    const settings = await getUserNotificationSettings(userId);
    const previousState = settings.enabled;
    settings.enabled = !settings.enabled;
    await setUserNotificationSettings(settings);
    await ctx.answerCbQuery(settings.enabled ? '✅ Сповіщення увімкнено' : '🔕 Сповіщення вимкнено');
    const frequencyNames = {
        daily: 'Щодня',
        every_4_days: 'Раз на 4 дні',
        weekly: 'Раз на тиждень',
        disabled: 'Вимкнено',
    };
    try {
        await ctx.editMessageText('🔔 <b>Налаштування сповіщень</b>\n\n' +
            `Статус: ${settings.enabled ? '✅ Увімкнено' : '❌ Вимкнено'}\n` +
            `Частота: ${frequencyNames[settings.frequency]}\n` +
            `Час: ${settings.preferredTime || '10:00'}\n\n` +
            'Оберіть що хочете змінити:', {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: settings.enabled ? '🔕 Вимкнути сповіщення' : '🔔 Увімкнути сповіщення',
                            callback_data: 'notif_toggle',
                        },
                    ],
                    [{ text: '⏰ Змінити частоту', callback_data: 'notif_frequency' }],
                    [{ text: '🕐 Змінити час', callback_data: 'notif_time' }],
                    [{ text: '⬅️ Назад', callback_data: 'settings_back' }],
                ],
            },
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('message is not modified')) {
            logger_1.logger.warn('Notification toggle: message content unchanged', { userId });
        }
        else {
            logger_1.logger.error('Error updating notification settings message', error);
            throw error;
        }
    }
});
settingsScene.action('notif_frequency', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('⏰ <b>Частота сповіщень</b>\n\n' + 'Як часто ви хочете отримувати нагадування?', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📅 Щодня', callback_data: 'freq_daily' }],
                [{ text: '📆 Раз на 4 дні', callback_data: 'freq_every_4_days' }],
                [{ text: '📅 Раз на тиждень', callback_data: 'freq_weekly' }],
                [{ text: '🔕 Вимкнути', callback_data: 'freq_disabled' }],
                [{ text: '⬅️ Назад', callback_data: 'settings_notifications' }],
            ],
        },
    });
});
settingsScene.action(/freq_(daily|every_4_days|weekly|disabled)/, async (ctx) => {
    if (!ctx.match) {
        await ctx.answerCbQuery('❌ Помилка');
        return;
    }
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.answerCbQuery('❌ Помилка');
        return;
    }
    const frequency = ctx.match[1];
    const { getUserNotificationSettings, setUserNotificationSettings } = await Promise.resolve().then(() => __importStar(require('../utils/notifications')));
    const settings = await getUserNotificationSettings(userId);
    settings.frequency = frequency;
    if (frequency === 'disabled') {
        settings.enabled = false;
    }
    await setUserNotificationSettings(settings);
    const frequencyNames = {
        daily: 'Щодня',
        every_4_days: 'Раз на 4 дні',
        weekly: 'Раз на тиждень',
        disabled: 'Вимкнено',
    };
    await ctx.answerCbQuery('✅ Збережено');
    try {
        await ctx.editMessageText('✅ <b>Частота змінена</b>\n\n' + `Нова частота: ${frequencyNames[frequency]}`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⬅️ Назад до сповіщень', callback_data: 'settings_notifications' }],
                    [{ text: '🏠 На головну', callback_data: 'settings_exit' }],
                ],
            },
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('message is not modified')) {
            logger_1.logger.warn('Frequency change: message content unchanged', { userId, frequency });
        }
        else {
            logger_1.logger.error('Error updating frequency message', error);
        }
    }
});
settingsScene.action('notif_time', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('🕐 <b>Час сповіщень</b>\n\n' +
        'Налаштування часу буде доступне незабаром!\n\n' +
        'За замовчуванням сповіщення надсилаються о 10:00.', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'settings_notifications' }]],
        },
    });
});
settingsScene.action('settings_back', async (ctx) => {
    await ctx.answerCbQuery();
    try {
        await ctx.editMessageText('⚙️ <b>Налаштування</b>\n\n' + 'Оберіть що хочете налаштувати:', {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📱 Тип клавіатури', callback_data: 'settings_keyboard' }],
                    [{ text: '🔔 Сповіщення', callback_data: 'settings_notifications' }],
                    [{ text: '🏠 На головну', callback_data: 'settings_exit' }],
                ],
            },
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('message is not modified')) {
            logger_1.logger.warn('Settings back: message already current');
        }
        else {
            logger_1.logger.error('Error navigating back to settings', error);
        }
    }
});
settingsScene.action('settings_exit', async (ctx) => {
    await ctx.answerCbQuery('🏠 Повернення на головну');
    await ctx.scene.leave();
    const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/mainKeyboards')));
    await ctx.reply('🏠 Ви повернулись на головну', {
        reply_markup: getMainMenuKeyboard(),
    });
});
settingsScene.command('cancel', async (ctx) => {
    await ctx.scene.leave();
    await ctx.reply('❌ Налаштування закрито');
});
exports.default = settingsScene;
//# sourceMappingURL=settingsScene.js.map