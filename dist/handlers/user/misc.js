"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMiscHandlers = registerMiscHandlers;
const telegraf_1 = require("telegraf");
const logger_1 = require("../../utils/logger");
const constants_1 = require("../../constants");
const promoCodeFunctions_1 = require("../../database/promoCodeFunctions");
function registerMiscHandlers(bot) {
    bot.hears('🎁 Отримати промокод', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.reply(constants_1.ERRORS.USER_NOT_FOUND);
                return;
            }
            await ctx.reply('🎁 <b>ПРОМОКОД YAKABOO UNLIMITED</b>\n\n' +
                '━━━━━━━━━━━━━━━━━━━\n\n' +
                '📚 <b>Що таке Yakaboo Unlimited?</b>\n\n' +
                'Це платна підписка від Yakaboo, яка відкриває доступ до великої бібліотеки ' +
                'електронних та аудіокниг у мобільному застосунку.\n\n' +
                '✅ <b>Що входить:</b>\n' +
                '• Понад 75 000 електронних книг та аудіокниг\n' +
                '• 150+ українських і світових видавництв\n' +
                '• Синхронізація прогресу між пристроями\n' +
                '• Мобільний застосунок (iOS/Android)\n' +
                '• Різні жанри: художня література, нон-фікшн, бізнес, дитячі книги\n\n' +
                '━━━━━━━━━━━━━━━━━━━\n\n' +
                '🎯 <b>ПРОМОКОД дає безкоштовний доступ до підписки!</b>\n\n' +
                '⚠️ <b>ВАЖЛИВО:</b>\n' +
                '• Промокод розрахований на ОДНУ БЕЗКОШТОВНУ реєстрацію\n' +
                '• Один промокод = одна людина\n' +
                '• Використати можна ТІЛЬКИ ОДИН РАЗ\n\n' +
                '💡 <b>Якщо не зареєструєшся на сайті Yakaboo:</b>\n' +
                'Ти можеш повернути промокод тією ж командою "🎁 Отримати промокод" ' +
                'і він стане доступним для інших.\n\n' +
                '━━━━━━━━━━━━━━━━━━━\n\n' +
                '❓ <b>Чи точно тобі потрібен промокод?</b>', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('✅ Так, отримати промокод', 'confirm_get_promocode')],
                    [telegraf_1.Markup.button.callback('🔄 Повернути промокод', 'return_promocode')],
                    [telegraf_1.Markup.button.callback('❌ Ні, скасувати', 'cancel_promocode')],
                ]).reply_markup,
            });
            logger_1.logger.userAction(userId, 'view_promocode_info');
        }
        catch (error) {
            logger_1.logger.error('Error showing promocode info', error, { userId: ctx.from?.id });
            await ctx.reply(constants_1.ERRORS.GENERIC);
        }
    });
    bot.action('confirm_get_promocode', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.editMessageText('❌ Помилка: не вдалося ідентифікувати користувача');
                return;
            }
            const hasReceived = await (0, promoCodeFunctions_1.hasUserReceivedPromoCode)(userId);
            if (hasReceived) {
                await ctx.editMessageText('⚠️ <b>Ви вже отримували промокод раніше!</b>\n\n' +
                    'Якщо ви не використали його, ви можете повернути промокод кнопкою нижче.', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('🔄 Повернути промокод', 'return_promocode')],
                        [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                    ]).reply_markup,
                });
                return;
            }
            const promoCode = await (0, promoCodeFunctions_1.getAvailablePromoCodeForUser)();
            if (!promoCode) {
                await ctx.editMessageText('😔 <b>Промокоди закінчилися</b>\n\n' +
                    'На жаль, зараз немає доступних промокодів. Спробуйте пізніше або зверніться до адміністратора.', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback("📞 Зворотній зв'язок", 'feedback')],
                        [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                    ]).reply_markup,
                });
                return;
            }
            await (0, promoCodeFunctions_1.markPromoCodeAsUsed)(userId, promoCode.id);
            await ctx.editMessageText('🎉 <b>ВАШ ПРОМОКОД YAKABOO UNLIMITED</b>\n\n' +
                `🎫 Код: <code>${promoCode.code}</code>\n` +
                '<i>(натисніть щоб скопіювати)</i>\n\n' +
                '━━━━━━━━━━━━━━━━━━━\n\n' +
                '📱 <b>Як активувати:</b>\n' +
                '1️⃣ Завантажте застосунок Yakaboo (iOS/Android)\n' +
                '2️⃣ Зареєструйтесь або увійдіть в акаунт\n' +
                '3️⃣ Введіть промокод у розділі підписки\n' +
                '4️⃣ Насолоджуйтесь 75 000+ книгами! 📚\n\n' +
                '━━━━━━━━━━━━━━━━━━━\n\n' +
                '⚠️ <b>Пам\'ятайте:</b>\n' +
                '• Промокод діє для ОДНОЇ реєстрації\n' +
                '• Якщо НЕ використали - поверніть його!\n' +
                '• Інші зможуть ним скористатися\n\n' +
                '💡 Щоб повернути промокод, натисніть:\n' +
                '"🎁 Отримати промокод" → "🔄 Повернути промокод"', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('📖 Відкрити каталог', 'catalog')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
            logger_1.logger.userAction(userId, 'received_promocode', {
                promoCodeId: promoCode.id,
                code: promoCode.code,
            });
        }
        catch (error) {
            logger_1.logger.error('Error giving promocode', error, { userId: ctx.from?.id });
            await ctx.editMessageText('❌ Виникла помилка. Спробуйте пізніше.');
        }
    });
    bot.action('return_promocode', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.editMessageText('❌ Помилка: не вдалося ідентифікувати користувача');
                return;
            }
            const hasReceived = await (0, promoCodeFunctions_1.hasUserReceivedPromoCode)(userId);
            if (!hasReceived) {
                await ctx.editMessageText('⚠️ <b>Ви ще не отримували промокод</b>\n\n' +
                    'Спочатку отримайте промокод, щоб мати можливість його повернути.', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('✅ Отримати промокод', 'confirm_get_promocode')],
                        [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                    ]).reply_markup,
                });
                return;
            }
            const userPromoCode = await (0, promoCodeFunctions_1.getUserPromoCode)(userId);
            if (!userPromoCode) {
                await ctx.editMessageText('❌ <b>Промокод не знайдено</b>\n\n' +
                    'Неможливо знайти ваш промокод. Зверніться до адміністратора.', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback("📞 Зворотній зв'язок", 'feedback')],
                        [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                    ]).reply_markup,
                });
                return;
            }
            await ctx.editMessageText('🔄 <b>ПОВЕРНЕННЯ ПРОМОКОДУ</b>\n\n' +
                `🎫 Ваш промокод: <code>${userPromoCode.code}</code>\n\n` +
                '⚠️ <b>Ви впевнені, що хочете повернути промокод?</b>\n\n' +
                'Якщо ви повернете промокод:\n' +
                '✅ Він стане доступним для інших користувачів\n' +
                '✅ Ви зможете отримати новий промокод пізніше\n' +
                '❌ Цей промокод більше не буде прив\'язаний до вас\n\n' +
                '💡 Поверніть промокод тільки якщо ви НЕ зареєструвалися на Yakaboo!', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('✅ Так, повернути', 'confirm_return_promocode')],
                    [telegraf_1.Markup.button.callback('❌ Ні, залишити собі', 'cancel_return_promocode')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
            logger_1.logger.userAction(userId, 'view_return_promocode_confirmation');
        }
        catch (error) {
            logger_1.logger.error('Error showing return promocode', error, { userId: ctx.from?.id });
            await ctx.editMessageText('❌ Виникла помилка. Спробуйте пізніше.');
        }
    });
    bot.action('confirm_return_promocode', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.editMessageText('❌ Помилка: не вдалося ідентифікувати користувача');
                return;
            }
            const result = await (0, promoCodeFunctions_1.returnPromoCode)(userId);
            if (!result) {
                await ctx.editMessageText('❌ <b>Помилка повернення</b>\n\n' +
                    'Не вдалося повернути промокод. Спробуйте пізніше або зверніться до адміністратора.', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback("📞 Зворотній зв'язок", 'feedback')],
                        [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                    ]).reply_markup,
                });
                return;
            }
            await ctx.editMessageText('✅ <b>ПРОМОКОД УСПІШНО ПОВЕРНУТО</b>\n\n' +
                '🎉 Ваш промокод повернуто до пулу!\n\n' +
                'Тепер:\n' +
                '✅ Інші користувачі можуть його отримати\n' +
                '✅ Ви можете отримати новий промокод\n\n' +
                'Дякуємо за чесність! 💙💛', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🎁 Отримати новий промокод', 'home')],
                    [telegraf_1.Markup.button.callback('📖 До каталогу', 'catalog')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
            logger_1.logger.userAction(userId, 'returned_promocode', { success: true });
        }
        catch (error) {
            logger_1.logger.error('Error returning promocode', error, { userId: ctx.from?.id });
            await ctx.editMessageText('❌ Виникла помилка. Спробуйте пізніше.');
        }
    });
    bot.action('cancel_return_promocode', async (ctx) => {
        await ctx.answerCbQuery('Промокод залишається у вас');
        await ctx.editMessageText('✅ <b>Промокод залишається у вас</b>\n\n' +
            'Не забудьте активувати його у застосунку Yakaboo!\n\n' +
            '📱 <b>Як активувати:</b>\n' +
            '1. Завантажте застосунок Yakaboo\n' +
            '2. Зареєструйтесь або увійдіть\n' +
            '3. Введіть промокод у розділі підписки\n' +
            '4. Насолоджуйтесь читанням! 📚', {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('📖 До каталогу', 'catalog')],
                [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
            ]).reply_markup,
        });
    });
    bot.action('cancel_promocode', async (ctx) => {
        await ctx.answerCbQuery('Скасовано');
        await ctx.editMessageText('❌ Дію скасовано.\n\nЯкщо передумаєте, натисніть "🎁 Отримати промокод" у головному меню.', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([[telegraf_1.Markup.button.callback('🏠 На головну', 'home')]])
                .reply_markup,
        });
    });
    bot.hears('🔍 Пошук', async (ctx) => {
        await ctx.scene.enter('SEARCH_SCENE');
        logger_1.logger.userAction(ctx.from.id, 'search_from_menu');
    });
    bot.hears('⚙️ Налаштування', async (ctx) => {
        await ctx.scene.enter('SETTINGS_SCENE');
        logger_1.logger.userAction(ctx.from.id, 'view_settings');
    });
    bot.action('settings_scene', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.scene.enter('SETTINGS_SCENE');
            logger_1.logger.userAction(ctx.from.id, 'view_settings');
        }
        catch (error) {
            logger_1.logger.error('Error entering settings scene', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.hears([constants_1.BUTTONS.PROFILE_OLD, constants_1.BUTTONS.PROFILE], async (ctx) => {
        await ctx.scene.enter('PROFILE_SCENE');
        logger_1.logger.userAction(ctx.from.id, 'view_profile');
    });
    bot.hears(constants_1.BUTTONS.FEEDBACK, async (ctx) => {
        await ctx.scene.enter('FEEDBACK_SCENE');
        logger_1.logger.userAction(ctx.from.id, 'start_feedback');
    });
    bot.hears(constants_1.BUTTONS.AI_ASSISTANT, async (ctx) => {
        await ctx.scene.enter('AI_SCENE');
        logger_1.logger.userAction(ctx.from.id, 'start_ai');
    });
    bot.hears(constants_1.BUTTONS.HELP, async (ctx) => {
        const helpMessage = '╔════════════════════════════════════════╗\n' +
            '  ⚔️ <b>ДОВІДКА ВОЇНА</b> 🗡️\n' +
            '╚════════════════════════════════════════╝\n\n' +
            'Виберіть розділ для детальної інформації:\n\n' +
            '📚 Основні кнопки меню\n' +
            '📖 Дії з книгою\n' +
            '⚡ Швидкий старт\n' +
            '❓ Популярні питання\n' +
            '🎁 Як отримати 75K книг\n' +
            '💡 Поради та трюки\n\n' +
            'Натискай кнопки внизу для перегляду 👇';
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('📚 Основні кнопки', 'help_buttons')],
            [telegraf_1.Markup.button.callback('📖 Дії з книгою', 'help_actions')],
            [telegraf_1.Markup.button.callback('⚡ Швидкий старт', 'help_quickstart')],
            [telegraf_1.Markup.button.callback('❓ Популярні питання', 'help_faq')],
            [telegraf_1.Markup.button.callback('🎁 Промокод', 'help_promo')],
            [telegraf_1.Markup.button.callback('💡 Поради', 'help_tips')],
        ]);
        await ctx.reply(helpMessage, { ...keyboard, parse_mode: 'HTML' });
        logger_1.logger.userAction(ctx.from.id, 'view_help');
    });
    bot.action('start_search', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.scene.enter('SEARCH_SCENE');
        }
        catch (error) {
            logger_1.logger.error('Error starting search from help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('start_ai', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.scene.enter('AI_SCENE');
        }
        catch (error) {
            logger_1.logger.error('Error starting AI from help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('view_profile', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.scene.enter('PROFILE_SCENE');
        }
        catch (error) {
            logger_1.logger.error('Error viewing profile from help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('feedback', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.scene.enter('FEEDBACK_SCENE');
        }
        catch (error) {
            logger_1.logger.error('Error starting feedback from callback', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('catalog', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await ctx.reply('📚 <b>КАТАЛОГ</b>\n\n' + 'Оберіть розділ:', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [
                        telegraf_1.Markup.button.callback('📖 Книги', 'catalog_books'),
                        telegraf_1.Markup.button.callback('🎙️ Підкасти', 'catalog_podcasts'),
                    ],
                ]).reply_markup,
            });
            logger_1.logger.userAction(ctx.from.id, 'view_catalog_main_callback');
        }
        catch (error) {
            logger_1.logger.error('Error showing catalog from callback', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/^menu_/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const match = ctx.match;
            if (!match || !match[0]) {
                await ctx.answerCbQuery('❌ Помилка');
                return;
            }
            const callbackData = match[0];
            const buttonName = callbackData.replace('menu_', '').replace(/_/g, ' ');
            const menuMap = {
                '📚 Бібліотека': 'catalog_books',
                '⭐ Топ книги': 'top_books',
                '🆕 Новинки': 'new_books',
                '❤️ Мої улюблені': 'saved_books',
                '👤 Профіль': 'view_profile',
                '🤖 AI Помічник': 'start_ai',
                '🎁 Промокод': 'confirm_get_promocode',
                '⚙️ Налаштування': 'settings_scene',
                '❓ Допомога': 'help',
                '💬 Зворотній зв\'язок': 'feedback',
            };
            const action = menuMap[buttonName];
            if (!action) {
                logger_1.logger.warn('Unknown menu button', { buttonName, callbackData });
                await ctx.answerCbQuery('Невідома дія');
                return;
            }
            if (ctx.scene) {
                await ctx.scene.leave();
            }
            if (action === 'catalog_books') {
                await ctx.scene.enter('CATALOG_SCENE');
            }
            else if (action === 'top_books') {
                await ctx.reply('🏆 <b>ТОП КНИГИ</b>\n\n' +
                    'Завантаження топ книг за рейтингом...', { parse_mode: 'HTML' });
            }
            else if (action === 'new_books') {
                await ctx.reply('🆕 <b>НОВИНКИ</b>\n\n' +
                    'Завантаження нових книг...', { parse_mode: 'HTML' });
            }
            else if (action === 'saved_books') {
                await ctx.reply('❤️ <b>МОЇ УЛЮБЛЕНІ</b>\n\n' +
                    'Завантаження ваших улюблених книг...', { parse_mode: 'HTML' });
            }
            else if (action === 'settings_scene') {
                await ctx.scene.enter('SETTINGS_SCENE');
            }
            else if (action === 'feedback') {
                await ctx.scene.enter('FEEDBACK_SCENE');
            }
            else if (action === 'start_ai') {
                await ctx.scene.enter('AI_SCENE');
            }
            else if (action === 'view_profile') {
                await ctx.scene.enter('PROFILE_SCENE');
            }
            logger_1.logger.userAction(ctx.from?.id || 0, `menu_action_${action}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling menu action', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
}
//# sourceMappingURL=misc.js.map