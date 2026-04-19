"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNavigationHandlers = registerNavigationHandlers;
const logger_1 = require("../../utils/logger");
const mainKeyboards_1 = require("../../keyboards/mainKeyboards");
const constants_1 = require("../../constants");
function registerNavigationHandlers(bot) {
    bot.hears('⬅️ Назад', async (ctx) => {
        await ctx.reply(`<b>${constants_1.UX.navBackTitle}</b>\n${constants_1.UX.navBackBody}`, {
            parse_mode: 'HTML',
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
    });
    bot.hears('🏠 На головну', async (ctx) => {
        await ctx.reply(`<b>${constants_1.UX.navHomeTitle}</b>\n${constants_1.UX.navHomeBody}`, {
            parse_mode: 'HTML',
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        logger_1.logger.userAction(ctx.from.id, 'go_home');
    });
    bot.action('home', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.reply(`<b>${constants_1.UX.navHomeTitle}</b>\n${constants_1.UX.navHomeBody}`, {
                parse_mode: 'HTML',
                reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
            });
            logger_1.logger.userAction(ctx.from.id, 'go_home_action');
        }
        catch (error) {
            logger_1.logger.error('Error going home', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
}
//# sourceMappingURL=navigation.js.map