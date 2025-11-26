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
const models_1 = require("../database/models");
const userFunctions_1 = require("../database/userFunctions");
const logger_1 = require("../utils/logger");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const onboardingScene = new telegraf_1.Scenes.BaseScene('ONBOARDING_SCENE');
onboardingScene.enter(async (ctx) => {
    const userName = ctx.from?.first_name || 'Друже';
    await ctx.reply(`🗡️ *Вітаємо, ${userName}!*\n\n` +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        "Я *Warrior's Library* ⚔️\n" +
        'Твій легендарний гід через світ книг! 📚\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Давай швидко познайомимося та налаштуємо бота під тебе.\n' +
        'Це займе всього 1 хвилину! ⏱️', {
        parse_mode: 'Markdown',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('⚔️ Почати пригоду', 'onboarding_start')],
            [telegraf_1.Markup.button.callback('⏭️ Пропустити', 'onboarding_skip')],
        ]).reply_markup,
    });
});
onboardingScene.action('onboarding_start', async (ctx) => {
    await ctx.answerCbQuery('⚔️ Готуєш арсенал...');
    await ctx.reply('⚔️ *МОЇ СУПЕРСИЛИ:*\n\n' +
        '🔍 *Безстрашний Пошук*\n' +
        'Знайду будь-яку книгу за назвою, автором або жанром\n\n' +
        '❤️ *Бібліотека Воїна*\n' +
        'Збирай свою колекцію улюблених книг\n\n' +
        '🎧 *Голосні Легенди*\n' +
        'Слухай аудіокниги в бою або на відпочинку\n\n' +
        '🤖 *AI Мудрець*\n' +
        'Отримуй персональні рекомендації від штучного інтелекту\n\n' +
        '📊 *Воїнська Статистика*\n' +
        'Стежи за своєю бібліотечною славою', {
        parse_mode: 'Markdown',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('➡️ Далі', 'onboarding_genres')],
        ]).reply_markup,
    });
});
onboardingScene.action('onboarding_genres', async (ctx) => {
    await ctx.answerCbQuery();
    const state = ctx.scene.state;
    state.selectedGenres = [];
    const { cache, CACHE_KEYS, CACHE_TTL } = await Promise.resolve().then(() => __importStar(require('../utils/cache')));
    const genres = await cache.getOrSet(CACHE_KEYS.GENRES, models_1.getGenres, CACHE_TTL.LONG);
    if (genres.length === 0) {
        await ctx.reply('✅ *Все готово!*\n\n' +
            'Тепер ти можеш користуватися всіма функціями бота.\n\n' +
            'Натисни кнопку нижче щоб почати! 👇', {
            parse_mode: 'Markdown',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🎉 Почати користуватися', 'onboarding_finish')],
            ]).reply_markup,
        });
        return;
    }
    const genreButtons = [];
    for (let i = 0; i < genres.length; i += 2) {
        const row = [telegraf_1.Markup.button.callback(genres[i], `onboarding_genre_${genres[i]}`)];
        if (i + 1 < genres.length) {
            row.push(telegraf_1.Markup.button.callback(genres[i + 1], `onboarding_genre_${genres[i + 1]}`));
        }
        genreButtons.push(row);
    }
    genreButtons.push([
        telegraf_1.Markup.button.callback('✅ Готово', 'onboarding_genres_done'),
        telegraf_1.Markup.button.callback('⏭️ Пропустити', 'onboarding_finish'),
    ]);
    await ctx.reply('⚔️ *ОБЕРИ БИТВИ (ЖАНРИ)*\n\n' +
        'Вибери 3-5 жанрів, де ти хочеш мандрувати.\n' +
        'Це допоможе мені підібрати книги саме для тебе! 📖\n\n' +
        '📚 Обрано: 0', {
        parse_mode: 'Markdown',
        reply_markup: telegraf_1.Markup.inlineKeyboard(genreButtons).reply_markup,
    });
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
            await ctx.answerCbQuery('⚠️ Максимум 5 жанрів');
            return;
        }
        state.selectedGenres.push(genre);
        await ctx.answerCbQuery(`✅ ${genre} додано`);
    }
    const { cache, CACHE_KEYS, CACHE_TTL } = await Promise.resolve().then(() => __importStar(require('../utils/cache')));
    const genres = await cache.getOrSet(CACHE_KEYS.GENRES, models_1.getGenres, CACHE_TTL.LONG);
    const genreButtons = [];
    for (let i = 0; i < genres.length; i += 2) {
        const genre1 = genres[i];
        const isSelected1 = state.selectedGenres.includes(genre1);
        const row = [
            telegraf_1.Markup.button.callback(`${isSelected1 ? '✅ ' : ''}${genre1}`, `onboarding_genre_${genre1}`),
        ];
        if (i + 1 < genres.length) {
            const genre2 = genres[i + 1];
            const isSelected2 = state.selectedGenres.includes(genre2);
            row.push(telegraf_1.Markup.button.callback(`${isSelected2 ? '✅ ' : ''}${genre2}`, `onboarding_genre_${genre2}`));
        }
        genreButtons.push(row);
    }
    genreButtons.push([
        telegraf_1.Markup.button.callback('✅ Готово', 'onboarding_genres_done'),
        telegraf_1.Markup.button.callback('⏭️ Пропустити', 'onboarding_finish'),
    ]);
    await ctx
        .editMessageText('⚔️ *ОБЕРИ БИТВИ (ЖАНРИ)*\n\n' +
        'Вибери 3-5 жанрів, де ти хочеш мандрувати.\n' +
        'Це допоможе мені підібрати книги саме для тебе! 📖\n\n' +
        `📚 Обрано: ${state.selectedGenres.length}`, {
        parse_mode: 'Markdown',
        reply_markup: telegraf_1.Markup.inlineKeyboard(genreButtons).reply_markup,
    })
        .catch((error) => {
        logger_1.logger.debug('Failed to edit message', {
            error: error instanceof Error ? error.message : String(error),
        });
    });
});
onboardingScene.action('onboarding_genres_done', async (ctx) => {
    const state = ctx.scene.state;
    const userId = ctx.from?.id;
    await ctx.answerCbQuery('✅ Жанри збережено!');
    if (userId) {
        await (0, userFunctions_1.markOnboardingComplete)(userId, state.selectedGenres || [])
            .then(() => {
            logger_1.logger.info('User completed onboarding with genres', {
                userId,
                selectedGenres: state.selectedGenres,
            });
        })
            .catch((error) => {
            logger_1.logger.error('Error saving onboarding data', error instanceof Error ? error : new Error(String(error)));
        });
        if (state.selectedGenres && state.selectedGenres.length > 0) {
            const { updateUserFavoriteGenres } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
            await updateUserFavoriteGenres(userId, state.selectedGenres).catch((error) => {
                logger_1.logger.error('Error updating favorite genres', error instanceof Error ? error : new Error(String(error)));
            });
        }
    }
    let message = '⚔️ *ВОЇН ГОТОВИЙ!*\n\n';
    if (state.selectedGenres && state.selectedGenres.length > 0) {
        message += `Ти обрав ${state.selectedGenres.length} ${state.selectedGenres.length === 1 ? 'жанр' : 'жанри'}:\n`;
        message += state.selectedGenres.map((g) => `🗡️ ${g}`).join('\n');
        message += '\n\nТепер я буду рекомендувати тобі книги з цих битв! 📚\n\n';
    }
    message += '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    message += '✅ Підготовка завершена!\n\n';
    message += 'Натисни кнопку нижче щоб розпочати свою легенду 👇';
    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('🚀 Почати користуватися', 'onboarding_finish')],
        ]).reply_markup,
    });
});
onboardingScene.action(['onboarding_skip', 'onboarding_finish'], async (ctx) => {
    const userId = ctx.from?.id;
    await ctx.answerCbQuery("👋 Вітаємо в Warrior's Library!");
    if (userId) {
        await (0, userFunctions_1.markOnboardingComplete)(userId)
            .then(() => {
            logger_1.logger.info('User finished onboarding', { userId });
        })
            .catch((error) => {
            logger_1.logger.error('Error marking onboarding complete', error instanceof Error ? error : new Error(String(error)));
        });
    }
    await ctx.reply("⚔️ *ЛАСКАВО ПРОСИМО У Warrior's Library!*\n\n" +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Тепер ти можеш:\n' +
        '📚 Дослідити величезну бібліотеку\n' +
        '🔍 Знайти книги за будь-якими критеріями\n' +
        '❤️ Зберігати свої сокровища\n' +
        '🎧 Слухати легенди в аудіоформаті\n' +
        '🤖 Отримати поради від AI Мудреця\n' +
        '📊 Розраховувати свій бібліотечний рівень\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '🗡️ Твоя легенда розпочалась! Приємного читання! 📖', {
        parse_mode: 'Markdown',
        reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
    });
    return ctx.scene.leave();
});
exports.default = onboardingScene;
//# sourceMappingURL=onboardingSceneOld.js.map