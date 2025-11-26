/**
 * ADD BOOK SCENE - НОВАЯ ВЕРСИЯ (12 ШАГОВ)
 * Процес додавання книги адміністратором з новою структурою
 * 
 * ШАГИ:
 * 0: Назва книги
 * 1: Автор
 * 2: Жанри
 * 3: Опис
 * 4: Фото обкладинки
 * 5: ISBN (опціонально)
 * 6: Мова книги
 * 7: Фізична наявність (Так/Ні)
 * 8: Завантаження форматів (ДО 3: файл, аудіо, посилання)
 * 9: Вибір тегів
 * 10: Попередній перегляд
 * 11: Підтвердження
 */

import { Scenes, Markup } from 'telegraf';
import { addBook } from '../database/models';
import { addBookTag } from '../database/tagFunctions';
import { formatBookCaption, escapeHtml } from '../utils/helpers';
import { logger } from '../utils/logger';
import { BotContext, WizardState } from '../types/telegraf';
import { validateBookData } from '../utils/validation';
import { validateDocument, MAX_FILE_SIZES } from '../utils/fileValidation';
import { RateLimiter } from '../middleware/RateLimiter';
import { getMainMenuKeyboard } from '../keyboards/mainKeyboards';
import {
  getCachedTags,
  getProgress,
  examples,
  logUserAction,
  autoSaveState,
  popularGenres,
  otherGenres,
  invalidateTagsCache,
} from './addBook/utils';
import {
  showFileFormatMenu,
  handleFileFormatUpload,
  getLoadedFormatsText,
} from './addBook/fileUploadStep';
import {
  showLanguageMenu,
  showAllLanguages,
  showISBNInput,
  popularLanguages,
  otherLanguages,
} from './addBook/languageStep';

// Type guards
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

const fileUploadLimiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });

/**
 * Побудувати клавіатуру для вибору тегів
 */
function buildTagsKeyboard(tags: any[], selectedTagIds: number[]) {
  const keyboard = tags.map((tag) => [
    {
      text: selectedTagIds.includes(tag.id) ? `✅ ${tag.name}` : tag.name,
      callback_data: `tag_${tag.id}`,
    },
  ]);

  keyboard.push([{ text: '✅ Далі', callback_data: 'tags_done_' }]);

  return { inline_keyboard: keyboard };
}

/**
 * Попередній перегляд перед публікацією
 */
async function showFinalPreview(ctx: BotContext, state: WizardState) {
  const { getAllTags } = await import('../database/tagFunctions');

  let tagsText = '';
  if (state.selectedTags && state.selectedTags.length > 0) {
    const allTags = await getAllTags();
    const selectedTagNames = state.selectedTags
      .map(tagId => allTags.find(t => t.id === tagId)?.name)
      .filter((name): name is string => name !== undefined)
      .map(name => escapeHtml(name))
      .join(', ');
    tagsText = `\n🏷️ Теги: ${selectedTagNames}`;
  }

  const formats = [];
  if (state.bookFile) formats.push('📄 Файл');
  if (state.bookAudio) formats.push('🎧 Аудіо');
  if (state.bookLink) formats.push('🔗 Посилання');

  const formatsText = formats.length > 0 
    ? '\n📎 Формати: ' + formats.join(', ')
    : '\n📎 Формати: Немає';

  const physicalText = state.is_physically_available
    ? '\n📦 Фізична наявність: ✅ Є в бібліотеці'
    : '\n📦 Фізична наявність: ❌ Тільки електронна';

  const isbnText = state.isbn ? `\n📚 ISBN: ${escapeHtml(state.isbn)}` : '';
  const languageText = state.language ? `\n🌍 Мова: ${escapeHtml(state.language)}` : '';

  const previewText = `
${getProgress(11)}

📝 <b>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</b>

📖 <b>${escapeHtml(state.title || 'Невідома назва')}</b>
👤 ${escapeHtml(state.author || 'Невідомий автор')}
📚 ${escapeHtml((state.selectedGenres || []).join(', ') || 'Невідомий жанр')}
📝 ${escapeHtml(state.description || 'Без опису')}${isbnText}${languageText}${tagsText}${formatsText}${physicalText}

━━━━━━━━━━━━━━━━━━━

Все вірно? Опублікувати книгу?
  `.trim();

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return ctx.scene?.leave();
  }

  if (state.photoFileId && state.photoFileId !== 'default_book_cover') {
    await ctx.replyWithPhoto(state.photoFileId, {
      caption: previewText,
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('✅ Підтвердити і опублікувати', `confirm_book_${userId}`)],
        [Markup.button.callback('❌ Скасувати', `cancel_book_${userId}`)]
      ]).reply_markup
    });
  } else {
    await ctx.reply(previewText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('✅ Підтвердити і опублікувати', `confirm_book_${userId}`)],
        [Markup.button.callback('❌ Скасувати', `cancel_book_${userId}`)]
      ]).reply_markup
    });
  }
}

