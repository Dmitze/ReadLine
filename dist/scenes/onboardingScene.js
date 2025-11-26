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
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const logger_1 = require("../utils/logger");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const genres_1 = require("../constants/genres");
const onboardingScene = new telegraf_1.Scenes.BaseScene('ONBOARDING_SCENE');
onboardingScene.enter(async (ctx) => {
    const userName = ctx.from?.first_name || 'Воїне';
    const state = ctx.scene.state;
    state.userName = userName;
    await ctx.reply(`⚔️ *ВІТАЄМО, ${userName.toUpperCase()}!*\n\n` +
        '═══════════════════════════════════════\n\n' +
        "🏰 Це *Warrior's Library* ⚔️\n" +
        '_Твоя легендарна фортеця з книг, подкастів і мудрості_\n\n' +
        '═══════════════════════════════════════\n\n' +
        '📚 *Що тебе чекає:*\n' +
        '• 75,000+ книг всіх жанрів\n' +
        '• Подкасти про саморозвиток та історію\n' +
        '• AI рекомендації саме для тебе\n' +
        '• Персональна статистика читання\n' +
        '• Синхронізація прогресу\n\n' +
        '⏱️ _Настройка займе 2 хвилини..._', {
        parse_mode: 'Markdown',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('🚀 РОЗПОЧАТИ ПРИГОДУ', 'onboarding_step1_start')],
            [telegraf_1.Markup.button.callback('⏭️ Пропустити налаштування', 'onboarding_skip')],
        ]).reply_markup,
    });
});
onboardingScene.action('onboarding_step1_start', async (ctx) => {
    await ctx.answerCbQuery('🛡️準備 арсенал...');
    const state = ctx.scene.state;
    state.selectedContentTypes = [];
    await ctx.reply('📖 *КРОК 1: ВИБІР ФОРМАТІВ КОНТЕНТУ*\n\n' +
        '_(Прогрес: 1/3)_\n\n' +
        'Які формати тебе цікавлять? Можна вибрати кілька! 👇\n\n' +
        '📕 *Читання* - традиційні книги\n' +
        '🎧 *Аудіокниги* - слухай на ходу\n' +
        '🎙️ *Подкасти* - інтерв\'ю, лекції, історії\n\n' +
        '_Ти завжди зможеш змінити це в налаштуваннях_ ⚙️', {
        parse_mode: 'Markdown',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [
                telegraf_1.Markup.button.callback('📕 Книги', 'onboarding_content_books'),
                telegraf_1.Markup.button.callback('🎧 Аудіо', 'onboarding_content_audio'),
            ],
            [
                telegraf_1.Markup.button.callback('🎙️ Подкасти', 'onboarding_content_podcasts'),
                telegraf_1.Markup.button.callback('📌 Все разом', 'onboarding_content_all'),
            ],
            [telegraf_1.Markup.button.callback('➡️ Далі', 'onboarding_step2_genres')],
            [telegraf_1.Markup.button.callback('⏭️ Пропустити', 'onboarding_skip')],
        ]).reply_markup,
    });
});
onboardingScene.action(/onboarding_content_(.+)/, async (ctx) => {
    try {
        const state = ctx.scene.state;
        const contentType = ctx.match[1];
        if (!state.selectedContentTypes) {
            state.selectedContentTypes = [];
        }
        const contentMap = {
            books: '📕 Книги',
            audio: '🎧 Аудіокниги',
            podcasts: '🎙️ Подкасти',
            all: '📚 Все разом',
        };
        if (contentType === 'all') {
            state.selectedContentTypes = ['books', 'audio', 'podcasts'];
            await ctx.answerCbQuery('✅ Все формати увімкнені!');
        }
        else {
            const index = state.selectedContentTypes.indexOf(contentType);
            if (index > -1) {
                state.selectedContentTypes.splice(index, 1);
                await ctx.answerCbQuery(`❌ ${contentMap[contentType]} видалено`);
            }
            else {
                state.selectedContentTypes.push(contentType);
                await ctx.answerCbQuery(`✅ ${contentMap[contentType]} додано`);
            }
        }
        const selectedText = state.selectedContentTypes.length > 0
            ? '\n\n✅ ' + state.selectedContentTypes.map(t => contentMap[t]).join(' + ')
            : '';
        await ctx.editMessageText('📖 *КРОК 1: ВИБІР ФОРМАТІВ КОНТЕНТУ*\n\n' +
            '_(Прогрес: 1/3)_\n\n' +
            'Які формати тебе цікавлять? Можна вибрати кілька! 👇\n\n' +
            '📕 *Читання* - традиційні книги\n' +
            '🎧 *Аудіокниги* - слухай на ходу\n' +
            '🎙️ *Подкасти* - інтерв\'ю, лекції, історії\n\n' +
            '_Ти завжди зможеш змінити це в налаштуваннях_ ⚙️' +
            selectedText, {
            parse_mode: 'Markdown',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [
                    telegraf_1.Markup.button.callback('📕 Книги', 'onboarding_content_books'),
                    telegraf_1.Markup.button.callback('🎧 Аудіо', 'onboarding_content_audio'),
                ],
                [
                    telegraf_1.Markup.button.callback('🎙️ Подкасти', 'onboarding_content_podcasts'),
                    telegraf_1.Markup.button.callback('📌 Все разом', 'onboarding_content_all'),
                ],
                [telegraf_1.Markup.button.callback('➡️ Далі', 'onboarding_step2_genres')],
                [telegraf_1.Markup.button.callback('⏭️ Пропустити', 'onboarding_skip')],
            ]).reply_markup,
        });
    }
    catch (error) {
        logger_1.logger.error('Error in onboarding content selection', error);
        await ctx.answerCbQuery('❌ Помилка при виборі формату');
    }
});
onboardingScene.action('onboarding_step2_genres', async (ctx) => {
    await ctx.answerCbQuery();
    const state = ctx.scene.state;
    state.selectedGenres = [];
    try {
        const genres = genres_1.ALL_GENRES;
        const genreButtons = [];
        for (let i = 0; i < genres.length; i += 2) {
            const row = [telegraf_1.Markup.button.callback(genres[i], `onboarding_genre_${genres[i]}`)];
            if (i + 1 < genres.length) {
                row.push(telegraf_1.Markup.button.callback(genres[i + 1], `onboarding_genre_${genres[i + 1]}`));
            }
            genreButtons.push(row);
        }
        genreButtons.push([
            telegraf_1.Markup.button.callback('✅ ГОТОВО', 'onboarding_step3_finish'),
            telegraf_1.Markup.button.callback('⏭️ Пропустити', 'onboarding_skip'),
        ]);
        await ctx.reply('⚔️ *КРОК 2: ОБЕРИ БИТВИ (ЖАНРИ)*\n\n' +
            '_(Прогрес: 2/3)_\n\n' +
            `Вибери 3-5 жанрів, щоб я міг рекомендувати книги саме для тебе! 🎯\n\n` +
            `Всього доступно: ${genres.length} жанрів\n\n` +
            '✨ *Обрано:* 0 жанрів\n\n' +
            '💡 _Змінювати можна завжди в налаштуваннях!_', {
            parse_mode: 'Markdown',
            reply_markup: telegraf_1.Markup.inlineKeyboard(genreButtons).reply_markup,
        });
    }
    catch (error) {
        logger_1.logger.error('Error in onboarding genre selection', error instanceof Error ? error : new Error(String(error)));
        await ctx.reply('⚠️ Помилка при завантаженні жанрів. Спробуйте пізніше.');
        await ctx.scene.leave();
    }
});
onboardingScene.action(/onboarding_genre_(.+)/, async (ctx) => {
    const state = ctx.scene.state;
    const genre = ctx.match[1];
    if (!state.selectedGenres) {
        state.selectedGenres = [];
    }
    const index = state.selectedGenres.indexOf(genre);
    if (index > -1) {
        state.selectedGenres.splice(index, 1);
        await ctx.answerCbQuery(`❌ ${genre} видалено`);
    }
    else {
        if (state.selectedGenres.length >= 5) {
            await ctx.answerCbQuery('⚠️ Максимум 5 жанрів', { show_alert: false });
            return;
        }
        state.selectedGenres.push(genre);
        await ctx.answerCbQuery(`✅ ${genre} додано`);
    }
    try {
        const genres = genres_1.ALL_GENRES;
        const genreButtons = [];
        for (let i = 0; i < genres.length; i += 2) {
            const genre1 = genres[i];
            const isSelected1 = state.selectedGenres?.includes(genre1) || false;
            const row = [
                telegraf_1.Markup.button.callback(`${isSelected1 ? '✅ ' : ''}${genre1}`, `onboarding_genre_${genre1}`),
            ];
            if (i + 1 < genres.length) {
                const genre2 = genres[i + 1];
                const isSelected2 = state.selectedGenres?.includes(genre2) || false;
                row.push(telegraf_1.Markup.button.callback(`${isSelected2 ? '✅ ' : ''}${genre2}`, `onboarding_genre_${genre2}`));
            }
            genreButtons.push(row);
        }
        genreButtons.push([
            telegraf_1.Markup.button.callback('✅ ГОТОВО', 'onboarding_step3_finish'),
            telegraf_1.Markup.button.callback('⏭️ Пропустити', 'onboarding_skip'),
        ]);
        await ctx
            .editMessageText('⚔️ *КРОК 2: ОБЕРИ БИТВИ (ЖАНРИ)*\n\n' +
            '_(Прогрес: 2/3)_\n\n' +
            'Вибери 3-5 жанрів, щоб я міг рекомендувати книги саме для тебе! 🎯\n\n' +
            `✨ *Обрано:* ${state.selectedGenres?.length || 0} жанрів\n\n` +
            '💡 _Змінювати можна завжди в налаштуваннях!_', {
            parse_mode: 'Markdown',
            reply_markup: telegraf_1.Markup.inlineKeyboard(genreButtons).reply_markup,
        })
            .catch((error) => {
            logger_1.logger.debug('Failed to edit message', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating genres display', error instanceof Error ? error : new Error(String(error)));
    }
});
onboardingScene.action('onboarding_step3_finish', async (ctx) => {
    const state = ctx.scene.state;
    const userId = ctx.from?.id;
    await ctx.answerCbQuery('🛡️ Збереження налаштувань...');
    if (userId) {
        try {
            const { markOnboardingComplete } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
            const { updateUserFavoriteGenres } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
            await markOnboardingComplete(userId, state.selectedGenres || []);
            if (state.selectedGenres && state.selectedGenres.length > 0) {
                await updateUserFavoriteGenres(userId, state.selectedGenres);
            }
            logger_1.logger.info('User completed onboarding', {
                userId,
                selectedGenres: state.selectedGenres,
                selectedContentTypes: state.selectedContentTypes,
            });
        }
        catch (error) {
            logger_1.logger.error('Error saving onboarding data', error instanceof Error ? error : new Error(String(error)));
        }
    }
    let message = '🏰 *ВОЇН ГОТОВИЙ ДО БИТВИ!*\n\n';
    message += '═══════════════════════════════════════\n\n';
    if (state.selectedGenres && state.selectedGenres.length > 0) {
        message += `📚 *Твої улюблені жанри (${state.selectedGenres.length}):*\n`;
        message += state.selectedGenres.map((g) => `⚔️ ${g}`).join('\n');
        message += '\n\n';
    }
    if (state.selectedContentTypes && state.selectedContentTypes.length > 0) {
        message += `*Обрані формати:*\n`;
        if (state.selectedContentTypes.includes('books'))
            message += '📕 Книги\n';
        if (state.selectedContentTypes.includes('audio'))
            message += '🎧 Аудіокниги\n';
        if (state.selectedContentTypes.includes('podcasts'))
            message += '🎙️ Подкасти\n';
        message += '\n';
    }
    message +=
        '═══════════════════════════════════════\n\n' +
            '✨ *Твої суперсили:*\n' +
            '🔍 Безстрашний пошук (75K+ творів)\n' +
            '💾 Персональна бібліотека (до 20 книг)\n' +
            '⭐ Оцінювання та рецензії\n' +
            '🤖 AI рекомендації на основі смаку\n' +
            '📊 Статистика читання та досягнення\n' +
            '🎁 Промокоди для розширення доступу\n\n' +
            '═══════════════════════════════════════\n\n' +
            '🚀 *Твоя легенда розпочалась!*\n' +
            '_Приємного читання! Сподіваємось, ти знайдеш свою улюблену книгу 📖_';
    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('🚀 ПЕРЕЙТИ В БІБЛІОТЕКУ', 'onboarding_finish')],
        ]).reply_markup,
    });
});
onboardingScene.action(['onboarding_skip', 'onboarding_finish'], async (ctx) => {
    const userId = ctx.from?.id;
    await ctx.answerCbQuery("👋 Вітаємо в Warrior's Library!");
    if (userId) {
        try {
            const { markOnboardingComplete } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
            await markOnboardingComplete(userId);
            logger_1.logger.info('User finished onboarding', { userId });
        }
        catch (error) {
            logger_1.logger.error('Error marking onboarding complete', error instanceof Error ? error : new Error(String(error)));
        }
    }
    await ctx.reply("⚔️ *ЛАСКАВО ПРОСИМО У WARRIOR'S LIBRARY!*\n\n" +
        '═══════════════════════════════════════\n\n' +
        '🗡️ *Що ти можеш робити:*\n\n' +
        '📚 *Каталог* - 75K+ книг, подкастів, аудіо\n' +
        '🔍 *Пошук* - по назві, автору, жанру, AI\n' +
        '📥 *Завантажити* - PDF, EPUB, FB2, MOBI\n' +
        '🎧 *Слухати* - аудіокниги та подкасти\n' +
        '❤️ *Зберігати* - булівайня 20 улюблених\n' +
        '⭐ *Оцінювати* - рецензії та рейтинги\n' +
        '🤖 *AI Допомога* - розумні рекомендації\n' +
        '🏆 *Рейтинги* - топ книг та авторів\n' +
        '🎁 *Промокоди* - розширення доступу\n' +
        '📊 *Профіль* - твоя статистика та досягнення\n' +
        '🎙️ *Подкасти* - спеціальні аудіопрограми\n\n' +
        '═══════════════════════════════════════\n\n' +
        '💡 _Натисни кнопку нижче для старту!_', {
        parse_mode: 'Markdown',
        reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
    });
    return ctx.scene.leave();
});
exports.default = onboardingScene;
//# sourceMappingURL=onboardingScene.js.map