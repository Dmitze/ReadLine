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
const logger_1 = require("./utils/logger");
const environmentSetup_1 = require("./bootstrap/environmentSetup");
const middlewareSetup_1 = require("./bootstrap/middlewareSetup");
const sceneSetup_1 = require("./bootstrap/sceneSetup");
const ContainerBootstrap_1 = require("./core/ContainerBootstrap");
const models_1 = require("./database/models");
const env = (0, environmentSetup_1.setupEnvironment)();
const container = (0, ContainerBootstrap_1.getContainer)();
(0, ContainerBootstrap_1.bootstrapContainer)(container).catch((error) => {
    logger_1.logger.error('Failed to bootstrap container', error);
    process.exit(1);
});
const bot = new telegraf_1.Telegraf(env.BOT_TOKEN);
bot.telegram.setChatMenuButton({
    menuButton: {
        type: 'commands',
    },
});
(0, middlewareSetup_1.setupMiddleware)(bot);
bot.catch(async (err, ctx) => {
    logger_1.logger.error('Bot error', err instanceof Error ? err : new Error(String(err)), {
        updateId: ctx.update.update_id,
        userId: ctx.from?.id,
    });
    if (ctx.callbackQuery) {
        try {
            await ctx.answerCbQuery('❌ Виникла помилка');
        }
        catch (cbError) {
            logger_1.logger.error('Failed to answer callback query', cbError instanceof Error ? cbError : new Error(String(cbError)));
        }
    }
    try {
        await ctx.reply('❌ Виникла помилка при обробці вашого запиту.\n\n' +
            'Спробуйте:\n' +
            '• Надіслати /start для перезапуску\n' +
            '• Повторити дію пізніше\n' +
            "• Зв'язатися з адміністратором");
    }
    catch (replyError) {
        logger_1.logger.error('Failed to send error message to user', replyError instanceof Error ? replyError : new Error(String(replyError)));
    }
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Promise Rejection', new Error(String(reason)), {
        promise: String(promise),
    });
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception', error instanceof Error ? error : new Error(String(error)));
});
const stage = (0, sceneSetup_1.createStage)();
const mainKeyboards_1 = require("./keyboards/mainKeyboards");
bot.use((0, telegraf_1.session)());
bot.use(async (ctx, next) => {
    if (ctx.message && 'text' in ctx.message) {
        const text = ctx.message.text;
        const menuButtons = [
            '📖 Каталог',
            '🏆 Топ книги',
            '🆕 Новинки',
            '💾 Моя бібліотека',
            '👤 Профіль',
            '🤖 AI Помічник',
            '🎁 Отримати промокод',
            '⚙️ Налаштування',
            'ℹ️ Допомога',
            "📞 Зворотній зв'язок",
            '🏠 На головну',
        ];
        if (menuButtons.includes(text) && ctx.scene) {
            logger_1.logger.info('User pressed menu button while in scene', { text, userId: ctx.from?.id });
            try {
                await ctx.scene.leave();
                if (ctx.session) {
                    ctx.session = {};
                }
                logger_1.logger.info('Successfully left scene', { userId: ctx.from?.id });
            }
            catch (error) {
                logger_1.logger.error('Error leaving scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            }
        }
    }
    return next();
});
bot.use(stage.middleware());
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
            if (ctx.scene) {
                return ctx.scene.enter('ONBOARDING_SCENE');
            }
            else {
                logger_1.logger.error('Scene context not available for onboarding', { userId });
            }
        }
        const welcomeMessage = '╔═════════════════════════════════╗\n' +
            '   ⚔️ *Warrior\'s Library* ⚔️\n' +
            '   🗡️ Легендарна Бібліотека 📚\n' +
            '╚═════════════════════════════════╝\n\n' +
            `🗡️ Вітаємо, *${firstName}*!\n\n` +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '*Твоя Легенда Читача Розпочина:*\n' +
            'Найбільша колекція книг українською мовою. ' +
            'Дослідж нові світи, скупляй скарби та отримуй рекомендації від AI Мудреця!\n\n' +
            '📚 *МОЖЛИВОСТІ ТА БОЇВКИ:*\n\n' +
            '🔍 Крамниця Знань - пошук за всіма критеріями\n' +
            '⭐ Топ книги - найпопулярніші твори\n' +
            '🆕 Новинки - свіжі надходження\n' +
            '❤️ Мої Скарби - твоя персональна колекція\n' +
            '⭐ Оцінки та Відгуки - поділися враженнями\n' +
            '📥 Завантаженння - читай у будь-якому форматі\n' +
            '🎧 Аудіолегенди - слухай розповіді\n' +
            '🌐 Онлайн Читання - дослідж в браузері\n' +
            '🤖 AI Рекомендації - персональний вибір\n' +
            '📊 Воїнська Статистика - розпочунок свою славу\n\n' +
            '⚡ *КОМАНДИ ВОЇНА:*\n' +
            '/start - Головне Меню\n' +
            '/help - Доступні можливості\n' +
            '/cancel - Скасувати\n' +
            '/admin - Панель Командира\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '👇 *Обери свою першу битву:*';
        return ctx.reply(welcomeMessage, {
            parse_mode: 'HTML',
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error in start command', error instanceof Error ? error : new Error(String(error)), { userId });
        await ctx.reply('❌ Виникла помилка. Спробуйте ще раз.');
    }
});
bot.help((ctx) => {
    const helpMessage = '╔═════════════════════════════════╗\n' +
        '  ⚔️ <b>ДОВІДКА ВОЇНА</b> 🗡️\n' +
        '╚═════════════════════════════════╝\n\n' +
        '<b>🎯 ОСНОВНІ БОЇВКИ:</b>\n\n' +
        '📚 <b>Крамниця Знань</b> - дослідь жанри\n' +
        '   ⚔️ Обери жанр\n' +
        '   ⚔️ Переглядай книги\n\n' +
        '🔍 <b>Безстрашний Пошук</b> - точна розвідка\n' +
        '   ⚔️ За назвою, автором, жанром\n' +
        '   ⚔️ Вдосконалені фільтри\n\n' +
        '⭐ <b>Топ Битв</b> - найславніші твори\n' +
        '   ⚔️ За рейтингом воїнів\n' +
        '   ⚔️ Скриня скарбів\n\n' +
        '🆕 <b>Свіжі Легенди</b> - нові завоювання\n' +
        '   ⚔️ Сучасні надходження\n' +
        '   ⚔️ Завжди цікавиці\n\n' +
        '❤️ <b>Скарбниця Воїна</b> - улюблені скарби\n' +
        '   ⚔️ Твої обрані книги\n' +
        '   ⚔️ Швидкий доступ\n\n' +
        '👤 <b>Боєва Статистика</b> - твій прогрес\n' +
        '   ⚔️ Персональні рекомендації\n' +
        '   ⚔️ Твоя слава читача\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '<b>⚡ МАГІЧНІ БОЇВКИ:</b>\n' +
        '⚔️ Швидкий Удар - 🔍 Миттєвий пошук\n' +
        '⚔️ Улюблені - ❤️ Твої скарби\n' +
        '⚔️ Продовжити Битву - 📚 Останні книги\n' +
        '⚔️ Випадковий Супротив - 🎲 Нова битва\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '<b>📚 ФОРМАТИ ДЛЯ ЧИТАННЯ:</b>\n' +
        '📄 PDF - завантажити легенду\n' +
        '🌐 Онлайн - читати в брамі\n' +
        '🎧 Аудіо - слухати розповідь\n\n' +
        '<b>⚔️ БОЇВКИ З КНИГОЮ:</b>\n' +
        '📥 Завантажити - отримати скарб\n' +
        '⭐ Оцінити - покажи хисність\n' +
        '❤️ Зберегти - додай в арсенал\n' +
        '📊 Виклики - читай поради\n' +
        '🔍 Схожі - знайди союзників\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '<b>⚙️ КОМАНДИ КОМАНДИРА:</b>\n' +
        '/start - Головна база\n' +
        '/help - Ця довідка\n' +
        '/settings - Налаштування бойового снаряжу\n' +
        '/admin - Панель Командира (тільки адміни)\n\n' +
        '<b>💡 СТРАТЕГІЧНІ ПІДКАЗКИ:</b>\n' +
        '⚔️ Використовуй кнопки для тактики\n' +
        '⚔️ Всі дії просте й смертоносне\n' +
        '• При помилці бот підкаже що робити\n\n' +
        '❓ Питання? Звертайтеся до адміністратора!';
    return ctx.reply(helpMessage, { parse_mode: 'HTML' });
});
bot.command('settings', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'settings_command');
    return ctx.scene.enter('SETTINGS_SCENE');
});
const userHandlers_1 = __importDefault(require("./handlers/userHandlers"));
const adminHandlers_1 = __importDefault(require("./handlers/adminHandlers"));
logger_1.logger.info('Registering handlers...');
(0, adminHandlers_1.default)(bot);
logger_1.logger.info('Admin handlers registered');
(0, userHandlers_1.default)(bot);
logger_1.logger.info('User handlers registered');
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
    const { getRandomBook } = await Promise.resolve().then(() => __importStar(require('./database/recommendationFunctions')));
    const book = await getRandomBook();
    if (book) {
        const { formatBookCaption } = await Promise.resolve().then(() => __importStar(require('./utils/helpers')));
        const { getEnhancedBookKeyboard } = await Promise.resolve().then(() => __importStar(require('./keyboards/mainKeyboards')));
        const caption = await formatBookCaption(book);
        if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
            await ctx.replyWithPhoto(book.photo_file_id, {
                caption,
                parse_mode: 'HTML',
                reply_markup: getEnhancedBookKeyboard(book),
            });
        }
        else {
            await ctx.reply(caption, {
                parse_mode: 'HTML',
                reply_markup: getEnhancedBookKeyboard(book),
            });
        }
    }
    else {
        await ctx.reply('❌ На жаль, зараз немає доступних книг');
    }
});
bot.action('back_to_menu', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await ctx.reply('👋 Повертаємось до головного меню', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        logger_1.logger.userAction(ctx.from.id, 'back_to_menu');
    }
    catch (error) {
        logger_1.logger.error('Error in back_to_menu handler', error instanceof Error ? error : new Error(String(error)));
    }
});
bot.action('back_to_admin', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const { isAdmin, getAdminStats, getPendingReviews, getPendingFeedbackMessages } = await Promise.resolve().then(() => __importStar(require('./database/models')));
        const { getAdminMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('./keyboards/adminKeyboards')));
        const adminCheck = await isAdmin(ctx.from.id);
        if (!adminCheck) {
            await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
            return;
        }
        const stats = await getAdminStats();
        const pendingReviews = await getPendingReviews();
        const pendingFeedback = await getPendingFeedbackMessages();
        const reviewsAlert = pendingReviews.length > 0
            ? `📝 Відгуків на модерацію: <b>${pendingReviews.length}</b> 🔔`
            : '✅ Всі відгуки оброблені';
        const feedbackAlert = pendingFeedback.length > 0
            ? `📞 Нових повідомлень: <b>${pendingFeedback.length}</b> 🔔`
            : '✅ Всі повідомлення прочитані';
        try {
            await ctx.deleteMessage();
        }
        catch (error) {
        }
        await ctx.reply('🔄 Повертаємось до адмін-панелі...', {
            reply_markup: { remove_keyboard: true },
        });
        await ctx.reply('🛠️ <b>Панель адміністратора</b>\n\n' +
            '📊 <b>Статистика:</b>\n' +
            `📚 Книг в каталозі: ${stats.totalBooks}\n` +
            `${reviewsAlert}\n` +
            `${feedbackAlert}`, {
            parse_mode: 'HTML',
            reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
        });
    }
    catch (error) {
        logger_1.logger.error('Error in back_to_admin handler', error instanceof Error ? error : new Error(String(error)));
        await ctx.reply('❌ Помилка при поверненні до адмін-панелі');
    }
});
let notificationScheduler = null;
const shutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}, shutting down gracefully`);
    if (notificationScheduler) {
        const { stopNotificationScheduler } = await Promise.resolve().then(() => __importStar(require('./utils/notifications')));
        stopNotificationScheduler(notificationScheduler);
    }
    const { cleanupRateLimiters } = await Promise.resolve().then(() => __importStar(require('./middleware/rateLimit')));
    cleanupRateLimiters();
    try {
        await new Promise((resolve, reject) => {
            models_1.db.close((err) => {
                if (err) {
                    logger_1.logger.error('Error closing database', err);
                    reject(err);
                }
                else {
                    logger_1.logger.info('Database closed successfully');
                    resolve();
                }
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to close database', error instanceof Error ? error : new Error(String(error)));
    }
    bot.stop(signal);
    process.exit(0);
};
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
logger_1.logger.info('Starting bot launch');
(async () => {
    try {
        logger_1.logger.info('Initializing database...');
        const { initDatabase } = await Promise.resolve().then(() => __importStar(require('./database/models')));
        await initDatabase();
        logger_1.logger.info('Database initialized successfully');
        logger_1.logger.info('Launching bot...');
        await bot.launch({
            dropPendingUpdates: true,
        });
        logger_1.logger.info('Bot launched successfully', { username: bot.botInfo?.username });
        const { startNotificationScheduler } = await Promise.resolve().then(() => __importStar(require('./utils/notifications')));
        notificationScheduler = startNotificationScheduler(bot);
        logger_1.logger.info('Notification scheduler started');
        const { startAutoBackup } = await Promise.resolve().then(() => __importStar(require('./utils/autoBackup')));
        startAutoBackup();
        logger_1.logger.info('Automatic backup scheduler started');
    }
    catch (error) {
        logger_1.logger.error('Bot launch error', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    }
})();
//# sourceMappingURL=index.js.map