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
const constants_1 = require("./constants");
const helpers_1 = require("./utils/helpers");
const env = (0, environmentSetup_1.setupEnvironment)();
const container = (0, ContainerBootstrap_1.getContainer)();
(0, ContainerBootstrap_1.bootstrapContainer)(container).catch((error) => {
    logger_1.logger.error('Failed to bootstrap container', error);
    process.exit(1);
});
const bot = new telegraf_1.Telegraf(env.BOT_TOKEN);
bot.telegram.setChatMenuButton({
    menuButton: {
        type: 'web_app',
        text: '🌐 Yakaboo',
        web_app: { url: 'https://www.yakaboo.ua/' },
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
        await ctx.reply(constants_1.UX.errorGlobalHtml, { parse_mode: 'HTML' });
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
            constants_1.BUTTONS.CATALOG,
            constants_1.BUTTONS.SEARCH,
            constants_1.BUTTONS.TOP_BOOKS,
            constants_1.BUTTONS.NEW_BOOKS,
            constants_1.BUTTONS.MY_LIBRARY,
            constants_1.BUTTONS.PROFILE,
            constants_1.BUTTONS.AI_ASSISTANT,
            constants_1.BUTTONS.PROMO,
            constants_1.BUTTONS.SETTINGS,
            constants_1.BUTTONS.HELP,
            constants_1.BUTTONS.FEEDBACK,
            constants_1.BUTTONS.YAKABOO,
            constants_1.BUTTONS.HOME,
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
        const welcomeMessage = constants_1.UX.welcomeBack((0, helpers_1.escapeHtml)(firstName));
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
    const helpMessage = constants_1.UX.helpHubHtml;
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback('📚 Основні кнопки', 'help_buttons')],
        [telegraf_1.Markup.button.callback('📖 Дії з книгою', 'help_actions')],
        [telegraf_1.Markup.button.callback('⚡ Швидкий старт', 'help_quickstart')],
        [telegraf_1.Markup.button.callback('❓ Популярні питання', 'help_faq')],
        [telegraf_1.Markup.button.callback('🎁 Промокод', 'help_promo')],
        [telegraf_1.Markup.button.callback('💡 Поради', 'help_tips')],
    ]);
    return ctx.reply(helpMessage, { ...keyboard, parse_mode: 'HTML' });
});
bot.hears('🌐 Yakaboo', async (ctx) => {
    const message = `${constants_1.UX.yakabooTeaserHtml}\n\n👇 Відкрити в браузері:`;
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.url('🌐 Перейти на Yakaboo.ua', 'https://www.yakaboo.ua/')],
    ]);
    return ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
});
bot.action('help_buttons', async (ctx) => {
    const message = '<b>📚 ОСНОВНІ КНОПКИ МЕНЮ</b>\n\n' +
        '📖 <b>Каталог</b>\n' +
        '  Усе в одному повідомленні: жанри, алфавіт, рейтинг, новинки, аудіо, теги, підкасти — з пагінацією.\n\n' +
        '🏆 <b>Топ книги</b>\n' +
        '  Найкраще оцінені твори від читачів\n' +
        '  Шедеври та популярні книги\n\n' +
        '🆕 <b>Новинки</b>\n' +
        '  Свіжі видання книг та подкастів\n' +
        '  Останні додані скарби\n\n' +
        '💾 <b>Моя бібліотека</b>\n' +
        '  Твої улюблені книги (максимум 20)\n' +
        '  Швидкий доступ, видалення\n\n' +
        '👤 <b>Профіль</b>\n' +
        '  Твоя статистика та історія\n' +
        '  AI рекомендації на основі смаку\n' +
        '  Улюблені жанри та автори\n\n' +
        '🤖 <b>AI Помічник</b>\n' +
        '  Розумний пошук природною мовою\n' +
        '  Приклади: "страшна книга", "для дітей"\n\n' +
        '🎁 <b>Промокод</b>\n' +
        '  Розблокуй доступ до 75,000+ книг\n' +
        '  YAKABOO UNLIMITED\n\n' +
        '⚙️ <b>Налаштування</b>\n' +
        '  Клавіатура (мобіль/планшет/ПК)\n' +
        '  Сповіщення про новинки\n\n' +
        "📞 <b>Зворотний зв'язок</b>\n" +
        '  Напиши адміну, якщо є проблеми\n\n' +
        '<i>← Назад в меню</i>';
    const backButton = telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('← Назад в меню', 'back_to_help'),
    ]);
    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
});
bot.action('help_actions', async (ctx) => {
    const message = '<b>📖 ДІЇ З КНИГОЮ</b>\n\n' +
        '📥 <b>ЗАВАНТАЖИТИ</b>\n' +
        '  Формати: PDF, EPUB, FB2, MOBI\n' +
        '  Файл надійде в приватні повідомлення\n' +
        '  Читай офлайн на своєму пристрої\n\n' +
        '🌐 <b>ЧИТАТИ ОНЛАЙН</b>\n' +
        '  Читай без завантаження\n' +
        '  Google Drive, Dropbox та інші\n' +
        '  Прямо в браузері\n\n' +
        '🎧 <b>СЛУХАТИ</b>\n' +
        '  Аудіокниги та подкасти\n' +
        '  Вбудований плеєр\n' +
        '  Закладки та позначки\n' +
        '  Автоматичне збереження прогресу\n\n' +
        '⭐ <b>ОЦІНИТИ</b>\n' +
        '  Рейтинг від 1 до 5 зірок\n' +
        '  Напиши рецензію/коментар\n' +
        '  Модеруються для якості\n\n' +
        '💾 <b>ЗБЕРЕГТИ</b>\n' +
        '  Додай в "Мою бібліотеку" (до 20)\n' +
        '  ❤️ Червоне серце = вже збережено\n' +
        '  Швидкий доступ пізніше\n\n' +
        '📊 <b>ВІДГУКИ</b>\n' +
        '  Читай думки інших читачів\n' +
        '  Середній рейтинг книги\n' +
        '  Найкорисніші першими\n\n' +
        '🔍 <b>СХОЖІ КНИГИ</b>\n' +
        '  AI розраховує подібні твори\n' +
        '  За жанром і тематикою\n\n' +
        '<i>← Назад в меню</i>';
    const backButton = telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('← Назад в меню', 'back_to_help'),
    ]);
    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
});
bot.action('help_quickstart', async (ctx) => {
    const message = '<b>⚡ ШВИДКИЙ СТАРТ</b>\n\n' +
        '<b>Крок 1: Розблокуй 75K книг</b>\n' +
        '→ Натисни кнопку 🎁 Промокод\n' +
        '→ Дотримуйся інструкцій\n' +
        '→ Готово! Весь світ книг твій\n\n' +
        '<b>Крок 2: Шукай книги</b>\n' +
        '→ 📖 Каталог - переглядай по жанрам\n' +
        '→ 🤖 AI Помічник - пиши природною мовою\n' +
        '→ "страшна книга", "романтика", "фентезі"\n\n' +
        '<b>Крок 3: Вибери формат</b>\n' +
        '→ 📥 Завантажити - офлайн на пристрої\n' +
        '→ 🌐 Читати - в браузері\n' +
        '→ 🎧 Слухати - аудіокниги\n\n' +
        '<b>Крок 4: Зберігай улюблені</b>\n' +
        '→ 💾 Зберегти в Мою бібліотеку\n' +
        '→ ⭐ Оцінити книгу\n' +
        '→ 📊 Читати відгуки інших\n\n' +
        '<b>Готово! Можеш насолоджуватись! 📚</b>\n\n' +
        '<i>← Назад в меню</i>';
    const backButton = telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('← Назад в меню', 'back_to_help'),
    ]);
    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
});
bot.action('help_faq', async (ctx) => {
    const message = '<b>❓ ПОПУЛЯРНІ ПИТАННЯ</b>\n\n' +
        '<b>Q: Як отримати доступ до 75K книг?</b>\n' +
        'A: Натисни 🎁 Промокод → слідуй інструкціям\n\n' +
        '<b>Q: Де знайти книгу за назвою?</b>\n' +
        'A: 📖 Каталог → виберіть розділ → шукайте\n' +
        'Або: 🤖 AI → напишіть назву/стиль\n\n' +
        '<b>Q: Як скачати книгу?</b>\n' +
        'A: Вибери книгу → натисни 📥 Завантажити\n' +
        'Файл буде в приватних повідомленнях\n\n' +
        '<b>Q: Як зберегти улюблену?</b>\n' +
        'A: Вибери книгу → натисни 💾 Зберегти\n' +
        'Пізніше знайдеш у 💾 Моя бібліотека\n\n' +
        '<b>Q: Як залишити рецензію?</b>\n' +
        'A: Книга → 📊 Відгуки → напиши думку\n\n' +
        '<b>Q: Скільки книг зберегти?</b>\n' +
        'A: Максимум 20 в Моя бібліотека\n\n' +
        '<b>Q: Як отримувати сповіщення?</b>\n' +
        'A: ⚙️ Налаштування → включи сповіщення\n\n' +
        '<b>Q: Як написати адміну?</b>\n' +
        "A: Натисни 📞 Зворотний зв'язок\n\n" +
        '<i>← Назад в меню</i>';
    const backButton = telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('← Назад в меню', 'back_to_help'),
    ]);
    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
});
bot.action('help_promo', async (ctx) => {
    const message = '<b>🎁 YAKABOO UNLIMITED ПРОМОКОД</b>\n\n' +
        '<b>Що таке Yakaboo Unlimited?</b>\n' +
        'Платна підписка від Yakaboo з доступом до:\n' +
        '✓ 75,000+ електронних та аудіокниг\n' +
        '✓ 150+ українських і світових видавництв\n' +
        '✓ Художня література, нон-фікшн, бізнес, дітям\n' +
        '✓ Синхронізація прогресу між пристроями\n\n' +
        '<b>🎯 ПРОМОКОД дає БЕЗКОШТОВНИЙ доступ!</b>\n\n' +
        '<b>⚠️ ВАЖЛИВО:</b>\n' +
        '• Один промокод = один користувач\n' +
        '• Використати можна ТІЛЬКИ ОДИН РАЗ\n' +
        '• Активується НА САЙТІ YAKABOO, не в боті\n\n' +
        '<b>📱 Як АКТИВУВАТИ ПРОМОКОД:</b>\n\n' +
        '<b>1️⃣ Завантаж додаток Yakaboo</b>\n' +
        '  iOS → App Store\n' +
        '  Android → Google Play\n\n' +
        '<b>2️⃣ Зареєструйся на Yakaboo</b>\n' +
        '  Веди e-mail або номер телефону\n' +
        '  Підтвердь реєстрацію\n\n' +
        '<b>3️⃣ Активуй промокод</b>\n' +
        '  Профіль → Промокоди\n' +
        '  "Додати промокод"\n' +
        '  Веди отриманий код\n' +
        '  Натисни "Активувати"\n\n' +
        '<b>4️⃣ Готово! 📚</b>\n' +
        '  Весь доступ розблоковано\n' +
        '  Читай, слухай, синхронізуй\n\n' +
        '<b>💡 Не потрібен промокод?</b>\n' +
        'Натисни 🎁 Промокод → "Повернути код"\n' +
        'Код буде доступний іншим користувачам\n\n' +
        '<i>← Назад в меню</i>';
    const backButton = telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('← Назад в меню', 'back_to_help'),
    ]);
    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
});
bot.action('help_tips', async (ctx) => {
    const message = '<b>💡 ПОРАДИ ТА ТРЮКИ</b>\n\n' +
        '<b>Для пошуку:</b>\n' +
        '✓ Використовуй 🤖 AI для синонімів\n' +
        '"Sci-Fi" = "Фантастика" = "Космос"\n' +
        '✓ AI розуміє описи природною мовою\n' +
        '✓ Джерелу фільтрувати за жанрами\n\n' +
        '<b>Для читання:</b>\n' +
        '✓ PDF/EPUB - офлайн на пристрої\n' +
        '✓ Онлайн - без завантаження\n' +
        '✓ Аудіо - слухай під час руху\n\n' +
        '<b>Для управління:</b>\n' +
        '✓ Зберігай улюблені (макс 20)\n' +
        '✓ Читай рецензії перед початком\n' +
        '✓ Залишай оцінки - допомагай іншим\n' +
        '✓ Видаляй зі збережених при потребі\n\n' +
        '<b>Для персоналізації:</b>\n' +
        '✓ Включи сповіщення в налаштуваннях\n' +
        '✓ Вибери тип клавіатури для комфорту\n' +
        '✓ Переглядай 👤 Профіль для рекомендацій\n\n' +
        '<b>Загальні трюки:</b>\n' +
        '✓ Всі дії через кнопки - просто й швидко\n' +
        '✓ Натисни 🏠 На головну в будь-якій сесії\n' +
        '✓ /start завжди вернеться на старт\n\n' +
        '<i>← Назад в меню</i>';
    const backButton = telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('← Назад в меню', 'back_to_help'),
    ]);
    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
});
bot.action('back_to_help', async (ctx) => {
    const helpMessage = constants_1.UX.helpHubHtml;
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback('📚 Основні кнопки', 'help_buttons')],
        [telegraf_1.Markup.button.callback('📖 Дії з книгою', 'help_actions')],
        [telegraf_1.Markup.button.callback('⚡ Швидкий старт', 'help_quickstart')],
        [telegraf_1.Markup.button.callback('❓ Популярні питання', 'help_faq')],
        [telegraf_1.Markup.button.callback('🎁 Промокод', 'help_promo')],
        [telegraf_1.Markup.button.callback('💡 Поради', 'help_tips')],
    ]);
    return ctx.editMessageText(helpMessage, { ...keyboard, parse_mode: 'HTML' });
});
bot.command('settings', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'settings_command');
    return ctx.scene.enter('SETTINGS_SCENE');
});
bot.command('catalog', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'catalog_command');
    return ctx.scene.enter('CATALOG_SCENE');
});
bot.hears(constants_1.BUTTONS.CATALOG, async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'catalog_button');
    return ctx.scene.enter('CATALOG_SCENE');
});
bot.command('library', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'library_command');
    const { getSavedBooks } = await Promise.resolve().then(() => __importStar(require('./database/models')));
    const { displaySavedBooks } = await Promise.resolve().then(() => __importStar(require('./utils/bookDisplay')));
    const userId = ctx.from.id;
    const savedBooks = await getSavedBooks(userId);
    if (savedBooks.length === 0) {
        await ctx.reply(constants_1.UX.emptyLibraryHtml, { parse_mode: 'HTML' });
        return;
    }
    return displaySavedBooks(ctx, savedBooks);
});
bot.command('profile', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'profile_command');
    return ctx.scene.enter('PROFILE_SCENE');
});
bot.command('ai', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'ai_command');
    return ctx.scene.enter('AI_SCENE');
});
bot.command('top', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'top_command');
    const { getTopBooks } = await Promise.resolve().then(() => __importStar(require('./database/models')));
    const { displayTopBooks } = await Promise.resolve().then(() => __importStar(require('./utils/bookDisplay')));
    const topBooks = await getTopBooks(10);
    return displayTopBooks(ctx, topBooks);
});
bot.command('new', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'new_command');
    const { getNewestBooks } = await Promise.resolve().then(() => __importStar(require('./database/models')));
    const { displayNewBooks } = await Promise.resolve().then(() => __importStar(require('./utils/bookDisplay')));
    const newBooks = await getNewestBooks(5);
    if (newBooks.length === 0) {
        await ctx.reply(constants_1.UX.emptyNew);
        return;
    }
    return displayNewBooks(ctx, newBooks);
});
bot.command('feedback', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'feedback_command');
    return ctx.scene.enter('FEEDBACK_SCENE');
});
bot.command('search', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'search_command');
    return ctx.scene.enter('SEARCH_SCENE');
});
bot.command('website', async (ctx) => {
    logger_1.logger.userAction(ctx.from.id, 'website_command');
    return ctx.reply('🌐 Сайт Yakaboo — найбільший книжковий магазин України:', {
        reply_markup: {
            inline_keyboard: [[{ text: '📚 Відкрити Yakaboo', url: 'https://www.yakaboo.ua/' }]],
        },
    });
});
bot.telegram.setMyCommands([
    { command: 'start', description: '🏠 Головне меню' },
    { command: 'catalog', description: '📖 Каталог книг' },
    { command: 'search', description: '🔍 Пошук книг' },
    { command: 'library', description: '💾 Моя бібліотека' },
    { command: 'top', description: '🏆 Топ книги' },
    { command: 'new', description: '🆕 Новинки' },
    { command: 'ai', description: '🤖 AI Помічник' },
    { command: 'profile', description: '👤 Мій профіль' },
    { command: 'settings', description: '⚙️ Налаштування' },
    { command: 'feedback', description: constants_1.BUTTONS.FEEDBACK },
    { command: 'website', description: '🌐 Сайт Yakaboo' },
    { command: 'help', description: 'ℹ️ Допомога' },
    { command: 'admin', description: '🛠️ Адмін панель' },
]);
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
        await ctx.reply(`<b>${constants_1.UX.navHomeTitle}</b>\n${constants_1.UX.navHomeBody}`, {
            parse_mode: 'HTML',
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
        catch (_error) { }
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
        logger_1.logger.info('Running database migrations...');
        const { MigrationManager } = await Promise.resolve().then(() => __importStar(require('./database/MigrationManager')));
        const { db } = await Promise.resolve().then(() => __importStar(require('./database/models')));
        const migrationManager = new MigrationManager(db);
        await migrationManager.init();
        const migrationResult = await migrationManager.migrate();
        logger_1.logger.info('Database migrations completed', { count: migrationResult.count });
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