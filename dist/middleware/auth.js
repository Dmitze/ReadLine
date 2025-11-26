"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canReply = exports.logUserAction = exports.requireAdmin = void 0;
const models_1 = require("../database/models");
const logger_1 = require("../utils/logger");
const constants_1 = require("../constants");
const requireAdmin = async (ctx, next) => {
    try {
        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply(constants_1.ERRORS.NO_ADMIN_ACCESS);
            logger_1.logger.warn('Auth attempt without user ID');
            return;
        }
        const isUserAdmin = await (0, models_1.isAdmin)(userId);
        if (!isUserAdmin) {
            await ctx.reply(constants_1.ERRORS.NO_ADMIN_ACCESS);
            logger_1.logger.warn('Unauthorized admin access attempt', { userId });
            return;
        }
        await next();
    }
    catch (error) {
        logger_1.logger.error('Error in admin middleware', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
        await ctx.reply(constants_1.ERRORS.GENERIC);
    }
};
exports.requireAdmin = requireAdmin;
const logUserAction = async (ctx, next) => {
    const userId = ctx.from?.id;
    const messageText = 'text' in ctx.message ? ctx.message.text : 'non-text';
    logger_1.logger.userAction(userId || 0, 'message', {
        type: ctx.updateType,
        text: messageText,
    });
    return next();
};
exports.logUserAction = logUserAction;
const canReply = async (ctx, next) => {
    try {
        if (!ctx.from) {
            logger_1.logger.warn('Message without sender');
            return;
        }
        return next();
    }
    catch (error) {
        logger_1.logger.error('Error in canReply middleware', error);
    }
};
exports.canReply = canReply;
//# sourceMappingURL=auth.js.map