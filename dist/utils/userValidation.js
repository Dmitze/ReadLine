"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUserIdOrReply = exports.requireValidUserId = exports.validateUserId = void 0;
const logger_1 = require("./logger");
const validateUserId = (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || typeof userId !== 'number' || userId <= 0) {
        logger_1.logger.warn('Invalid user ID', {
            userId,
            from: ctx.from,
            updateType: ctx.updateType,
        });
        return null;
    }
    return userId;
};
exports.validateUserId = validateUserId;
const requireValidUserId = async (ctx, next) => {
    const userId = (0, exports.validateUserId)(ctx);
    if (!userId) {
        await ctx.reply('❌ Помилка ідентифікації користувача. Спробуйте перезапустити бота командою /start');
        return;
    }
    ctx.userId = userId;
    return next();
};
exports.requireValidUserId = requireValidUserId;
const checkUserIdOrReply = async (ctx) => {
    const userId = (0, exports.validateUserId)(ctx);
    if (!userId) {
        await ctx.reply('❌ Помилка ідентифікації користувача. Спробуйте перезапустити бота командою /start');
        return false;
    }
    return true;
};
exports.checkUserIdOrReply = checkUserIdOrReply;
//# sourceMappingURL=userValidation.js.map