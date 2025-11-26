"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTopAndNewHandlers = registerTopAndNewHandlers;
const logger_1 = require("../../utils/logger");
const constants_1 = require("../../constants");
const cache_1 = require("../../utils/cache");
const models_1 = require("../../database/models");
const bookDisplay_1 = require("../../utils/bookDisplay");
function registerTopAndNewHandlers(bot) {
    bot.hears(['🏆 Топ книги', constants_1.BUTTONS.TOP_BOOKS], async (ctx) => {
        try {
            const topBooks = await cache_1.cache.getOrSet(cache_1.CACHE_KEYS.TOP_BOOKS, () => (0, models_1.getTopBooks)(constants_1.CONFIG.MAX_TOP_BOOKS), cache_1.CACHE_TTL.MEDIUM);
            await (0, bookDisplay_1.displayTopBooks)(ctx, topBooks);
            logger_1.logger.userAction(ctx.from.id, 'view_top_books');
        }
        catch (error) {
            logger_1.logger.error('Error showing top books', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.NO_TOP_BOOKS);
        }
    });
    bot.hears(constants_1.BUTTONS.NEW_BOOKS, async (ctx) => {
        try {
            const newBooks = await (0, models_1.getNewestBooks)(5);
            if (newBooks.length === 0) {
                await ctx.reply('📭 В бібліотеці поки що немає книг.');
                return;
            }
            await (0, bookDisplay_1.displayNewBooks)(ctx, newBooks);
            logger_1.logger.userAction(ctx.from.id, 'view_new_books');
        }
        catch (error) {
            logger_1.logger.error('Error showing new books', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.NO_NEW_BOOKS);
        }
    });
}
//# sourceMappingURL=topAndNew.js.map