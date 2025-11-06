"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
require("./config/database");
const addBookScene_js_1 = __importDefault(require("./scenes/addBookScene.js"));
const requestBookScene_js_1 = __importDefault(require("./scenes/requestBookScene.js"));
const searchScene_js_1 = __importDefault(require("./scenes/searchScene.js"));
const profileScene_js_1 = __importDefault(require("./scenes/profileScene.js"));
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN || '');
bot.use(async (ctx, next) => {
    console.log(`Processing update ${ctx.update.update_id}`);
    await next();
});
const stage = new telegraf_1.Scenes.Stage([addBookScene_js_1.default, requestBookScene_js_1.default, searchScene_js_1.default, profileScene_js_1.default]);
bot.use((0, telegraf_1.session)());
bot.use(stage.middleware());
bot.start((ctx) => {
    return ctx.reply('📚 Вітаємо в полковій бібліотеці!', {
        reply_markup: telegraf_1.Markup
            .keyboard([
            ['📖 Перегляд каталогу', '🔍 Пошук книги'],
            ['📋 Мої заявки', '👤 Мій профіль'],
            ['ℹ️ Допомога']
        ])
            .resize()
            .oneTime()
            .reply_markup
    });
});
bot.help((ctx) => {
    return ctx.reply('📖 *Команди бота:*\n' +
        '/start - Головне меню\n' +
        '/help - Допомога\n' +
        '/admin - Панель адміністратора\n\n' +
        'Ви також можете використовувати кнопки для навігації.', { parse_mode: 'Markdown' });
});
const userHandlers_js_1 = __importDefault(require("./handlers/userHandlers.js"));
const adminHandlers_js_1 = __importDefault(require("./handlers/adminHandlers.js"));
(0, userHandlers_js_1.default)(bot);
(0, adminHandlers_js_1.default)(bot);
const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down gracefully`);
    bot.stop(signal);
    process.exit(0);
};
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
bot.launch().then(() => {
    console.log('📚 Бібліотечний бот запущений!');
    console.log('Bot username:', bot.botInfo?.username);
});
//# sourceMappingURL=index.js.map