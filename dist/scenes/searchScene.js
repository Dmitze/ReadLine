"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const models_1 = require("../database/models");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const searchScene = new telegraf_1.Scenes.BaseScene('SEARCH_SCENE');
searchScene.enter(async (ctx) => {
    await ctx.reply('🔍 Введіть назву книги або автора для пошуку:');
});
searchScene.on('text', async (ctx) => {
    if (!ctx.message?.text) {
        await ctx.reply('❌ Будь ласка, введіть текст для пошуку.');
        return ctx.scene?.leave();
    }
    const searchTerm = ctx.message.text.toLowerCase();
    try {
        const books = await (0, models_1.getAllBooks)();
        const matchingBooks = books.filter(book => book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm));
        if (matchingBooks.length === 0) {
            await ctx.reply('📭 За вашим запитом нічого не знайдено. Спробуйте інший пошуковий запит.');
            return ctx.scene?.leave();
        }
        await ctx.reply(`🔍 Результати пошуку (${matchingBooks.length} знайдено):`);
        for (const book of matchingBooks) {
            await ctx.replyWithPhoto(book.photo_file_id, {
                caption: `📖 *${book.title}*
👤 Автор: ${book.author}
📚 Жанр: ${book.genre}
📝 Опис: ${book.description}
📍 Статус: ${book.is_available ? 'Доступна' : 'Недоступна'}`,
                parse_mode: 'Markdown',
                reply_markup: (0, mainKeyboards_1.getBookOrderKeyboard)(book.id)
            });
        }
    }
    catch (error) {
        console.error('Error searching books:', error);
        await ctx.reply('❌ Виникла помилка при пошуку книг.');
    }
    return ctx.scene?.leave();
});
exports.default = searchScene;
//# sourceMappingURL=searchScene.js.map