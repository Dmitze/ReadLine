"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeAnswerCbQuery = safeAnswerCbQuery;
exports.createSafeCallbackHandler = createSafeCallbackHandler;
const logger_1 = require("./logger");
async function safeAnswerCbQuery(ctx, notification, options) {
    try {
        await ctx.answerCbQuery(notification, options);
    }
    catch (error) {
        logger_1.logger.debug('Failed to answer callback query', {
            error: error instanceof Error ? error.message : String(error),
            userId: ctx.from?.id,
            callbackQueryId: ctx.callbackQuery?.id,
        });
    }
}
function createSafeCallbackHandler(handler) {
    return async (ctx) => {
        try {
            await safeAnswerCbQuery(ctx);
            await handler(ctx);
        }
        catch (error) {
            logger_1.logger.error('Error in callback handler', error instanceof Error ? error : new Error(String(error)), {
                userId: ctx.from?.id,
                action: ctx.callbackQuery?.data,
            });
            try {
                await ctx.reply('❌ Виникла помилка при обробці запиту. Спробуйте ще раз.');
            }
            catch (replyError) {
                logger_1.logger.error('Failed to send error message', replyError instanceof Error ? replyError : new Error(String(replyError)));
            }
        }
    };
}
//# sourceMappingURL=callbackQueryHandler.js.map