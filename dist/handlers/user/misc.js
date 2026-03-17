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
        const helpMessage = `
<b>Основні можливості:</b>
📖 <b>Каталог</b> - перегляд усіх книг за різними категоріями
🏆 <b>Топ книги</b> - найкращі книги за рейтингом
🆕 <b>Новинки</b> - нещодавно додані книги
💾 <b>Моя бібліотека</b> - ваші збережені книги
👤 <b>Профіль</b> - ваш профіль і налаштування
🤖 <b>AI Помічник</b> - розумний пошук і рекомендації
📞 <b>Зворотній зв'язок</b> - надішліть нам повідомлення

<b>Як знайти книгу:</b>
1️⃣ Через каталог - оберіть жанр або спосіб перегляду
2️⃣ Через AI помічника - опишіть, що ви шукаєте

<b>Як зберегти книгу:</b>
❤️ Натисніть кнопку "💾 Зберегти" під описом книги
💔 Щоб видалити - натисніть кнопку знову

<b>Як завантажити:</b>
📥 Натисніть відповідну кнопку завантаження (PDF або аудіо)

<b>Мої замовлення:</b>
👤 Перейдіть в <b>Профіль</b> → натисніть кнопку "Мої замовлення"
📦 Там можна побачити свої замовлені книги

<b>Команди:</b>
/start - перезапустити бота
/settings - налаштування
/help - ця довідка
/admin - панель адміністратора (тільки для адмінів)

<b>Питання? Проблема?</b>
Використайте кнопку "📞 Зворотній зв'язок" у головному меню
`;
        await ctx.reply(helpMessage, {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [
                    telegraf_1.Markup.button.callback('📖 Каталог', 'catalog_genres'),
                    telegraf_1.Markup.button.callback('🤖 AI Помічник', 'start_ai'),
                ],
                [
                    telegraf_1.Markup.button.callback('👤 Профіль', 'view_profile'),
                    telegraf_1.Markup.button.callback('🏠 На головну', 'home'),
                ],
            ]).reply_markup,
        });
        logger_1.logger.userAction(ctx.from.id, 'view_help');
    });
    bot.action('help_main_buttons', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const message = `
📚 <b>ОСНОВНІ КНОПКИ МЕНЮ</b>

📖 <b>Каталог</b>
Перегляд усіх книг за різними категоріями:
• За жанрами
• За рейтингом
• По новинкам
• За алфавітом
• З аудіо
• За завантаженнями
• По тегам

🏆 <b>Топ книги</b>
Найкращі книги за рейтингом користувачів

🆕 <b>Новинки</b>
Нещодавно додані книги до нашої бібліотеки

💾 <b>Моя бібліотека</b>
Ваші збережені книги та вподобання

👤 <b>Профіль</b>
Ваш профіль, статистика і налаштування

🤖 <b>AI Помічник</b>
Розумний пошук з описом того, що вам потрібно

⚙️ <b>Налаштування</b>
Налаштування типу клавіатури та сповіщень

📞 <b>Зворотній зв'язок</b>
Надішліть нам повідомлення або скаргу

❓ <b>Допомога</b>
Ця довідка та поради
`;
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ Назад', 'help_back')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing main buttons help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('help_book_actions', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const message = `
📖 <b>ДІЇ З КНИГОЮ</b>

<b>Як переглянути книгу:</b>
1️⃣ Нажміть на книгу в каталозі
2️⃣ Прочитайте опис, автора, рейтинг
3️⃣ Розгляньте доступні формати

<b>Як зберегти книгу:</b>
❤️ Нажміть кнопку "💾 Зберегти" під описом
💔 Щоб видалити - нажміть кнопку знову
📋 Див. усі у "💾 Моя бібліотека"

<b>Як завантажити книгу:</b>
📥 <b>PDF формат:</b> Нажміть "📄 PDF"
🎧 <b>Аудіо формат:</b> Нажміть "🎧 Аудіо"
🌐 <b>Онлайн:</b> Нажміть "🔗 Читати онлайн"

<b>Як залишити відзив:</b>
⭐ Нажміть на рейтинг книги
💬 Напишіть ваш відзив

<b>Як замовити фізичну книгу:</b>
📦 У деяких книгах є кнопка замовлення
📍 Вкажіть свої дані для доставки

<b>Як знайти конкретну книгу:</b>
🔍 Використайте Каталог
💡 Скористайтесь 🤖 AI Помічником
`;
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ Назад', 'help_back')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing book actions help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('help_quick_start', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const message = `
⚡️ <b>ШВИДКИЙ СТАРТ</b>

<b>1️⃣ ПЕРШІ КРОКИ:</b>
👤 Потрібно пройти онбординг
🎓 Обрати улюблені жанри
📖 Отримати рекомендації

<b>2️⃣ ЗНАЙТИ КНИГУ:</b>
📚 Нажміть "📖 Каталог"
👆 Оберіть спосіб перегляду
📍 Прочитайте опис книги

<b>3️⃣ ЗБЕРЕГТИ КНИГУ:</b>
❤️ Нажміть "💾 Зберегти"
📋 Потім див. у "Моя бібліотека"

<b>4️⃣ ЗАВАНТАЖИТИ:</b>
📥 Натисніть "📄 PDF" або "🎧 Аудіо"
💾 Файл завантажиться на ваш пристрій

<b>5️⃣ ОТРИМАТИ ПРОМОКОД:</b>
🎁 Нажміть "🎁 Отримати промокод"
📱 Активуйте в застосунку Yakaboo
📚 Читайте 75K книг безкоштовно

<b>💡 ПОРАДИ:</b>
🤖 Спробуйте AI Помічника для підбору
⭐ Подивіться ТОП книги
👥 Читайте відзиви інших користувачів
`;
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ Назад', 'help_back')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing quick start help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('help_faq', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const message = `
❓ <b>ПОПУЛЯРНІ ПИТАННЯ</b>

<b>Як змінити тип клавіатури?</b>
⚙️ Нажміть "⚙️ Налаштування"
📱 Оберіть "📱 Тип клавіатури"
✅ Виберіть мобіль, планшет або десктоп

<b>Як вимкнути сповіщення?</b>
⚙️ Нажміть "⚙️ Налаштування"
🔔 Оберіть "🔔 Сповіщення"
🔕 Виберіть "Вимкнути сповіщення"

<b>Як видалити책гу з Моєї бібліотеки?</b>
💔 Нажміть кнопку "💔 Видалити" на книзі

<b>Як зберегти прогрес читання?</b>
📍 Прогрес зберігається автоматично

<b>Як завернути промокод?</b>
🎁 Нажміть "🎁 Отримати промокод"
🔄 Виберіть "🔄 Повернути промокод"

<b>Як звернутися до адміна?</b>
📞 Нажміть "📞 Зворотній зв'язок"
💬 Напишіть ваше повідомлення

<b>Чи можна скачати всі книги?</b>
✅ Так, для кожної книги доступні формати

<b>Чи працює офлайн?</b>
📥 Після скачування - так
🌐 Для перегляду каталогу потрібен інтернет
`;
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ Назад', 'help_back')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing FAQ help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('help_promo', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const message = `
🎁 <b>ЯК ОТРИМАТИ 75K КНИГ БЕЗКОШТОВНО</b>

<b>ЦЕ ПРОМОКОД YAKABOO UNLIMITED!</b>

<b>Що таке Yakaboo Unlimited:</b>
📚 75 000+ електронних та аудіокниг
🌍 150+ українських і світових видавництв
📱 Мобільний застосунок (iOS/Android)
🔀 Синхронізація між пристроями
🎧 Всі жанри: художня література, нон-фікшн, бізнес, дітям

<b>Як отримати безкоштовно:</b>
1️⃣ Нажміть "🎁 Отримати промокод"
2️⃣ Підтвердіть бажання отримати
3️⃣ Копіюйте код
4️⃣ Установіть Yakaboo на телефон
5️⃣ Зареєструйтесь в застосунку
6️⃣ Введіть промокод у розділі підписки
7️⃣ Насолоджуйтесь читанням! 📚

⚠️ <b>ВАЖЛИВО:</b>
• Один промокод = одна реєстрація
• Можна використати тільки ОДИН РАЗ
• Якщо не використали - поверніть!

🔄 <b>Як повернути промокод:</b>
🎁 Нажміть "🎁 Отримати промокод"
🔄 Виберіть "🔄 Повернути промокод"
✅ Готово! Інші змогли його отримати
`;
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('✅ Отримати промокод', 'confirm_get_promocode')],
                    [telegraf_1.Markup.button.callback('⬅️ Назад', 'help_back')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing promo help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('help_tips', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const message = `
💡 <b>ПОРАДИ ТА ТРЮКИ</b>

<b>🚀 ПІДВИЩТЕ ПРОДУКТИВНІСТЬ:</b>
⭐ Використовуйте AI Помічника для підбору
🏷️ Слідкуйте за тегами улюблених авторів
📌 Зберігайте série для подальшого читання
💾 Завантажуйте в дорогу

<b>🎯 ОРГАНІЗАЦІЯ:</b>
❤️ Групуйте улюблені за жанрами
📊 Слідіть своїм статистиці читання
🎪 Читайте відзиви перед вибором
📱 Налаштуйте клавіатуру під свій пристрій

<b>💬 КОМУНІКАЦІЯ:</b>
📞 Надішліть фідбек розробникам
⭐ Лишайте відзиви для інших
👥 Дивіться що читають інші

<b>📚 ПОШУК КНИГ:</b>
🔍 Використовуйте точні ключові слова
🌍 Шукайте за автором або назвою
📖 Перегляньте ТОП книги по жанрам
🎧 Фільтруйте по форматах (PDF, аудіо)

<b>💰 ЕКОНОМІЯ:</b>
🎁 Отримуйте промокоди на підписку
📥 Завантажуйте в дорогу щоб не витрачати інтернет
🏷️ Стежте за спеціальними пропозиціями

<b>🔧 НАЛАШТУВАННЯ:</b>
⚙️ Налаштуйте сповіщення під себе
📱 Виберіть комфортний тип меню
🌙 Читайте в темному режимі (у Yakaboo)

<b>📌 ШВИДКІ КОМАНДИ:</b>
/start - перезапустити бота
/search - пошук книги
/help - ця довідка
`;
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ Назад', 'help_back')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error showing tips help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action('help_back', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const helpMessage = `
╔════════════════════════════════════════╗
  ⚔️ ДОВІДКА ВОЇНА 🗡
╚════════════════════════════════════════╝

Виберіть розділ для детальної інформації:

📚 Основні кнопки меню
📖 Дії з книгою
⚡️ Швидкий старт
❓ Популярні питання
🎁 Як отримати 75K книг
💡 Поради та трюки

Натискай кнопки внизу для перегляду 👇
`;
            await ctx.editMessageText(helpMessage, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('📚 Основні кнопки меню', 'help_main_buttons')],
                    [telegraf_1.Markup.button.callback('📖 Дії з книгою', 'help_book_actions')],
                    [telegraf_1.Markup.button.callback('⚡️ Швидкий старт', 'help_quick_start')],
                    [telegraf_1.Markup.button.callback('❓ Популярні питання', 'help_faq')],
                    [telegraf_1.Markup.button.callback('🎁 Як отримати 75K книг', 'help_promo')],
                    [telegraf_1.Markup.button.callback('💡 Поради та трюки', 'help_tips')],
                    [telegraf_1.Markup.button.callback('🏠 На головну', 'home')],
                ]).reply_markup,
            });
        }
        catch (error) {
            logger_1.logger.error('Error going back in help', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
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