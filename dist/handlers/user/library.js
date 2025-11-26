"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLibraryHandlers = registerLibraryHandlers;
const logger_1 = require("../../utils/logger");
const constants_1 = require("../../constants");
const models_1 = require("../../database/models");
const bookDisplay_1 = require("../../utils/bookDisplay");
function registerLibraryHandlers(bot) {
    bot.hears(constants_1.BUTTONS.MY_LIBRARY, async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.reply(constants_1.ERRORS.USER_NOT_FOUND);
                return;
            }
            const savedBooks = await (0, models_1.getSavedBooks)(userId);
            if (savedBooks.length === 0) {
                await ctx.reply("💾 Ваша бібліотека порожня. Збережіть книги, щоб вони з'явились тут.");
                return;
            }
            await (0, bookDisplay_1.displaySavedBooks)(ctx, savedBooks);
            logger_1.logger.userAction(userId, 'view_library');
        }
        catch (error) {
            logger_1.logger.error('Error showing library', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.NO_SAVED_BOOKS);
        }
    });
}
//# sourceMappingURL=library.js.map