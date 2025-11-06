"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../database/models");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
exports.default = (bot) => {
    bot.hears('📖 Перегляд каталогу', async (ctx) => {
        try {
            const genres = await (0, models_1.getGenres)();
            const keyboard = (0, mainKeyboards_1.getGenreKeyboard)(genres);
            await ctx.reply('📚 Оберіть жанр:', {
                reply_markup: keyboard
            });
        }
        catch (error) {
            console.error('Error getting genres:', error);
            await ctx.reply('❌ Виникла помилка при отриманні жанрів.');
        }
    });
    bot.hears('🔍 Пошук книги', async (ctx) => {
        ctx.scene.enter('SEARCH_SCENE');
        return;
    });
    bot.hears('👤 Мій профіль', async (ctx) => {
        ctx.scene.enter('PROFILE_SCENE');
        return;
    });
    bot.hears('📋 Мої заявки', async (ctx) => {
        ctx.scene.enter('PROFILE_SCENE', { isMyRequests: true });
        return;
    });
    bot.on('message', async (ctx) => {
        if (!ctx.message?.text)
            return;
        const messageText = ctx.message.text;
        try {
            const genres = await (0, models_1.getGenres)();
            if (genres.includes(messageText)) {
                const books = await (0, models_1.getBooksByGenre)(messageText);
                if (books.length === 0) {
                    await ctx.reply('📭 На жаль, в цьому жанрі ще немає книг.');
                    return;
                }
                for (const book of books) {
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
        }
        catch (error) {
            console.error('Error getting books by genre:', error);
            await ctx.reply('❌ Виникла помилка при отриманні книг.');
        }
        return;
    });
    bot.action(/order_(\d+)/, async (ctx) => {
        const bookId = ctx.match[1];
        ctx.scene.enter('REQUEST_BOOK_SCENE', { bookId });
        return;
    });
};
//# sourceMappingURL=userHandlers.js.map