const addBookScene = new Scenes.WizardScene(
  'ADD_BOOK_SCENE',

  // ========== КРОК 0: НАЗВА КНИГИ ==========
  async (ctx) => {
    logUserAction(ctx, 'start_add_book');
    await ctx.reply(
      `${getProgress(1)}\n📖 Введіть назву книги:\n\n` +
        `${examples.title}\n\n` +
        '💡 Або натисніть /cancel для скасування'
    );
    return ctx.wizard.next();
  },

  // ========== КРОК 1: АВТОР ==========
  async (ctx: BotContext) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('❌ Будь ласка, надішліть текст (назву книги).');
      return;
    }

    const title = ctx.message.text.trim();
    const { VALIDATION } = await import('../constants');
    
    if (title.length < VALIDATION.TITLE_MIN) {
      await ctx.reply(`❌ Назва занадто коротка. Мінімум ${VALIDATION.TITLE_MIN} символи.`);
      return;
    }

    if (title.length > VALIDATION.TITLE_MAX) {
      await ctx.reply(`❌ Назва занадто довга. Максимум ${VALIDATION.TITLE_MAX} символів.`);
      return;
    }

    const state = ctx.wizard?.state as WizardState;
    state.title = title;
    autoSaveState(state);
    logUserAction(ctx, 'entered_title', { title });

    await ctx.reply(
      `${getProgress(2)}\n👤 Введіть автора книги:\n\n` +
        `${examples.author}\n\n` +
        '💡 Або натисніть /cancel для скасування'
    );
    return ctx.wizard.next();
  },

  // ========== КРОК 2: ЖАНРИ ==========
  async (ctx: BotContext) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply("❌ Будь ласка, надішліть текст (ім'я автора).");
      return;
    }

    const author = ctx.message.text.trim();
    const { VALIDATION } = await import('../constants');
    
    if (author.length < VALIDATION.AUTHOR_MIN) {
      await ctx.reply(`❌ Ім\'я автора занадто коротке. Мінімум ${VALIDATION.AUTHOR_MIN} символи.`);
      return;
    }

    const state = ctx.wizard?.state as WizardState;
    state.author = author;
    autoSaveState(state);
    logUserAction(ctx, 'entered_author', { author });

    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Помилка: користувач не ідентифікований');
      return ctx.scene?.leave();
    }

    const keyboard = [];
    for (let i = 0; i < popularGenres.length; i += 4) {
      const row = popularGenres.slice(i, i + 4).map((genre) => ({
        text: genre,
        callback_data: `genre_popular_${popularGenres.indexOf(genre)}_${userId}`,
      }));
      keyboard.push(row);
    }

    keyboard.push([{ text: '📚 Всі жанри', callback_data: `show_all_genres_${userId}` }]);

    if (!state.selectedGenres) {
      state.selectedGenres = [];
    }

    await ctx.reply(`${getProgress(3)}\n📚 Оберіть жанри книги (1-5 жанрів):`, {
      reply_markup: { inline_keyboard: keyboard },
    });
    return ctx.wizard.next();
  },

  // ========== КРОК 3: ОБРОБКА ЖАНРІВ (callback handler) ==========
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;

      if (action.startsWith('genres_done_')) {
        const expectedUserId = parseInt(action.split('_')[2]);
        const currentUserId = ctx.from?.id;

        if (!currentUserId || expectedUserId !== currentUserId) {
          await ctx.answerCbQuery('❌ Некоректний запит');
          return;
        }

        if (!state.selectedGenres || state.selectedGenres.length === 0) {
          await ctx.answerCbQuery('❌ Оберіть хоча б один жанр');
          return;
        }

        state.genre = state.selectedGenres.join('\n'); // Зберігаємо всі жанри, розділені новим рядком
        await ctx.answerCbQuery('✅ Жанри обрано');
        await ctx.editMessageText(`📚 Жанри обрано:\n${state.selectedGenres.join('\n')}`);
        autoSaveState(state);
        logUserAction(ctx, 'selected_genres', { genres: state.selectedGenres });

        await ctx.reply(
          `${getProgress(4)}\n📝 Введіть короткий опис книги (макс. 1000 символів):\n\n` +
            `${examples.description}`
        );
        return ctx.wizard.next();
      }

      if (action.startsWith('show_all_genres_')) {
        const allGenres = [...popularGenres, ...otherGenres];
        const keyboard: any[] = [];
        for (let i = 0; i < allGenres.length; i += 3) {
          const row = allGenres.slice(i, i + 3).map((genre) => ({
            text: genre,
            callback_data: `genre_all_${allGenres.indexOf(genre)}_${ctx.from?.id}`,
          }));
          keyboard.push(row);
        }
        keyboard.push([{ text: '✅ Далі', callback_data: `genres_done_${ctx.from?.id}` }]);

        await ctx.editMessageText(
          `${getProgress(3)}\n📚 Оберіть жанри з повного списку (1-5 жанрів):`,
          { reply_markup: { inline_keyboard: keyboard } }
        );
        return;
      }

      if (action.startsWith('genre_popular_') || action.startsWith('genre_all_')) {
        const parts = action.split('_');
        const genreIndex = parseInt(parts[2]);
        const genres = action.startsWith('genre_popular_') ? popularGenres : [...popularGenres, ...otherGenres];
        const selectedGenre = genres[genreIndex];

        if (!state.selectedGenres) state.selectedGenres = [];

        const index = state.selectedGenres.indexOf(selectedGenre);
        if (index > -1) {
          state.selectedGenres.splice(index, 1);
          await ctx.answerCbQuery(`❌ ${selectedGenre} видалено`);
        } else {
          if (state.selectedGenres.length >= 5) {
            await ctx.answerCbQuery('❌ Максимум 5 жанрів');
            return;
          }
          state.selectedGenres.push(selectedGenre);
          await ctx.answerCbQuery(`✅ ${selectedGenre} додано (${state.selectedGenres.length}/5)`);
        }

        const selectedText = state.selectedGenres.length > 0
          ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
          : '';

        await ctx.editMessageText(
          `${getProgress(3)}\n📚 Оберіть жанри книги (1-5 жанрів):${selectedText}`,
          { reply_markup: (ctx.update as any).callback_query?.message?.reply_markup }
        );
        return;
      }
    }
    return;
  },

  // ========== КРОК 4: ОПИС ==========
  async (ctx: BotContext) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('❌ Будь ласка, надішліть текст (опис книги).');
      return;
    }

    const description = ctx.message.text.trim();
    const { VALIDATION } = await import('../constants');
    
    if (description.length < VALIDATION.DESCRIPTION_MIN) {
      await ctx.reply(`❌ Опис занадто короткий. Мінімум ${VALIDATION.DESCRIPTION_MIN} символів.`);
      return;
    }

    if (description.length > VALIDATION.DESCRIPTION_MAX) {
      await ctx.reply(
        `❌ Опис занадто довгий. Максимум ${VALIDATION.DESCRIPTION_MAX} символів. Спробуйте ще раз:`
      );
      return;
    }

    const state = ctx.wizard?.state as WizardState;
    state.description = description;
    autoSaveState(state);
    logUserAction(ctx, 'entered_description', { descriptionLength: description.length });

    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Помилка: користувач не ідентифікований');
      return ctx.scene?.leave();
    }

    await ctx.reply(
      `${getProgress(5)}\n🖼️ Завантажте фото обкладинки книги (або натисніть "Пропустити"):`,
      {
        reply_markup: Markup.inlineKeyboard([
          [{ text: '⏭️ Пропустити', callback_data: `skip_photo_${userId}` }],
        ]).reply_markup,
      }
    );
    return ctx.wizard.next();
  },

  // ========== КРОК 5: ФОТО ==========
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;

    if (
      ctx.callbackQuery &&
      'data' in ctx.callbackQuery &&
      ctx.callbackQuery.data.startsWith('skip_photo_')
    ) {
      state.photoFileId = 'default_book_cover';
      await ctx.answerCbQuery('Пропущено');
      await ctx.editMessageText('🖼️ Фото пропущено, буде використана стандартна обкладинка');
      logUserAction(ctx, 'skipped_photo');
    } else if (
      ctx.message &&
      'photo' in ctx.message &&
      ctx.message.photo &&
      ctx.message.photo.length > 0
    ) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      state.photoFileId = photo.file_id;
      await ctx.reply('✅ Фото завантажено');
      logUserAction(ctx, 'uploaded_photo');
    } else {
      await ctx.reply('❌ Будь ласка, завантажте фото або натисніть "Пропустити".');
      return;
    }

    autoSaveState(state);

    // Показуємо ISBN крок
    await showISBNInput(ctx);
    return ctx.wizard.next();
  },

  // ========== КРОК 6: ISBN (опціонально) ==========
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply('❌ Помилка: користувач не ідентифікований');
      return ctx.scene?.leave();
    }

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      if (ctx.callbackQuery.data.startsWith('skip_isbn_')) {
        state.isbn = undefined;
        await ctx.answerCbQuery('⏭️ ISBN пропущено');
        logUserAction(ctx, 'skipped_isbn');
      }
    } else if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === 'пропустити') {
        state.isbn = undefined;
        logUserAction(ctx, 'skipped_isbn');
      } else {
        state.isbn = ctx.message.text.trim();
        await ctx.reply(`✅ ISBN збережено: ${state.isbn}`);
        logUserAction(ctx, 'entered_isbn', { isbn: state.isbn });
      }
    } else {
      await ctx.reply('❌ Будь ласка, введіть ISBN або напишіть "Пропустити".');
      return;
    }

    autoSaveState(state);

    // Показуємо меню мови
    await showLanguageMenu(ctx, state);
    return ctx.wizard.next();
  },

  // ========== КРОК 7: МОВА (callback handler) ==========
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    const userId = ctx.from?.id;

    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      return;
    }

    const action = ctx.callbackQuery.data;
    const allLanguages = [...popularLanguages, ...otherLanguages];

    if (action.startsWith('show_all_languages_')) {
      await showAllLanguages(ctx);
      return;
    }

    if (action.startsWith('lang_back_')) {
      await showLanguageMenu(ctx, state);
      return;
    }

    if (action.startsWith('lang_popular_') || action.startsWith('lang_all_')) {
      const parts = action.split('_');
      const langIndex = parseInt(parts[2]);
      const languages = action.startsWith('lang_popular_') ? popularLanguages : allLanguages;
      const selectedLanguage = languages[langIndex];

      state.language = selectedLanguage;
      autoSaveState(state);
      await ctx.answerCbQuery(`✅ ${selectedLanguage} вибрана`);
      await ctx.editMessageText(`✅ Мова: ${selectedLanguage}`);
      logUserAction(ctx, 'selected_language', { language: selectedLanguage });

      // Переходимо до фізичної наявності
      if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return ctx.scene?.leave();
      }

      await ctx.reply(
        `${getProgress(8)}\n\n📦 <b>ЧИ Є ЦЯ КНИГА ФІЗИЧНО В НАЯВНОСТІ?</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Є фізично', `book_physical_yes_${userId}`),
              Markup.button.callback('❌ Немає', `book_physical_no_${userId}`),
            ]
          ]).reply_markup,
        }
      );
      return ctx.wizard.next();
    }
  },

  // ========== КРОК 8: ФІЗИЧНА НАЯВНІСТЬ ==========
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;

      if (action.startsWith('book_physical_yes_')) {
        state.is_physically_available = true;
        await ctx.answerCbQuery('✅ Книга буде доступна для замовлення');
        await ctx.editMessageText('✅ Книга позначена як фізично доступна');
        logUserAction(ctx, 'physical_available_yes');
      } else if (action.startsWith('book_physical_no_')) {
        state.is_physically_available = false;
        await ctx.answerCbQuery('✅ Тільки електронна версія');
        await ctx.editMessageText('✅ Книга буде доступна тільки в електронному вигляді');
        logUserAction(ctx, 'physical_available_no');
      } else {
        return;
      }

      autoSaveState(state);

      // Показуємо меню для завантаження форматів
      await showFileFormatMenu(ctx, state);
      return ctx.wizard.next();
    }
  },

  // ========== КРОК 9: ЗАВАНТАЖЕННЯ ФОРМАТІВ ==========
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply('❌ Помилка: користувач не ідентифікований');
      return ctx.scene?.leave();
    }

    // Callback handlers для вибору формату
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;

      if (action.startsWith('file_upload_choose_')) {
        const format = action.split('_')[3] as 'pdf' | 'audio' | 'link';
        
        if (format === 'pdf') {
          await ctx.answerCbQuery('📄 Завантажуємо файл');
          await ctx.editMessageText(`${getProgress(9)}\n\n📎 Надішліть файл книги (PDF, EPUB, FB2):`);
          state.currentUploadFormat = 'file';
        } else if (format === 'audio') {
          await ctx.answerCbQuery('🎧 Завантажуємо аудіо');
          await ctx.editMessageText(`${getProgress(9)}\n\n🎧 Надішліть аудіофайл книги (MP3, WAV):`);
          state.currentUploadFormat = 'audio';
        } else if (format === 'link') {
          await ctx.answerCbQuery('🔗 Додаємо посилання');
          await ctx.editMessageText(`${getProgress(9)}\n\n🔗 Введіть посилання на книгу:\n\n${examples.link}`);
          state.currentUploadFormat = 'link';
        }
        autoSaveState(state);
        return;
      }

      if (action.startsWith('file_upload_done_')) {
        await ctx.answerCbQuery('✅ Переходимо до тегів');
        
        // Показуємо теги
        const tags = await getCachedTags();
        const keyboard = buildTagsKeyboard(tags, state.selectedTags || []);

        await ctx.editMessageText(
          `${getProgress(10)}\n🏷️ <b>Додайте теги до книги (опціонально):</b>\n\n` +
          'Оберіть один або кілька тегів...' +
          (state.selectedTags && state.selectedTags.length > 0
            ? `\n\n✅ <b>Вибрані теги:</b> ${tags
                .filter((t: any) => state.selectedTags?.includes(t.id))
                .map((t: any) => t.name)
                .join(', ')}`
            : '') +
          '\n\nНатисніть "Далі" коли закінчите...',
          {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          }
        );
        return ctx.wizard.next();
      }

      return;
    }

    // Обробка завантаження файлу
    const { allowed } = await fileUploadLimiter.check(ctx);
    if (!allowed) {
      await ctx.reply('❌ Занадто багато завантажень. Зачекайте хвилину.');
      return;
    }

    const format = state.currentUploadFormat as 'file' | 'audio' | 'link' | undefined;
    if (!format) {
      return;
    }

    const success = await handleFileFormatUpload(ctx, state, format);
    if (!success) {
      return;
    }

    autoSaveState(state);

    // Показуємо меню знову
    await showFileFormatMenu(ctx, state);
  },

  // ========== КРОК 10: ТЕГИ (callback handler) ==========
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    const userId = ctx.from?.id;

    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      return;
    }

    const action = ctx.callbackQuery.data;

    if (action.startsWith('tags_done_')) {
      await ctx.answerCbQuery('✅ Теги обрано');
      await showFinalPreview(ctx, state);
      return ctx.wizard.next();
    }

    if (action.startsWith('tag_')) {
      const parts = action.split('_');
      const tagId = parseInt(parts[1]);

      if (!state.selectedTags) {
        state.selectedTags = [];
      }

      const index = state.selectedTags.indexOf(tagId);
      if (index > -1) {
        state.selectedTags.splice(index, 1);
        await ctx.answerCbQuery('❌ Тег видалено');
      } else {
        state.selectedTags.push(tagId);
        await ctx.answerCbQuery('✅ Тег додано');
      }

      autoSaveState(state);

      // Оновлюємо повідомлення з відгуком про вибір тегів
      try {
        const tags = await getCachedTags();
        
        const selectedText = state.selectedTags && state.selectedTags.length > 0
          ? `\n\n✅ <b>Вибрані теги:</b> ${tags
              .filter((t: any) => state.selectedTags?.includes(t.id))
              .map((t: any) => t.name)
              .join(', ')}`
          : '';

        const keyboard = buildTagsKeyboard(tags, state.selectedTags || []);

        await ctx.editMessageText(
          `${getProgress(10)}\n🏷️ <b>Додайте теги до книги (опціонально):</b>\n\n` +
          `Оберіть один або кілька тегів...${selectedText}\n\n` +
          'Натисніть "Далі" коли закінчите...',
          {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          }
        );
      } catch (err) {
        logger.warn('Error updating tags display', { error: String(err) });
      }
    }
  },

  // ========== КРОК 11: ПОПЕРЕДНІЙ ПЕРЕГЛЯД / ПІДТВЕРДЖЕННЯ ==========
  async (_ctx: BotContext) => {
    // Цей крок для обробки callback'ів підтвердження
    return;
  }
);

// ========== CALLBACKS HANDLERS ==========

addBookScene.action(/^confirm_book_(\d+)$/, async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  await ctx.answerCbQuery('✅ Книга додається...');

  let file_type = 'physical';
  if (state.bookFile) file_type = 'file';
  else if (state.bookAudio) file_type = 'audio';
  else if (state.bookLink) file_type = 'link';

  const bookData: any = {
    title: state.title,
    author: state.author,
    genre: state.genre,
    description: state.description,
    photo_file_id: state.photoFileId || 'default_book_cover',
    file_type: file_type,
    is_physically_available: state.is_physically_available ? 1 : 0,
    isbn: state.isbn || null,
    language: state.language || 'Українська',
  };

  if (state.bookFile) {
    bookData.pdf_file_id = state.bookFile;
    bookData.file_name = state.bookFileName;
  }
  if (state.bookAudio) {
    bookData.audio_file_id = state.bookAudio;
  }
  if (state.bookLink) {
    bookData.online_link = state.bookLink;
  }

  const validation = validateBookData(bookData);
  if (!validation.isValid) {
    await ctx.reply('❌ Помилка валідації: ' + validation.errors.join(', '));
    cleanupWizardState(ctx);
    return ctx.scene?.leave();
  }

  try {
    const bookId = await addBook(bookData);

    if (state.selectedTags && state.selectedTags.length > 0) {
      const { db } = await import('../database/models');
      const { TagRepository } = await import('../repositories/TagRepository');
      const tagRepo = new TagRepository(db);
      await tagRepo.addBookTags(bookId, state.selectedTags);
    }

    const finalCaption = await formatBookCaption({
      ...bookData,
      id: bookId,
      is_available: true,
    } as any);

    if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
      await ctx.replyWithPhoto(bookData.photo_file_id, {
        caption: finalCaption,
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply(finalCaption, { parse_mode: 'HTML' });
    }

    logUserAction(ctx, 'book_published', {
      title: state.title,
      formats: {
        hasFile: !!state.bookFile,
        hasAudio: !!state.bookAudio,
        hasLink: !!state.bookLink,
      },
      tagsCount: state.selectedTags?.length || 0,
    });

    await ctx.reply('✅ Книга успішно опублікована!', {
      reply_markup: getMainMenuKeyboard(),
    });

    cleanupWizardState(ctx);
    return ctx.scene.leave();
  } catch (error) {
    logger.error('Error publishing book', error as Error);
    console.error('Full error details:', error);
    await ctx.reply(`❌ Помилка при публікації книги: ${error instanceof Error ? error.message : String(error)}`);
    cleanupWizardState(ctx);
    return ctx.scene?.leave();
  }
});

addBookScene.action(/^cancel_book_(\d+)$/, async (ctx: BotContext) => {
  await ctx.answerCbQuery('❌ Скасовано');
  await ctx.reply('❌ Додавання книги скасовано', {
    reply_markup: getMainMenuKeyboard(),
  });
  cleanupWizardState(ctx);
  return ctx.scene.leave();
});



addBookScene.command('cancel', async (ctx) => {
  await ctx.reply('❌ Додавання книги скасовано', {
    reply_markup: getMainMenuKeyboard(),
  });
  cleanupWizardState(ctx);
  return ctx.scene.leave();
});

function cleanupWizardState(ctx: BotContext): void {
  const state = ctx.wizard?.state as WizardState;
  if (state) {
    Object.keys(state).forEach((key) => {
      delete (state as any)[key];
    });
  }
}

addBookScene.leave((ctx: BotContext) => {
  cleanupWizardState(ctx);
});

export default addBookScene;
