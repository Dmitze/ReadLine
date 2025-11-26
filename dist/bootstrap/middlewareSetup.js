"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMiddleware = setupMiddleware;
const logger_1 = require("../utils/logger");
const rateLimit_1 = require("../middleware/rateLimit");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
function setupMiddleware(bot) {
    bot.use(async (ctx, next) => {
        logger_1.logger.info('Processing update', { updateId: ctx.update.update_id });
        await next();
    });
    bot.use(rateLimit_1.rateLimitMessage);
    bot.use(rateLimit_1.rateLimitCommand);
    bot.on('callback_query', rateLimit_1.rateLimitCallback);
    bot.use(async (ctx, next) => {
        const originalReply = ctx.reply.bind(ctx);
        ctx.reply = async (text, extra) => {
            if (extra?.reply_markup && extra.reply_markup.inline_keyboard) {
                return originalReply(text, extra);
            }
            return originalReply(text, {
                ...extra,
                reply_markup: extra?.reply_markup || (0, mainKeyboards_1.getMainMenuKeyboard)(),
            });
        };
        await next();
    });
    bot.use(async (ctx, next) => {
        if (ctx.message && 'text' in ctx.message) {
            const text = ctx.message.text;
            if (text === '/start') {
                if (ctx.scene) {
                    await ctx.scene.leave();
                }
                return next();
            }
            if (text === '/cancel') {
                if (ctx.scene) {
                    await ctx.scene.leave();
                    await ctx.reply('❌ Дію скасовано. Ви повернулися в головне меню.');
                    return;
                }
            }
        }
        return next();
    });
}
//# sourceMappingURL=middlewareSetup.js.map