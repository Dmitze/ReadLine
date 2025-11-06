"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const models_1 = require("../database/models");
const requestBookScene = new telegraf_1.Scenes.WizardScene('REQUEST_BOOK_SCENE', async (ctx) => {
    await ctx.reply('👤 Введіть ваше ПІБ (повне ім\'я):');
    return ctx.wizard.next();
}, async (ctx) => {
    ctx.wizard.state.fullName = ctx.message.text;
    await ctx.reply('🎯 Введіть ваш підрозділ:');
    return ctx.wizard.next();
}, async (ctx) => {
    ctx.wizard.state.unit = ctx.message.text;
    await ctx.reply('📞 Введіть ваш номер телефону:');
    return ctx.wizard.next();
}, async (ctx) => {
    ctx.wizard.state.phone = ctx.message.text;
    try {
        const book = await (0, models_1.getBookById)(ctx.wizard.state.bookId);
        await ctx.reply('📋 Перевірте дані заявки:');
        await ctx.reply(`📖 Книга: ${book?.title}\n` +
            `👤 ПІБ: ${ctx.wizard.state.fullName}\n` +
            `🎯 Підрозділ: ${ctx.wizard.state.unit}\n` +
            `📞 Телефон: ${ctx.wizard.state.phone}`);
        await ctx.reply('Все вірно?', {
            reply_markup: telegraf_1.Markup
                .inlineKeyboard([
                [telegraf_1.Markup.button.callback('✅ Підтвердити заявку', 'confirm_request')],
                [telegraf_1.Markup.button.callback('❌ Скасувати', 'cancel_request')]
            ])
                .reply_markup
        });
    }
    catch (error) {
        console.error('Error getting book:', error);
        await ctx.reply('❌ Виникла помилка при отриманні інформації про книгу.');
        return ctx.scene.leave();
    }
    return ctx.wizard.next();
}, async (ctx) => {
    if (ctx.callbackQuery?.data === 'confirm_request') {
        try {
            const requestData = {
                user_id: ctx.from.id,
                user_name: ctx.from.username,
                book_id: ctx.wizard.state.bookId,
                full_name: ctx.wizard.state.fullName,
                unit: ctx.wizard.state.unit,
                phone: ctx.wizard.state.phone
            };
            const requestId = await (0, models_1.addRequest)(requestData);
            await ctx.reply('✅ Заявку успішно подано! Адміністратор зв\'яжеться з вами.', {
                reply_markup: telegraf_1.Markup.removeKeyboard().reply_markup
            });
        }
        catch (error) {
            console.error('Error saving request:', error);
            await ctx.reply('❌ Виникла помилка при поданні заявки. Спробуйте ще раз.', {
                reply_markup: telegraf_1.Markup.removeKeyboard().reply_markup
            });
        }
    }
    else {
        await ctx.reply('❌ Заявку скасовано.', {
            reply_markup: telegraf_1.Markup.removeKeyboard().reply_markup
        });
    }
    return ctx.scene.leave();
});
exports.default = requestBookScene;
//# sourceMappingURL=requestBookScene.js.map