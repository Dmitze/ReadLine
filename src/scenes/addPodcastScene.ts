/**
 * Add Podcast Scene
 * Scene для додавання нового підкасту адміном
 */

import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import { addPodcast, Podcast } from '../database/tables/podcasts';

interface AddPodcastState {
  theme?: string;
  description?: string;
  file_type?: 'audio' | 'link' | 'archive';
  file_url?: string;
  file_id?: string;
  file_name?: string;
  file_size?: number;
  duration?: number;
  cover_photo_id?: string;
  step?: string;
}

const addPodcastScene = new Scenes.BaseScene<BotContext>('ADD_PODCAST_SCENE');

// Початок сцени
addPodcastScene.enter(async (ctx: BotContext) => {
  const state = (ctx.scene as any).state as AddPodcastState;
  state.step = 'theme';

  await ctx.reply(
    '🎙️ <b>ДОДАВАННЯ ПІДКАСТУ</b>\n\n' +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      '📝 <b>Крок 1/3: Тема підкасту</b>\n\n' +
      'Введіть тему (назву) підкасту:',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
    }
  );

  logger.adminAction(ctx.from?.id || 0, 'start_add_podcast');
});

// Обробник текстових повідомлень
addPodcastScene.on('text', async (ctx: BotContext) => {
  const state = (ctx.scene as any).state as AddPodcastState;
  const text = ctx.message.text.trim();

  if (text === '❌ Скасувати') {
    await ctx.reply('❌ Додавання підкасту скасовано.', {
      reply_markup: { remove_keyboard: true },
    });
    return ctx.scene.leave();
  }

  // Крок 1: Тема
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

  // Крок 2: Опис
  if (state.step === 'description') {
    if (text.length < 10) {
      await ctx.reply('❌ Опис занадто короткий. Мінімум 10 символів.');
      return;
    }
    state.description = text;
    state.step = 'file_type';
    await ctx.reply('✅ Опис збережений!\n\n📁 <b>Крок 3/3: Файл</b>\n\nОберіть тип:', {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🎵 Аудіо', 'podcast_type_audio')],
        [Markup.button.callback('🔗 Посилання', 'podcast_type_link')],
        [Markup.button.callback('❌ Скасувати', 'podcast_cancel')],
      ]).reply_markup,
    });
    return;
  }

  // Якщо чекаємо посилання
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

// Обробник аудіо
addPodcastScene.on('audio', async (ctx: BotContext) => {
  const state = (ctx.scene as any).state as AddPodcastState;
  if (state.step !== 'waiting_audio') return;

  const audio = ctx.message.audio;
  state.file_id = audio.file_id;
  state.file_name = audio.file_name || 'podcast.mp3';
  state.file_size = audio.file_size;
  state.duration = audio.duration;
  state.file_type = 'audio';

  await ctx.reply('✅ Аудіо завантажено!');
  await confirmPodcast(ctx, state);
});

// Підтвердження
async function confirmPodcast(ctx: BotContext, state: AddPodcastState) {
  const message =
    '📝 <b>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</b>\n\n' +
    `🎙️ <b>Тема:</b> ${state.theme}\n` +
    `📝 <b>Опис:</b> ${state.description}\n\n` +
    '✅ Опублікувати?';

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('✅ Опублікувати', 'podcast_publish')],
      [Markup.button.callback('❌ Скасувати', 'podcast_cancel')],
    ]).reply_markup,
  });
  state.step = 'preview';
}

// Кнопки
addPodcastScene.action('podcast_type_audio', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  const state = (ctx.scene as any).state as AddPodcastState;
  state.step = 'waiting_audio';
  await ctx.editMessageText('🎵 Відправте аудіо файл підкасту:', { parse_mode: 'HTML' });
});

addPodcastScene.action('podcast_type_link', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  const state = (ctx.scene as any).state as AddPodcastState;
  state.step = 'waiting_link';
  await ctx.editMessageText('🔗 Введіть посилання на підкаст:', { parse_mode: 'HTML' });
});

addPodcastScene.action('podcast_publish', async (ctx: BotContext) => {
  await ctx.answerCbQuery('📤 Публікація...');
  const state = (ctx.scene as any).state as AddPodcastState;

  if (!state.theme || !state.description || !state.file_type) {
    await ctx.reply('❌ Помилка: не всі дані заповнені.');
    return ctx.scene.reenter();
  }

  try {
    const podcast: Podcast = {
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

    const podcastId = await addPodcast(podcast);

    await ctx.editMessageText(
      '✅ <b>ПІДКАСТ ОПУБЛІКОВАНО!</b>\n\n' + `🎙️ ${podcast.theme}\n` + `🆔 ID: ${podcastId}`,
      { parse_mode: 'HTML' }
    );

    logger.adminAction(ctx.from?.id || 0, 'add_podcast', { podcastId });
    await ctx.reply('✅ Готово!', { reply_markup: { remove_keyboard: true } });
    return ctx.scene.leave();
  } catch (error) {
    logger.error('Error adding podcast', error);
    await ctx.reply('❌ Помилка при додаванні.');
    return ctx.scene.leave();
  }
});

addPodcastScene.action('podcast_cancel', async (ctx: BotContext) => {
  await ctx.answerCbQuery('❌ Скасовано');
  await ctx.editMessageText('❌ Скасовано.');
  await ctx.reply('Повернулись до адмінки.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

export default addPodcastScene;
