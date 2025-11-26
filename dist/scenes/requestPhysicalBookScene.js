"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const logger_1 = require("../utils/logger");
const physicalBooks_1 = require("../database/tables/physicalBooks");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const requestPhysicalBookScene = new telegraf_1.Scenes.BaseScene('REQUEST_PHYSICAL_BOOK_SCENE');
requestPhysicalBookScene.enter(async (ctx) => {
    const state = ctx.scene.state;
    state.step = 'title';
    await ctx.reply('📚 <b>ЗАЯВКА НА ФІЗИЧНУ КНИГУ</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '📖 <b>Крок 1/4: Назва книги</b>\n\n' +
        'Введіть назву книги, яку ви хочете отримати:\n\n' +
        '💡 <i>Наприклад: "Кобзар"</i>', {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
    });
    logger_1.logger.userAction(ctx.from?.id || 0, 'start_physical_book_request');
});
requestPhysicalBookScene.on('text', async (ctx) => {
    const state = ctx.scene.state;
    const text = ctx.message.text.trim();
    if (text === '❌ Скасувати') {
        await ctx.reply('❌ Заявку скасовано.', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        return ctx.scene.leave();
    }
    if (state.step === 'title') {
        if (text.length < 2) {
            await ctx.reply('❌ Назва книги занадто коротка. Мінімум 2 символи. Спробуйте ще раз:');
            return;
        }
        state.book_title = text;
        state.step = 'author';
        await ctx.reply('✅ Назва збережена!\n\n' +
            '━━━━━━━━━━━━━━━━━━━\n\n' +
            '✍️ <b>Крок 2/4: Автор книги</b>\n\n' +
            'Введіть автора книги:\n\n' +
            '💡 <i>Наприклад: "Тарас Шевченко"</i>', { parse_mode: 'HTML' });
        return;
    }
    if (state.step === 'author') {
        if (text.length < 2) {
            await ctx.reply("❌ Ім'я автора занадто коротке. Мінімум 2 символи. Спробуйте ще раз:");
            return;
        }
        state.book_author = text;
        state.step = 'genre';
        await ctx.reply('✅ Автор збережений!\n\n' +
            '━━━━━━━━━━━━━━━━━━━\n\n' +
            '🎭 <b>Крок 3/4: Жанр книги</b>\n\n' +
            'Введіть жанр книги або натисніть "Пропустити":\n\n' +
            '💡 <i>Наприклад: "Поезія", "Роман", "Науково-популярна"</i>', {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.keyboard([['⏭️ Пропустити'], ['❌ Скасувати']]).resize().reply_markup,
        });
        return;
    }
    if (state.step === 'genre') {
        if (text === '⏭️ Пропустити') {
            state.book_genre = undefined;
        }
        else {
            state.book_genre = text;
        }
        state.step = 'notes';
        await ctx.reply('✅ Жанр збережений!\n\n' +
            '━━━━━━━━━━━━━━━━━━━\n\n' +
            '📝 <b>Крок 4/4: Додаткові примітки</b>\n\n' +
            'Додайте коментар до заявки (наприклад, чому саме ця книга) або натисніть "Пропустити":\n\n' +
            '💡 <i>Це допоможе адміністратору зрозуміти вашу потребу</i>', {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.keyboard([['⏭️ Пропустити'], ['❌ Скасувати']]).resize().reply_markup,
        });
        return;
    }
    if (state.step === 'notes') {
        if (text === '⏭️ Пропустити') {
            state.notes = undefined;
        }
        else {
            state.notes = text;
        }
        await showConfirmation(ctx, state);
        return;
    }
});
async function showConfirmation(ctx, state) {
    const message = '📋 <b>ПІДТВЕРДЖЕННЯ ЗАЯВКИ</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        `📖 <b>Назва:</b> ${state.book_title}\n` +
        `✍️ <b>Автор:</b> ${state.book_author}\n` +
        `${state.book_genre ? `🎭 <b>Жанр:</b> ${state.book_genre}\n` : ''}` +
        `${state.notes ? `📝 <b>Примітки:</b> ${state.notes}\n` : ''}` +
        '\n━━━━━━━━━━━━━━━━━━━\n\n' +
        '✅ Відправити заявку адміністратору?';
    await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('✅ Так, відправити', 'confirm_request')],
            [telegraf_1.Markup.button.callback('❌ Ні, скасувати', 'cancel_request')],
        ]).reply_markup,
    });
    state.step = 'confirmation';
}
requestPhysicalBookScene.action('confirm_request', async (ctx) => {
    await ctx.answerCbQuery('📤 Відправка заявки...');
    const state = ctx.scene.state;
    const userId = ctx.from?.id;
    if (!userId || !state.book_title || !state.book_author) {
        await ctx.editMessageText('❌ Помилка: не всі дані заповнені. Спробуйте ще раз.');
        return ctx.scene.leave();
    }
    try {
        const request = {
            user_id: userId,
            book_title: state.book_title,
            book_author: state.book_author,
            book_genre: state.book_genre,
            notes: state.notes,
            status: 'pending',
        };
        const requestId = await (0, physicalBooks_1.createRequest)(request);
        await ctx.editMessageText('✅ <b>ЗАЯВКУ ВІДПРАВЛЕНО!</b>\n\n' +
            '━━━━━━━━━━━━━━━━━━━\n\n' +
            `📖 <b>Книга:</b> ${request.book_title}\n` +
            `✍️ <b>Автор:</b> ${request.book_author}\n\n` +
            `🆔 <b>Номер заявки:</b> #${requestId}\n\n` +
            '━━━━━━━━━━━━━━━━━━━\n\n' +
            '📬 Ваша заявка надіслана адміністратору на розгляд.\n\n' +
            '🔔 Ви отримаєте повідомлення, коли адміністратор розгляне вашу заявку.\n\n' +
            '📊 Переглянути статус можна в розділі "Мої заявки".', {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('📋 Мої заявки', 'my_requests')],
                [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
            ]).reply_markup,
        });
        logger_1.logger.userAction(userId, 'create_physical_book_request', {
            requestId,
            title: request.book_title,
            author: request.book_author,
        });
        await ctx.reply('Виберіть дію:', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        return ctx.scene.leave();
    }
    catch (error) {
        logger_1.logger.error('Error creating physical book request', error, { userId });
        await ctx.editMessageText('❌ Помилка при створенні заявки. Спробуйте пізніше.');
        return ctx.scene.leave();
    }
});
requestPhysicalBookScene.action('cancel_request', async (ctx) => {
    await ctx.answerCbQuery('❌ Скасовано');
    await ctx.editMessageText('❌ Заявку скасовано.');
    await ctx.reply('Виберіть дію:', {
        reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
    });
    return ctx.scene.leave();
});
requestPhysicalBookScene.leave(async (ctx) => {
    const state = ctx.scene.state;
    Object.keys(state).forEach((key) => delete state[key]);
});
exports.default = requestPhysicalBookScene;
//# sourceMappingURL=requestPhysicalBookScene.js.map