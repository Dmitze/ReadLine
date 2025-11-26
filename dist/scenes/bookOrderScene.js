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
const bookOrderFunctions_1 = require("../database/bookOrderFunctions");
const logger_1 = require("../utils/logger");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const bookOrderScene = new telegraf_1.Scenes.WizardScene('BOOK_ORDER_SCENE', async (ctx) => {
    const state = ctx.scene.state;
    const bookId = state.bookId;
    if (!bookId) {
        await ctx.reply('❌ Помилка: не вказано книгу');
        return ctx.scene.leave();
    }
    const book = await (0, models_1.getBookById)(bookId);
    if (!book) {
        await ctx.reply('❌ Книгу не знайдено');
        return ctx.scene.leave();
    }
    if (!book.is_physically_available) {
        await ctx.reply('❌ Ця книга недоступна для замовлення - немає фізичного примірника');
        return ctx.scene.leave();
    }
    const alreadyOrdered = await (0, bookOrderFunctions_1.hasUserOrderedBook)(ctx.from.id, bookId);
    if (alreadyOrdered) {
        await ctx.reply('⚠️ <b>Ви вже замовляли цю книгу!</b>\n\n' +
            'Перегляньте свої замовлення в профілі або зв\'яжіться з адміністратором.', {
            parse_mode: 'HTML',
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
        });
        return ctx.scene.leave();
    }
    state.bookTitle = book.title;
    state.bookAuthor = book.author;
    state.step = 'full_name';
    await ctx.reply('📋 <b>ЗАМОВЛЕННЯ КНИГИ</b>\n\n' +
        `📖 Книга: ${book.title}\n` +
        `👤 Автор: ${book.author}\n\n` +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        'Для замовлення книги заповніть контактні дані.\n' +
        'Адміністратор зв\'яжеться з вами для узгодження деталей.\n\n' +
        '👤 <b>КРОК 1/4: ПІБ</b>\n\n' +
        'Введіть ваше повне ім\'я:\n' +
        '💡 <i>Приклад: Іваненко Іван Іванович</i>', {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.keyboard([['❌ Скасувати']]).resize().reply_markup
    });
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.scene.state;
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст.');
        return;
    }
    const text = ctx.message.text.trim();
    if (text === '❌ Скасувати') {
        await ctx.reply('❌ Замовлення скасовано.', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
        });
        return ctx.scene.leave();
    }
    if (state.step === 'full_name') {
        if (text.length < 5) {
            await ctx.reply('❌ ПІБ занадто короткий. Мінімум 5 символів. Спробуйте ще раз:');
            return;
        }
        if (!/[а-яА-ЯіІїЇєЄґҐ]/.test(text)) {
            await ctx.reply('❌ Будь ласка, введіть ПІБ кирилицею. Спробуйте ще раз:');
            return;
        }
        state.full_name = text;
        state.step = 'callsign';
        await ctx.reply('✅ ПІБ збережено!\n\n' +
            '🎯 <b>КРОК 2/4: ПОЗИВНИЙ</b>\n\n' +
            'Введіть ваш позивний:\n\n' +
            '💡 <i>Приклад: Воїн, Сокіл, Грім тощо</i>', { parse_mode: 'HTML' });
        return;
    }
    if (state.step === 'callsign') {
        if (text.length < 2) {
            await ctx.reply('❌ Позивний занадто короткий. Мінімум 2 символи. Спробуйте ще раз:');
            return;
        }
        state.callsign = text;
        state.step = 'unit';
        await ctx.reply('✅ Позивний збережено!\n\n' +
            '🏢 <b>КРОК 3/4: ПІДРОЗДІЛ</b>\n\n' +
            'Введіть ваш підрозділ:\n\n' +
            '💡 <i>Приклад: 1-ша рота, 2-й батальйон, штаб тощо</i>', { parse_mode: 'HTML' });
        return;
    }
    if (state.step === 'unit') {
        if (text.length < 3) {
            await ctx.reply('❌ Назва підрозділу занадто коротка. Мінімум 3 символи. Спробуйте ще раз:');
            return;
        }
        state.unit = text;
        state.step = 'phone';
        await ctx.reply('✅ Підрозділ збережено!\n\n' +
            '📞 <b>КРОК 4/4: ТЕЛЕФОН</b>\n\n' +
            'Введіть ваш номер телефону:\n\n' +
            '💡 <i>Приклад: +380501234567 або 0501234567</i>', { parse_mode: 'HTML' });
        return;
    }
    if (state.step === 'phone') {
        const phoneRegex = /^(\+?380|0)[0-9]{9}$/;
        const cleanPhone = text.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            await ctx.reply('❌ Невірний формат телефону.\n\n' +
                'Введіть номер у форматі:\n' +
                '+380501234567 або 0501234567\n\n' +
                'Спробуйте ще раз:');
            return;
        }
        state.phone = cleanPhone;
        state.step = 'confirm';
        await ctx.reply('✅ <b>ПЕРЕВІРТЕ ДАНІ</b>\n\n' +
            `📖 Книга: ${state.bookTitle}\n` +
            `👤 Автор: ${state.bookAuthor}\n\n` +
            '━━━━━━━━━━━━━━━━━━━\n\n' +
            '<b>ВАШІ КОНТАКТНІ ДАНІ:</b>\n\n' +
            `👤 ПІБ: ${state.full_name}\n` +
            `🎯 Позивний: ${state.callsign}\n` +
            `🏢 Підрозділ: ${state.unit}\n` +
            `📞 Телефон: ${state.phone}\n\n` +
            '━━━━━━━━━━━━━━━━━━━\n\n' +
            'Все вірно?', {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('✅ Підтвердити', 'confirm_order')],
                [telegraf_1.Markup.button.callback('❌ Скасувати', 'cancel_order')]
            ]).reply_markup
        });
        return ctx.wizard.next();
    }
}, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }
    const action = ctx.callbackQuery.data;
    const state = ctx.scene.state;
    if (action === 'confirm_order') {
        try {
            await ctx.answerCbQuery('✅ Створюємо замовлення...');
            const orderId = await (0, bookOrderFunctions_1.createBookOrder)({
                book_id: state.bookId,
                user_id: ctx.from.id,
                full_name: state.full_name,
                callsign: state.callsign,
                unit: state.unit,
                phone: state.phone
            });
            logger_1.logger.info(`Book order created: ${orderId} by user ${ctx.from.id} for book ${state.bookId}`);
            await ctx.editMessageText('✅ <b>ЗАМОВЛЕННЯ СТВОРЕНО!</b>\n\n' +
                `📋 Номер замовлення: #${orderId}\n\n` +
                `📖 Книга: ${state.bookTitle}\n` +
                `👤 Автор: ${state.bookAuthor}\n\n` +
                '━━━━━━━━━━━━━━━━━━━\n\n' +
                '📞 Адміністратор зв\'яжеться з вами найближчим часом\n' +
                'для узгодження деталей отримання книги.\n\n' +
                '💡 Ви можете переглянути свої замовлення в профілі.', {
                parse_mode: 'HTML'
            });
            await ctx.reply('Виберіть дію:', {
                reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
            });
            try {
                const { getAllAdmins } = await Promise.resolve().then(() => __importStar(require('../database/models')));
                const admins = await getAllAdmins();
                for (const admin of admins) {
                    try {
                        await ctx.telegram.sendMessage(admin.user_id, '🔔 <b>НОВЕ ЗАМОВЛЕННЯ КНИГИ!</b>\n\n' +
                            `📋 Замовлення #${orderId}\n\n` +
                            `📖 Книга: ${state.bookTitle}\n` +
                            `👤 Автор: ${state.bookAuthor}\n\n` +
                            '━━━━━━━━━━━━━━━━━━━\n\n' +
                            '<b>КОНТАКТНІ ДАНІ:</b>\n\n' +
                            `👤 ПІБ: ${state.full_name}\n` +
                            `🎯 Позивний: ${state.callsign}\n` +
                            `🏢 Підрозділ: ${state.unit}\n` +
                            `📞 Телефон: ${state.phone}\n\n` +
                            '💡 Зв\'яжіться з користувачем для узгодження деталей.', {
                            parse_mode: 'HTML',
                            reply_markup: telegraf_1.Markup.inlineKeyboard([
                                [telegraf_1.Markup.button.callback('📋 Переглянути замовлення', `admin_view_order_${orderId}`)],
                                [telegraf_1.Markup.button.callback('📋 Всі замовлення', 'admin_orders')]
                            ]).reply_markup
                        });
                    }
                    catch (error) {
                        logger_1.logger.error(`Failed to notify admin ${admin.user_id}:`, error);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('Failed to notify admins about new order:', error);
            }
            return ctx.scene.leave();
        }
        catch (error) {
            logger_1.logger.error('Error creating book order:', error);
            await ctx.reply('❌ Помилка при створенні замовлення.\n' +
                'Спробуйте пізніше або зв\'яжіться з адміністратором.', {
                reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
            });
            return ctx.scene.leave();
        }
    }
    if (action === 'cancel_order') {
        await ctx.answerCbQuery('❌ Замовлення скасовано');
        await ctx.reply('❌ Замовлення скасовано.\n\n' +
            'Ви можете замовити книгу пізніше.', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
        });
        return ctx.scene.leave();
    }
});
exports.default = bookOrderScene;
//# sourceMappingURL=bookOrderScene.js.map