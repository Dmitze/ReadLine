"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const logger_1 = require("./utils/logger");
const rateLimit_1 = require("./middleware/rateLimit");
const constants_1 = require("./constants");
const addBookScene_1 = __importDefault(require("./scenes/addBookScene"));
const editBookScene_1 = __importDefault(require("./scenes/editBookScene"));
const manageBooksScene_1 = __importDefault(require("./scenes/manageBooksScene"));
const searchScene_1 = __importDefault(require("./scenes/searchScene"));
const profileScene_1 = __importDefault(require("./scenes/profileScene"));
const rateBookScene_1 = __importDefault(require("./scenes/rateBookScene"));
const feedbackScene_1 = __importDefault(require("./scenes/feedbackScene"));
const aiScene_1 = __importDefault(require("./scenes/aiScene"));
const audioPlayerScene_1 = __importDefault(require("./scenes/audioPlayerScene"));
const replyFeedbackScene_1 = __importDefault(require("./scenes/replyFeedbackScene"));
const onboardingScene_1 = __importDefault(require("./scenes/onboardingScene"));
const settingsScene_1 = __importDefault(require("./scenes/settingsScene"));
const aiFilterScene_1 = __importDefault(require("./scenes/aiFilterScene"));
const aiAssistantScene_1 = __importDefault(require("./scenes/aiAssistantScene"));
const promoAdminScene_1 = __importDefault(require("./scenes/promoAdminScene"));
if (!process.env.BOT_TOKEN) {
    logger_1.logger.error(constants_1.ERRORS.BOT_TOKEN_MISSING);
    console.error('📝 Створіть .env файл в корені проекту та додайте:');
    console.error('   BOT_TOKEN=your_telegram_bot_token_here');
    console.error('');
    console.error('💡 Токен можна отримати у @BotFather в Telegram');
    process.exit(1);
}
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
bot.use(async (ctx, next) => {
    logger_1.logger.info('Processing update', { updateId: ctx.update.update_id });
    await next();
});
bot.use(rateLimit_1.rateLimitMessage);
bot.on('callback_query', rateLimit_1.rateLimitCallback);
bot.use(async (ctx, next) => {
    if (ctx.message && 'text' in ctx.message) {
        const text = ctx.message.text;
        if (text === '/start' || text === '/cancel' || text === '❌ Скасувати') {
            if (ctx.scene) {
                await ctx.scene.leave();
                logger_1.logger.info('User left scene via command', { userId: ctx.from?.id, command: text });
            }
            if (text === '/start') {
                return next();
            }
            else {
                const { getMainMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('./keyboards/mainKeyboards')));
                await ctx.reply('❌ Операцію скасовано', {
                    reply_markup: getMainMenuKeyboard()
                });
                return;
            }
        }
    }
    return next();
});
bot.catch((err, ctx) => {
    logger_1.logger.error('Bot error', err instanceof Error ? err : new Error(String(err)), {
        updateId: ctx.update.update_id,
        userId: ctx.from?.id,
    });
    try {
        ctx.reply('❌ Виникла помилка при обробці вашого запиту.\n\n' +
            'Спробуйте:\n' +
            '• Надіслати /start для перезапуску\n' +
            '• Повторити дію пізніше\n' +
            '• Зв\'язатися з адміністратором');
    }
    catch (replyError) {
        console.error('Не вдалося відправити повідомлення про помилку:', replyError);
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection at:', promise);
    console.error('Reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:');
    console.error(error);
});
const stage = new telegraf_1.Scenes.Stage([
    addBookScene_1.default,
    editBookScene_1.default,
    manageBooksScene_1.default,
    searchScene_1.default,
    profileScene_1.default,
    rateBookScene_1.default,
    feedbackScene_1.default,
    aiScene_1.default,
    audioPlayerScene_1.default,
    replyFeedbackScene_1.default,
    onboardingScene_1.default,
    settingsScene_1.default,
    aiFilterScene_1.default,
    aiAssistantScene_1.default,
    promoAdminScene_1.default
]);
bot.use((0, telegraf_1.session)());
bot.use(stage.middleware());
const mainKeyboards_1 = require("./keyboards/mainKeyboards");
const userFunctions_1 = require("./database/userFunctions");
bot.start(async (ctx) => {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name || 'Читач';
    const lastName = ctx.from?.last_name;
    if (!userId) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача');
        return;
    }
    try {
        await (0, userFunctions_1.getOrCreateUser)(userId, username, firstName, lastName);
        const isNew = await (0, userFunctions_1.isNewUser)(userId);
        if (isNew) {
            logger_1.logger.info('New user detected, starting onboarding', { userId, username });
            return ctx.scene?.enter('ONBOARDING_SCENE');
        }
        const welcomeMessage = '╔═══════════════════════════╗\n' +
            '   📚 *ReadLine Бібліотека* 📚\n' +
            '╚═══════════════════════════╝\n\n' +
            `Вітаємо, *${firstName}*! 👋\n\n` +
            '🎯 *Про ReadLine:*\n' +
            'Ваша особиста електронна бібліотека з тисячами книг українською мовою. ' +
            'Читайте, слухайте, зберігайте улюблені книги та отримуйте персональні рекомендації!\n\n' +
            '📚 *Що ви можете робити:*\n\n' +
            '📖 Переглядати каталог книг за жанрами\n' +
            '🔍 Шукати книги (назва, автор, жанр)\n' +
            '🏆 Дивитися топ книг за рейтингом\n' +
            '🆕 Знаходити нові надходження\n' +
            '💾 Зберігати улюблені книги\n' +
            '⭐ Оцінювати та залишати відгуки\n' +
            '📥 Завантажувати книги (PDF, EPUB, FB2...)\n' +
            '🎧 Слухати аудіокниги\n' +
            '🌐 Читати онлайн\n' +
            '💡 Отримувати персональні рекомендації\n\n' +
            '⚙️ *Доступні команди:*\n' +
            '/start - Головне меню\n' +
            '/help - Довідка по боту\n' +
            '/cancel - Скасувати поточну дію\n' +
            '/admin - Панель адміністратора\n\n' +
            '⚡ *Швидкі дії:*\n' +
            '• Швидкий пошук\n' +
            '• Мої улюблені\n' +
            '• Випадкова книга\n\n' +
            '👇 *Оберіть дію з меню нижче:*';
        return ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown',
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)()
        });
    }
    catch (error) {
        logger_1.logger.error('Error in start command', error instanceof Error ? error : new Error(String(error)), { userId });
        await ctx.reply('❌ Виникла помилка. Спробуйте ще раз.');
    }
});
bot.help((ctx) => {
    const helpMessage = '╔═══════════════════════════╗\n' +
        '      ℹ️ *ДОВІДКА ПО БОТУ* ℹ️\n' +
        '╚═══════════════════════════╝\n\n' +
        '🎯 *ОСНОВНІ ФУНКЦІЇ:*\n\n' +
        '📖 *Каталог* - перегляд книг за жанрами\n' +
        '   • Оберіть жанр зі списку\n' +
        '   • Показується до 5 книг за раз\n\n' +
        '🔍 *Пошук* - розширений пошук\n' +
        '   • За назвою, автором або жанром\n' +
        '   • Фільтри для точного пошуку\n' +
        '   • Мінімум 2 символи\n\n' +
        '🏆 *Топ книги* - найкращі за рейтингом\n' +
        '   • Книги з найвищими оцінками\n' +
        '   • Оновлюється автоматично\n\n' +
        '🆕 *Новинки* - останні надходження\n' +
        '   • 10 останніх додань\n' +
        '   • Завжди свіжі книги\n\n' +
        '💾 *Моя бібліотека* - збережені книги\n' +
        '   • Ваші улюблені книги\n' +
        '   • Швидкий доступ\n\n' +
        '👤 *Профіль* - ваша статистика\n' +
        '   • Персональні рекомендації\n' +
        '   • Статистика прослуховування\n' +
        '   • Улюблені жанри\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '⚡ *ШВИДКІ ДІЇ:*\n' +
        '• ⚡ Швидкий пошук - миттєвий пошук\n' +
        '• ⭐ Мої улюблені - збережені книги\n' +
        '• 📚 Продовжити читати - останні книги\n' +
        '• 🎲 Випадкова книга - відкрийте нове\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '📚 *ФОРМАТИ КНИГ:*\n' +
        '• 📄 PDF - завантажити файл\n' +
        '• 🌐 Онлайн - читати в браузері\n' +
        '• 🎧 Аудіо - слухати аудіокнигу\n\n' +
        '🎬 *ДІЇ З КНИГОЮ:*\n' +
        '• 📥 Завантажити - отримати файл\n' +
        '• ⭐ Оцінити - залишити відгук\n' +
        '• 💾 Зберегти - додати в улюблені\n' +
        '• 📊 Відгуки - читати коментарі\n' +
        '• 🔍 Схожі - знайти подібні\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '⚙️ *КОМАНДИ:*\n' +
        '/start - Головне меню\n' +
        '/help - Ця довідка\n' +
        '/settings - Налаштування бота\n' +
        '/admin - Панель адміністратора (тільки для адмінів)\n\n' +
        '💡 *ПІДКАЗКИ:*\n' +
        '• Використовуйте кнопки для навігації\n' +
        '• Всі дії інтуїтивні та зрозумілі\n' +
        '• При помилці бот підкаже що робити\n\n' +
        '❓ Питання? Звертайтеся до адміністратора!';
    return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});
