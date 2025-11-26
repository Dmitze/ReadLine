"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNavigationHandlers = registerNavigationHandlers;
const logger_1 = require("../../utils/logger");
const mainKeyboards_1 = require("../../keyboards/mainKeyboards");
function registerNavigationHandlers(bot) {
    bot.hears('⬅️ Назад', async (ctx) => {
        await ctx.reply('🗡️ Вертаємось на головну базу! ⚔️\n\nОбери свою наступну битву:', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
    });
    bot.hears('🏠 На головну', async (ctx) => {
        await ctx.reply('🗡️ Головна База ⚔️\n\nОбери дію:', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        logger_1.logger.userAction(ctx.from.id, 'go_home');
    });
    bot.action('home', async (ctx) => {
        try {
            await ctx.answerCbQuery('🗡️ Обертаємось...');
            await ctx.reply('🗡️ Головна База ⚔️\n\nОбери дію:', {
                reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
            });
            logger_1.logger.userAction(ctx.from.id, 'go_home_action');
        }
        catch (error) {
            logger_1.logger.error('Error going home', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка при переміщенні');
        }
    });
}
//# sourceMappingURL=navigation.js.map