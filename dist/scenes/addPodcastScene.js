"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const logger_1 = require("../utils/logger");
const podcasts_1 = require("../database/tables/podcasts");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const addPodcastScene = new telegraf_1.Scenes.BaseScene('ADD_PODCAST_SCENE');
addPodcastScene.enter(async (ctx) => {
    const state = ctx.scene.state;
    state.step = 'theme';
    await ctx.reply('🎙️ <b>ДОДАВАННЯ ПІДКАСТУ</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '📝 <b>Крок 1/3: Тема підкасту</b>\n\n' +
        'Введіть тему (назву) підкасту:', {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
    });
    logger_1.logger.adminAction(ctx.from?.id || 0, 'start_add_podcast');
});
addPodcastScene.on('text', async (ctx) => {
    const state = ctx.scene.state;
    const text = ctx.message.text.trim();
    if (text === '❌ Скасувати') {
        await ctx.reply('❌ Додавання підкасту скасовано.', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        return ctx.scene.leave();
    }
    if (state.step === 'theme') {
        if (text.length < 3) {
            await ctx.reply('❌ Тема занадто коротка. Мінімум 3 символи.');
            return;
        }
        state.theme = text;
        state.step = 'description';
        await ctx.reply('✅ Тема збережена!\n\n📝 <b>Крок 2/3: Опис</b>\n\nВведіть опис підкасту:', {
            parse_mode: 'HTML',
        });
        return;
    }
    if (state.step === 'description') {
        if (text.length < 10) {
            await ctx.reply('❌ Опис занадто короткий. Мінімум 10 символів.');
            return;
        }
        state.description = text;
        state.step = 'file_type';
        await ctx.reply('✅ Опис збережений!\n\n📁 <b>Крок 3/3: Файл</b>\n\nОберіть тип:', {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🎵 Аудіо', 'podcast_type_audio')],
                [telegraf_1.Markup.button.callback('🔗 Посилання', 'podcast_type_link')],
                [telegraf_1.Markup.button.callback('❌ Скасувати', 'podcast_cancel')],
            ]).reply_markup,
        });
        return;
    }
    if (state.step === 'waiting_link') {
        if (!text.startsWith('http://') && !text.startsWith('https://')) {
            await ctx.reply('❌ Невірний формат. Має починатися з http:// або https://');
            return;
        }
        state.file_url = text;
        state.file_type = 'link';
        await confirmPodcast(ctx, state);
        return;
    }
});
addPodcastScene.on('audio', async (ctx) => {
    const state = ctx.scene.state;
    if (state.step !== 'waiting_audio')
        return;
    const audio = ctx.message.audio;
    state.file_id = audio.file_id;
    state.file_name = audio.file_name || 'podcast.mp3';
    state.file_size = audio.file_size;
    state.duration = audio.duration;
    state.file_type = 'audio';
    await ctx.reply('✅ Аудіо завантажено!');
    await confirmPodcast(ctx, state);
});
async function confirmPodcast(ctx, state) {
    const message = '📝 <b>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</b>\n\n' +
        `🎙️ <b>Тема:</b> ${state.theme}\n` +
        `📝 <b>Опис:</b> ${state.description}\n\n` +
        '✅ Опублікувати?';
    await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('✅ Опублікувати', 'podcast_publish')],
            [telegraf_1.Markup.button.callback('❌ Скасувати', 'podcast_cancel')],
        ]).reply_markup,
    });
    state.step = 'preview';
}
addPodcastScene.action('podcast_type_audio', async (ctx) => {
    await ctx.answerCbQuery();
    const state = ctx.scene.state;
    state.step = 'waiting_audio';
    await ctx.editMessageText('🎵 Відправте аудіо файл підкасту:', { parse_mode: 'HTML' });
});
addPodcastScene.action('podcast_type_link', async (ctx) => {
    await ctx.answerCbQuery();
    const state = ctx.scene.state;
    state.step = 'waiting_link';
    await ctx.editMessageText('🔗 Введіть посилання на підкаст:', { parse_mode: 'HTML' });
});
addPodcastScene.action('podcast_publish', async (ctx) => {
    await ctx.answerCbQuery('📤 Публікація...');
    const state = ctx.scene.state;
    if (!state.theme || !state.description || !state.file_type) {
        await ctx.reply('❌ Помилка: не всі дані заповнені.');
        return ctx.scene.reenter();
    }
    try {
        const podcast = {
            theme: state.theme,
            description: state.description,
            file_type: state.file_type,
            file_url: state.file_url,
            file_id: state.file_id,
            file_name: state.file_name,
            file_size: state.file_size,
            duration: state.duration,
            created_by: ctx.from?.id,
        };
        const podcastId = await (0, podcasts_1.addPodcast)(podcast);
        await ctx.editMessageText('✅ <b>ПІДКАСТ ОПУБЛІКОВАНО!</b>\n\n' + `🎙️ ${podcast.theme}\n` + `🆔 ID: ${podcastId}`, {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🔙 Повернутись в адмін-панель', 'back_to_admin')],
            ]).reply_markup,
        });
        logger_1.logger.adminAction(ctx.from?.id || 0, 'add_podcast', { podcastId });
        return ctx.scene.leave();
    }
    catch (error) {
        logger_1.logger.error('Error adding podcast', error);
        await ctx.reply('❌ Помилка при додаванні.');
        return ctx.scene.leave();
    }
});
addPodcastScene.action('podcast_cancel', async (ctx) => {
    await ctx.answerCbQuery('❌ Скасовано');
    await ctx.editMessageText('❌ Скасовано.');
    await ctx.reply('Виберіть дію:', { reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)() });
    return ctx.scene.leave();
});
addPodcastScene.action('back_to_admin', async (ctx) => {
    await ctx.answerCbQuery('🔙 Повертаємось...');
    await ctx.reply('Виберіть дію:', {
        reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
    });
    return ctx.scene.leave();
});
exports.default = addPodcastScene;
//# sourceMappingURL=addPodcastScene.js.map