bot.command('settings', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'settings_command');
    return ctx.scene.enter('SETTINGS_SCENE');
});
const userHandlers_1 = __importDefault(require("./handlers/userHandlers"));
const adminHandlers_1 = __importDefault(require("./handlers/adminHandlers"));
console.log('📝 Registering handlers...');
(0, adminHandlers_1.default)(bot);
console.log('✅ Admin handlers called');
(0, userHandlers_1.default)(bot);
console.log('✅ User handlers called');
bot.action('notification_settings', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('SETTINGS_SCENE');
});
bot.action('view_new_books', async (ctx) => {
    await ctx.answerCbQuery('📚 Показую новинки');
    await ctx.reply('📚 Новинки будуть тут незабаром!');
});
bot.action('random_book', async (ctx) => {
    await ctx.answerCbQuery('🎲 Вибираю випадкову книгу');
    const { getRandomBook } = require('./database/recommendationFunctions');
    const book = await getRandomBook();
    if (book) {
        const { formatBookCaption } = require('./utils/helpers');
        const { getEnhancedBookKeyboard } = require('./keyboards/mainKeyboards');
        const caption = await formatBookCaption(book);
        if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
            await ctx.replyWithPhoto(book.photo_file_id, {
                caption,
                parse_mode: 'Markdown',
                reply_markup: getEnhancedBookKeyboard(book)
            });
        }
        else {
            await ctx.reply(caption, {
                parse_mode: 'Markdown',
                reply_markup: getEnhancedBookKeyboard(book)
            });
        }
    }
    else {
        await ctx.reply('❌ На жаль, зараз немає доступних книг');
    }
});
let notificationScheduler = null;
const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down gracefully`);
    if (notificationScheduler) {
        const { stopNotificationScheduler } = require('./utils/notifications');
        stopNotificationScheduler(notificationScheduler);
    }
    bot.stop(signal);
    process.exit(0);
};
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
console.log('🚀 Starting bot launch...');
console.log('✅ User handlers registered');
console.log('✅ Admin handlers registered');
(async () => {
    try {
        console.log('🔄 Initializing database...');
        const { initDatabase } = await Promise.resolve().then(() => __importStar(require('./database/models')));
        await initDatabase();
        console.log('✅ Database initialized successfully');
        console.log('🔄 Launching bot...');
        await bot.launch({
            dropPendingUpdates: true
        });
        console.log('📚 Бібліотечний бот запущений!');
        console.log('Bot username:', bot.botInfo?.username);
        console.log('✅ Bot is ready to receive messages');
        const { startNotificationScheduler } = require('./utils/notifications');
        notificationScheduler = startNotificationScheduler(bot);
        console.log('🔔 Notification scheduler started');
        const { startAutoBackup } = require('./utils/autoBackup');
        const backupScheduler = startAutoBackup();
        console.log('💾 Automatic backup scheduler started');
    }
    catch (error) {
        console.error('❌ Помилка запуску бота:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        process.exit(1);
    }
})();
//# sourceMappingURL=index.js.map