"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const models_1 = require("../database/models");
const helpers_1 = require("../utils/helpers");
const addBookScene = new telegraf_1.Scenes.WizardScene('ADD_BOOK_SCENE', async (ctx) => {
    await ctx.reply('📖 Введіть назву книги:');
    return ctx.wizard.next();
}, async (ctx) => {
    ctx.wizard.state.title = ctx.message.text;
    await ctx.reply('👤 Введіть автора книги:');
    return ctx.wizard.next();
}, async (ctx) => {
    ctx.wizard.state.author = ctx.message.text;
    const genres = ['Художня', 'Військова', 'Історична', 'Технічна', 'Психологія', 'Біографія'];
    await ctx.reply('📚 Оберіть жанр книги:', {
        reply_markup: telegraf_1.Markup
            .keyboard(genres.map(genre => [genre]))
            .oneTime()
            .resize()
            .reply_markup
    });
    return ctx.wizard.next();
}, async (ctx) => {
    ctx.wizard.state.genre = ctx.message.text;
    await ctx.reply('📝 Введіть короткий опис книги:');
    return ctx.wizard.next();
}, async (ctx) => {
    ctx.wizard.state.description = ctx.message.text;
    await ctx.reply('🖼️ Завантажте фото обкладинки книги:');
    return ctx.wizard.next();
}, async (ctx) => {
    if (ctx.message?.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        ctx.wizard.state.photoFileId = photo.file_id;
        const bookData = {
            title: ctx.wizard.state.title,
            author: ctx.wizard.state.author,
            genre: ctx.wizard.state.genre,
            description: ctx.wizard.state.description,
            photo_file_id: ctx.wizard.state.photoFileId
        };
        try {
            const bookId = await (0, models_1.addBook)(bookData);
            await ctx.reply('✅ Книга успішно додана до бібліотеки!', {
                reply_markup: telegraf_1.Markup.removeKeyboard().reply_markup
            });
            await ctx.replyWithPhoto(photo.file_id, {
                caption: (0, helpers_1.formatBookCaption)({ ...bookData, id: bookId, is_available: true }),
                parse_mode: 'Markdown'
            });
        }
        catch (error) {
            console.error('Error saving book:', error);
            await ctx.reply('❌ Виникла помилка при додаванні книги. Спробуйте ще раз.', {
                reply_markup: telegraf_1.Markup.removeKeyboard().reply_markup
            });
        }
    }
    else {
        await ctx.reply('❌ Будь ласка, завантажте фото обкладинки.');
        return;
    }
    return ctx.scene.leave();
});
exports.default = addBookScene;
//# sourceMappingURL=addBookScene.js.map