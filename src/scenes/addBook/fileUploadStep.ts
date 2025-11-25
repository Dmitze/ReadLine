/**
 * File Upload Step - Крок для загрузки ДО 3 типов файлов (файл, аудіо, посилання)
 * Дозволяє вибрати і завантажити кілька форматів для однієї книги
 */

import { Markup } from 'telegraf';
import { BotContext, WizardState } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { handleFileUpload, logUserAction, autoSaveState, examples } from './utils';
import { validateDocument, validateAudio, MAX_FILE_SIZES } from '../../utils/fileValidation';
import { RateLimiter } from '../../middleware/RateLimiter';
import { getProgress } from './utils';

const fileUploadLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 5,
  keyGenerator: (ctx) => `file_upload:${ctx.from?.id || 'unknown'}`,
});

function isMessageWithDocument(ctx: BotContext): ctx is BotContext & {
  message: { document: { file_id: string; file_name?: string; file_size?: number; mime_type?: string } }
} {
  return ctx.message && 'document' in ctx.message && ctx.message.document !== undefined;
}

function isMessageWithAudio(ctx: BotContext): ctx is BotContext & {
  message: { audio: { file_id: string; file_name?: string; duration?: number } }
} {
  return ctx.message && 'audio' in ctx.message && ctx.message.audio !== undefined;
}

function isMessageWithVoice(ctx: BotContext): ctx is BotContext & {
  message: { voice: { file_id: string; duration?: number } }
} {
  return ctx.message && 'voice' in ctx.message && ctx.message.voice !== undefined;
}

function isMessageWithText(ctx: BotContext): ctx is BotContext & {
  message: { text: string }
} {
  return ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string';
}

/**
 * Показити меню вибору форматів для загрузки
 */
export async function showFileFormatMenu(ctx: BotContext, state: WizardState): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return;
  }

  // Визначаємо які формати вже завантажені
  const loadedFormats = [];
  if (state.bookFile) loadedFormats.push('📄 Файл');
  if (state.bookAudio) loadedFormats.push('🎧 Аудіо');
  if (state.bookLink) loadedFormats.push('🔗 Посилання');

  const loadedText = loadedFormats.length > 0
    ? `\n\n✅ Вже завантажені: ${loadedFormats.join(', ')}`
    : '';

  const canAddMore = loadedFormats.length < 3;

  const keyboard = [];

  if (canAddMore) {
    if (!state.bookFile) {
      keyboard.push([{ text: '📄 Завантажити файл (PDF, EPUB, FB2)', callback_data: `file_upload_choose_pdf_${userId}` }]);
    }
    if (!state.bookAudio) {
      keyboard.push([{ text: '🎧 Завантажити аудіокнигу (MP3, WAV)', callback_data: `file_upload_choose_audio_${userId}` }]);
    }
    if (!state.bookLink) {
      keyboard.push([{ text: '🔗 Додати посилання на книгу', callback_data: `file_upload_choose_link_${userId}` }]);
    }
  }

  keyboard.push([{ text: '✅ Готово', callback_data: `file_upload_done_${userId}` }]);

  const text = `${getProgress(6)}\n\n📎 <b>ЗАВАНТАЖЕННЯ ФОРМАТІВ КНИГИ</b>\n\n` +
    `Оберіть формати для завантаження (можете обрати до 3):${loadedText}\n\n` +
    'Натисніть "Готово", коли закінчите.';

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });
}

/**
 * Обробити загрузку файлу
 */
export async function handleFileFormatUpload(ctx: BotContext, state: WizardState, format: 'file' | 'audio' | 'link'): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) {
    await (ctx as any).reply('❌ Помилка: користувач не ідентифікований');
    return false;
  }

  // Rate limiter check
  const { allowed } = await fileUploadLimiter.check(ctx);
  if (!allowed) {
    await (ctx as any).reply('❌ Занадто багато завантажень. Зачекайте хвилину та спробуйте ще раз.');
    logger.warn('File upload rate limited', { userId, format });
    return false;
  }

  try {
    if (format === 'file') {
      if (!isMessageWithDocument(ctx)) {
        await (ctx as any).reply('❌ Будь ласка, надішліть документ (PDF, EPUB, FB2).');
        return false;
      }

      const document = ctx.message.document;
      const validation = validateDocument(document.file_size, document.mime_type, document.file_name);

      if (!validation.isValid) {
        await ctx.reply(`❌ ${validation.error}`);
        return false;
      }

      if (document.file_size && document.file_size > MAX_FILE_SIZES.DOCUMENT) {
        await ctx.reply(
          `❌ Файл занадто великий (${(document.file_size / 1024 / 1024).toFixed(2)} MB). ` +
          `Максимум ${(MAX_FILE_SIZES.DOCUMENT / 1024 / 1024).toFixed(0)} MB.`
        );
        return false;
      }

      state.bookFile = document.file_id;
      state.bookFileName = document.file_name || 'unknown';
      await (ctx as any).reply(`✅ Файл завантажено: ${state.bookFileName}`);
      logUserAction(ctx, 'uploaded_file', { fileName: state.bookFileName });
      return true;

    } else if (format === 'audio') {
      let audioFileId: string | undefined;
      let audioName = '';

      if (isMessageWithAudio(ctx)) {
        audioFileId = (ctx as any).message.audio.file_id;
        audioName = (ctx as any).message.audio.file_name || 'audiobook';
      } else if (isMessageWithVoice(ctx)) {
        audioFileId = (ctx as any).message.voice.file_id;
        audioName = 'voice_message';
      } else {
        await (ctx as any).reply('❌ Будь ласка, надішліть аудіофайл або голосове повідомлення.');
        return false;
      }

      state.bookAudio = audioFileId;
      state.bookAudioName = audioName;
      await (ctx as any).reply(`✅ Аудіофайл завантажено: ${audioName}`);
      logUserAction(ctx, 'uploaded_audio', { fileName: audioName });
      return true;

    } else if (format === 'link') {
      if (!isMessageWithText(ctx)) {
        await (ctx as any).reply('❌ Будь ласка, надішліть текст (посилання на книгу).');
        return false;
      }

      const url = (ctx as any).message.text.trim();
      if (!url.startsWith('http')) {
        await (ctx as any).reply('❌ Невалідне посилання. Має починатися з http:// або https://');
        return false;
      }

      state.bookLink = url;
      await (ctx as any).reply('✅ Посилання збережено');
      logUserAction(ctx, 'added_link', { link: url });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error in handleFileFormatUpload', error as Error, { userId, format });
    await (ctx as any).reply('❌ Помилка при завантаженні. Спробуйте ще раз.');
    return false;
  }
}

/**
 * Отримати резюме завантажених форматів
 */
export function getLoadedFormatsText(state: WizardState): string {
  const formats = [];
  if (state.bookFile) formats.push(`📥 ${state.bookFileName || 'Файл'}`);
  if (state.bookAudio) formats.push(`🎧 ${state.bookAudioName || 'Аудіо'}`);
  if (state.bookLink) formats.push('🔗 Посилання');

  if (formats.length === 0) {
    return '❌ Немає завантажених форматів';
  }

  return formats.join('\n');
}
