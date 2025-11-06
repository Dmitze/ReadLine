"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../database/models");
const adminKeyboards_1 = require("../keyboards/adminKeyboards");
exports.default = (bot) => {
    bot.command('admin', async (ctx) => {
        try {
            if (!ctx.from?.id) {
                await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
                return;
            }
            const stats = await (0, models_1.getAdminStats)();
            await ctx.reply(`🛠️ Панель адміністратора

📊 Статистика:
📚 Книг: ${stats.totalBooks}
⏳ Заявок: ${stats.pendingRequests}`, {
                reply_markup: (0, adminKeyboards_1.getAdminMenuKeyboard)()
            });
        }
        catch (error) {
            console.error('Error in admin command:', error);
            await ctx.reply('❌ Виникла помилка при отриманні даних адміністратора.');
        }
        return;
    });
    bot.action('view_requests', async (ctx) => {
        try {
            const requests = await (0, models_1.getPendingRequests)();
            if (requests.length === 0) {
                await ctx.editMessageText('Немає активних заявок ✅');
                return;
            }
            for (const request of requests) {
                try {
                    const book = await (0, models_1.getBookById)(request.book_id);
                    await ctx.reply(`📋 Заявка #${request.id}
📖 ${book?.title}
👤 ${request.full_name}
🎯 ${request.unit}
📞 ${request.phone}`, {
                        reply_markup: (0, adminKeyboards_1.getRequestActionKeyboard)(request.id)
                    });
                }
                catch (bookError) {
                    console.error('Error getting book for request:', bookError);
                    await ctx.reply(`📋 Заявка #${request.id}
⚠️ Помилка отримання даних книги
👤 ${request.full_name}
🎯 ${request.unit}
📞 ${request.phone}`, {
                        reply_markup: (0, adminKeyboards_1.getRequestActionKeyboard)(request.id)
                    });
                }
            }
        }
        catch (error) {
            console.error('Error getting pending requests:', error);
            await ctx.reply('❌ Виникла помилка при отриманні заявок.');
        }
        return;
    });
    bot.action('add_book', async (ctx) => {
        try {
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            ctx.scene.enter('ADD_BOOK_SCENE');
        }
        catch (error) {
            console.error('Error entering add book scene:', error);
            await ctx.reply('❌ Виникла помилка при переході до додавання книги.');
        }
        return;
    });
    bot.action('admin_stats', async (ctx) => {
        try {
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const stats = await (0, models_1.getAdminStats)();
            await ctx.reply(`📊 Статистика бібліотеки:\n\n📚 Всього книг: ${stats.totalBooks}\n⏳ Активних заявок: ${stats.pendingRequests}`);
        }
        catch (error) {
            console.error('Error getting admin stats:', error);
            await ctx.reply('❌ Виникла помилка при отриманні статистики.');
        }
        return;
    });
    bot.action(/approve_(\d+)/, async (ctx) => {
        try {
            if (!ctx.from?.id) {
                await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const requestId = parseInt(ctx.match[1]);
            const result = await (0, models_1.updateRequestStatus)(requestId, 'approved');
            if (result > 0) {
                await ctx.reply(`✅ Заявку #${requestId} підтверджено!`);
            }
            else {
                await ctx.reply(`⚠️ Заявку #${requestId} не знайдено або вже оброблено.`);
            }
        }
        catch (error) {
            console.error('Error approving request:', error);
            await ctx.reply('❌ Виникла помилка при підтвердженні заявки.');
        }
        return;
    });
    bot.action(/reject_(\d+)/, async (ctx) => {
        try {
            if (!ctx.from?.id) {
                await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const requestId = parseInt(ctx.match[1]);
            const result = await (0, models_1.updateRequestStatus)(requestId, 'rejected');
            if (result > 0) {
                await ctx.reply(`❌ Заявку #${requestId} відхилено!`);
            }
            else {
                await ctx.reply(`⚠️ Заявку #${requestId} не знайдено або вже оброблено.`);
            }
        }
        catch (error) {
            console.error('Error rejecting request:', error);
            await ctx.reply('❌ Виникла помилка при відхиленні заявки.');
        }
        return;
    });
};
//# sourceMappingURL=adminHandlers.js.map