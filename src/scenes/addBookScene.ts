import { Scenes, Markup } from 'telegraf';
import { addBook } from '../database/models';
import { addBookTag } from '../database/tagFunctions';
import { formatBookCaption } from '../utils/helpers';
import { logger } from '../utils/logger';
import { BotContext, WizardState } from '../types/telegraf';
import { validateBookData } from '../utils/validation';
import {
  getCachedTags,
  getProgress,
  examples,
  logUserAction,
  handleFileUpload,
  autoSaveState,
  showFormatSelection,
  proceedToTags,
  showBookPreview,
  popularGenres,
  otherGenres,
} from './addBook/utils';

// Ліниве завантаження модулів
async function lazyLoadModule(modulePath: string) {
  const module = await import(modulePath);
  return module;
}

// Helper functions are now imported from utils modules

const addBookScene = new Scenes.WizardScene(
  'ADD_BOOK_SCENE',

  // Крок 0: Назва книги
  async (ctx) => {
    logUserAction(ctx, 'start_add_book');
    await ctx.reply(
      `${getProgress(0)}\n📖 Введіть назву книги:\n\n` +
        `${examples.title}\n\n` +
        '💡 Або натисніть /cancel для скасування',
      {
        reply_markup: Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
      }
    );
    return ctx.wizard.next();
  },

  // Крок 1: Автор
  async (ctx: BotContext) => {
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }

    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('❌ Будь ласка, надішліть текст (назву книги).');
      return;
    }

    const title = ctx.message.text.trim();

    // Валідація
    const { VALIDATION } = await lazyLoadModule('../constants');
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
      `${getProgress(1)}\n👤 Введіть автора книги:\n\n` +
        `${examples.author}\n\n` +
        '💡 Або натисніть /cancel для скасування',
      {
        reply_markup: Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
      }
    );
    return ctx.wizard.next();
  },

  // Крок 2: Жанр
  async (ctx: BotContext) => {
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }

    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply("❌ Будь ласка, надішліть текст (ім'я автора).");
      return;
    }

    const author = ctx.message.text.trim();

    // Валідація
    const { VALIDATION } = await lazyLoadModule('../constants');
    if (author.length < VALIDATION.AUTHOR_MIN) {
      await ctx.reply(`❌ Ім\'я автора занадто коротке. Мінімум ${VALIDATION.AUTHOR_MIN} символи.`);
      return;
    }

    const state = ctx.wizard?.state as WizardState;
    state.author = author;
    autoSaveState(state);
    logUserAction(ctx, 'entered_author', { author });

    // Клавіатура з популярними жанрами
    const keyboard = [];
    for (let i = 0; i < popularGenres.length; i += 4) {
      const row = popularGenres.slice(i, i + 4).map((genre) => ({
        text: genre,
        callback_data: `genre_popular_${popularGenres.indexOf(genre)}`,
      }));
      keyboard.push(row);
    }

    keyboard.push([{ text: '📚 Всі жанри', callback_data: 'show_all_genres' }]);

    if (!state.selectedGenres) {
      state.selectedGenres = [];
    }

    await ctx.reply(`${getProgress(2)}\n📚 Оберіть жанри книги (1-5 жанрів):`, {
      reply_markup: { inline_keyboard: keyboard },
    });
    return ctx.wizard.next();
  },

  // Крок 3: Обробка вибору жанрів
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;

      if (action === 'show_all_genres') {
        // Показати всі жанри
        const allGenres = [...popularGenres, ...otherGenres];
        const keyboard: any[] = [];
        for (let i = 0; i < allGenres.length; i += 3) {
          const row = allGenres.slice(i, i + 3).map((genre) => ({
            text: genre,
            callback_data: `genre_all_${allGenres.indexOf(genre)}`,
          }));
          keyboard.push(row);
        }
        keyboard.push([{ text: '✅ Далі', callback_data: 'genres_done' }]);

        await ctx.editMessageText(
          `${getProgress(2)}\n📚 Оберіть жанри з повного списку (1-5 жанрів):`,
          { reply_markup: { inline_keyboard: keyboard } }
        );
        return;
      }

      if (action === 'genres_done') {
        if (!state.selectedGenres || state.selectedGenres.length === 0) {
          await ctx.answerCbQuery('❌ Оберіть хоча б один жанр');
          return;
        }

        state.genre = state.selectedGenres.join(', ');
        await ctx.answerCbQuery('✅ Жанри обрано');
        await ctx.editMessageText(`📚 Жанри обрано: ${state.genre}`);
        autoSaveState(state);
        logUserAction(ctx, 'selected_genres', { genres: state.selectedGenres });

        await ctx.reply(
          `${getProgress(3)}\n📝 Введіть короткий опис книги (макс. 1000 символів):\n\n` +
            `${examples.description}`
        );
        return ctx.wizard.next();
      }

      if (action.startsWith('genre_popular_') || action.startsWith('genre_all_')) {
        const genreIndex = parseInt(action.split('_')[2]);
        const genres = action.startsWith('genre_popular_')
          ? popularGenres
          : [...popularGenres, ...otherGenres];

        const selectedGenre = genres[genreIndex];

        if (!state.selectedGenres) {
          state.selectedGenres = [];
        }

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

        // Оновити повідомлення з поточним станом
        const selectedText =
          state.selectedGenres.length > 0
            ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
            : '';

        await ctx.editMessageText(
          `${getProgress(2)}\n📚 Оберіть жанри книги (1-5 жанрів):${selectedText}`,
          { reply_markup: (ctx.update as any).callback_query?.message?.reply_markup }
        );
        return;
      }
    }
    return;
  },

  // Крок 4: Опис + AI перевірка опису
  async (ctx: BotContext) => {
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }

    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('❌ Будь ласка, надішліть текст (опис книги).');
      return;
    }

    const description = ctx.message.text.trim();

    const { VALIDATION } = await lazyLoadModule('../constants');
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

    await ctx.reply(
      `${getProgress(4)}\n🖼️ Завантажте фото обкладинки книги (або натисніть "Пропустити"):`,
      {
        reply_markup: Markup.inlineKeyboard([
          [{ text: '⏭️ Пропустити', callback_data: 'skip_photo' }],
        ]).reply_markup,
      }
    );
    return ctx.wizard.next();
  },

  // Крок 5: Фото обкладинки
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;

    if (
      ctx.callbackQuery &&
      'data' in ctx.callbackQuery &&
      ctx.callbackQuery.data === 'skip_photo'
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

    await ctx.reply(`${getProgress(5)}\n📎 Оберіть тип книги:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📄 Файл', callback_data: 'type_file' }],
          [{ text: '🎧 Аудіокнига', callback_data: 'type_audio' }],
          [{ text: '🔗 Посилання', callback_data: 'type_link' }],
          [{ text: '❌ Скасувати', callback_data: 'cancel_add' }],
        ],
      },
    });

    return ctx.wizard.next();
  },

  // Крок 6: Вибір типу файлу
  async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('❌ Будь ласка, оберіть тип книги, використовуючи кнопки.');
      return;
    }

    const type = ctx.callbackQuery.data;

    if (type === 'cancel_add') {
      await ctx.answerCbQuery('❌ Скасовано');
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }

    if (!type.startsWith('type_')) {
      await ctx.answerCbQuery('❌ Невірний вибір');
      await ctx.reply('❌ Будь ласка, оберіть тип книги, використовуючи кнопки.');
      return;
    }

    const state = ctx.wizard?.state as WizardState;
    state.bookType = type;

    let messageText = '';
    if (type === 'type_file') {
      await ctx.answerCbQuery('📄 Файл обрано');
      messageText = '📎 Надішліть файл книги:';
    } else if (type === 'type_audio') {
      await ctx.answerCbQuery('🎧 Аудіокнига обрана');
      messageText = '🎧 Надішліть аудіофайл книги:';
    } else if (type === 'type_link') {
      await ctx.answerCbQuery('🔗 Посилання обрано');
      messageText = `🔗 Введіть посилання на книгу:\n\n${examples.link}`;
    }

    logUserAction(ctx, 'selected_book_type', { type });
    await ctx.editMessageText(messageText);
    return ctx.wizard.next();
  },

  // Крок 7: Завантаження файлів (може викликатися кілька разів)
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;

    // Якщо це callback (кнопки "Додати ще формат"), ігноруємо
    if (ctx.callbackQuery) {
      return;
    }

    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }

    let uploadSuccess = false;

    if (state.bookType === 'type_file') {
      if (ctx.message && 'document' in ctx.message && ctx.message.document) {
        const document = (ctx.message as any).document;
        uploadSuccess = await handleFileUpload(ctx, async () => {
          state.bookFile = document.file_id;
          state.bookFileName = document.file_name || 'unknown';
          await ctx.reply(`✅ Файл завантажено: ${state.bookFileName}`);
          logUserAction(ctx, 'uploaded_file', { fileName: state.bookFileName });
        });
      } else {
        await ctx.reply('❌ Будь ласка, надішліть файл.');
        return;
      }
    } else if (state.bookType === 'type_audio') {
      if (ctx.message && 'audio' in ctx.message && ctx.message.audio) {
        const audio = (ctx.message as any).audio;
        uploadSuccess = await handleFileUpload(ctx, async () => {
          state.bookAudio = audio.file_id;
          state.bookAudioName = audio.file_name || 'audiobook';
          await ctx.reply(`✅ Аудіофайл завантажено: ${state.bookAudioName}`);
          logUserAction(ctx, 'uploaded_audio', { fileName: state.bookAudioName });
        });
      } else if (ctx.message && 'voice' in ctx.message && ctx.message.voice) {
        const voice = (ctx.message as any).voice;
        uploadSuccess = await handleFileUpload(ctx, async () => {
          state.bookAudio = voice.file_id;
          state.bookAudioName = 'voice_message';
          await ctx.reply('✅ Голосове повідомлення завантажено');
          logUserAction(ctx, 'uploaded_voice');
        });
      } else {
        await ctx.reply('❌ Будь ласка, надішліть аудіофайл.');
        return;
      }
    } else if (state.bookType === 'type_link') {
      if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст (посилання на книгу).');
        return;
      }

      const url = ctx.message.text.trim();
      state.bookLink = url;
      await ctx.reply('✅ Посилання збережено');
      uploadSuccess = true;
      logUserAction(ctx, 'added_link', { link: url });
    }

    if (!uploadSuccess) {
      return; // Помилка завантаження, не продовжуємо
    }

    autoSaveState(state);

    // Перевіряємо чи це додатковий формат
    if (state.addingAdditionalFormat) {
      state.addingAdditionalFormat = false;
      state.bookType = undefined;
      await showFormatSelection(ctx);
      return;
    }

    // Показуємо вибір додаткових форматів
    await showFormatSelection(ctx);
    return ctx.wizard.next();
  },

  // Крок 8: Вибір тегів + обробка додаткових форматів
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;

    // ВИПРАВЛЕННЯ: Якщо додаємо додатковий формат, обробляємо завантаження файлу
    if (state.addingAdditionalFormat && ctx.message && !ctx.callbackQuery) {
      let uploadSuccess = false;

      if (state.bookType === 'type_file') {
        if (ctx.message && 'document' in ctx.message && ctx.message.document) {
          const document = (ctx.message as any).document;
          uploadSuccess = await handleFileUpload(ctx, async () => {
            state.bookFile = document.file_id;
            state.bookFileName = document.file_name || 'unknown';
            await ctx.reply(`✅ Файл завантажено: ${state.bookFileName}`);
            logUserAction(ctx, 'uploaded_file', { fileName: state.bookFileName });
          });
        } else {
          await ctx.reply('❌ Будь ласка, надішліть файл.');
          return;
        }
      } else if (state.bookType === 'type_audio') {
        if (ctx.message && 'audio' in ctx.message && ctx.message.audio) {
          const audio = (ctx.message as any).audio;
          uploadSuccess = await handleFileUpload(ctx, async () => {
            state.bookAudio = audio.file_id;
            state.bookAudioName = audio.file_name || 'audiobook';
            await ctx.reply(`✅ Аудіофайл завантажено: ${state.bookAudioName}`);
            logUserAction(ctx, 'uploaded_audio', { fileName: state.bookAudioName });
          });
        } else if (ctx.message && 'voice' in ctx.message && ctx.message.voice) {
          const voice = (ctx.message as any).voice;
          uploadSuccess = await handleFileUpload(ctx, async () => {
            state.bookAudio = voice.file_id;
            state.bookAudioName = 'voice_message';
            await ctx.reply('✅ Голосове повідомлення завантажено');
            logUserAction(ctx, 'uploaded_voice');
          });
        } else {
          await ctx.reply('❌ Будь ласка, надішліть аудіофайл.');
          return;
        }
      } else if (state.bookType === 'type_link') {
        if (ctx.message && 'text' in ctx.message) {
          const url = ctx.message.text.trim();
          state.bookLink = url;
          await ctx.reply('✅ Посилання збережено');
          uploadSuccess = true;
          logUserAction(ctx, 'added_link', { link: url });
        } else {
          await ctx.reply('❌ Будь ласка, надішліть текст (посилання на книгу).');
          return;
        }
      }

      if (uploadSuccess) {
        autoSaveState(state);
        logger.info('Additional format uploaded:', {
          hasFile: !!state.bookFile,
          hasAudio: !!state.bookAudio,
          hasLink: !!state.bookLink,
          fileId: state.bookFile?.substring(0, 30) + '...',
          audioId: state.bookAudio?.substring(0, 30) + '...',
          fileIdLength: state.bookFile?.length,
          audioIdLength: state.bookAudio?.length,
        });
        state.addingAdditionalFormat = false;
        state.bookType = undefined;
        await showFormatSelection(ctx);
      }
      return;
    }

    // Обробка вибору тегів
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;

      if (action === 'preview_skip_tags') {
        await ctx.answerCbQuery('✅ Переходимо до підтвердження');
        await showBookPreview(ctx);
        return ctx.wizard.next();
      }

      if (action.startsWith('preview_tag_')) {
        const tagId = parseInt(action.split('_')[2]);

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

        // Оновити повідомлення з поточним станом
        const allTags = await getCachedTags();
        const selectedTagNames = state.selectedTags
          .map((id) => allTags.find((t) => t.id === id)?.name)
          .filter(Boolean);

        let selectedText = '';
        if (selectedTagNames.length > 0) {
          selectedText = `\n\n✅ *Вибрані теги:* ${selectedTagNames.join(', ')}`;
        }

        await ctx.editMessageText(
          `${getProgress(8)}\n🏷️ *Додайте теги до книги (опціонально):*\n\n` +
            `Оберіть один або кілька тегів, які підходять до цієї книги.${selectedText}\n\n` +
            'Натисніть "Далі" коли закінчите або щоб пропустити цей крок.',
          {
            parse_mode: 'HTML',
            reply_markup: (ctx.update as any).callback_query?.message?.reply_markup,
          }
        );
        return;
      }

      if (action === 'cancel_add') {
        await ctx.answerCbQuery('❌ Скасовано');
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
      }
    }
  },

  // Крок 9: Підтвердження (викликається тільки через showBookPreview)
  async (_ctx: BotContext) => {
    // Цей крок використовується тільки для обробки callback'ів підтвердження
    return;
  }
);

// Глобальний обробник помилок
addBookScene.use(async (_ctx, next) => {
  await next();
});

// Обробники дій
addBookScene.action('confirm_book', async (ctx: BotContext) => {
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
  };

  if (state.bookFile) {
    bookData.file_url = state.bookFile;
    bookData.file_name = state.bookFileName;
  }
  if (state.bookAudio) {
    bookData.audio_file_id = state.bookAudio;
  }
  if (state.bookLink) {
    bookData.online_link = state.bookLink;
  }

  // Логування для діагностики
  logger.info('Saving book with data:', {
    hasFile: !!state.bookFile,
    hasAudio: !!state.bookAudio,
    hasLink: !!state.bookLink,
    fileId: state.bookFile?.substring(0, 20),
    audioId: state.bookAudio?.substring(0, 20),
    link: state.bookLink,
  });

  // Валідація даних
  const validation = validateBookData(bookData);
  if (!validation.isValid) {
    await ctx.reply('❌ Помилка валідації: ' + validation.errors.join(', '));
    return ctx.scene?.leave();
  }

  const bookId = await addBook(bookData);

  if (state.selectedTags && state.selectedTags.length > 0) {
    for (const tagId of state.selectedTags) {
      await addBookTag(bookId, tagId);
    }
  }

  const finalCaption = await formatBookCaption({ ...bookData, id: bookId, is_available: true });
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

  // Прибираємо клавіатуру "Скасувати" і показуємо inline кнопку
  await ctx.reply('✅ Книга успішно опублікована!', {
    reply_markup: {
      remove_keyboard: true,
      inline_keyboard: [[{ text: '🏠 Назад до адмін-панелі', callback_data: 'back_to_admin' }]],
    },
  });

  return ctx.scene.leave();
});

addBookScene.action('cancel_book', async (ctx: BotContext) => {
  await ctx.answerCbQuery('❌ Скасовано');
  await ctx.reply('❌ Додавання книги скасовано', {
    reply_markup: { remove_keyboard: true },
  });
  return ctx.scene.leave();
});

// Обробники додавання додаткових форматів
addBookScene.action('add_more_file', async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  state.bookType = 'type_file';
  state.addingAdditionalFormat = true;

  await ctx.answerCbQuery('📄 Додаємо файл');
  await ctx.editMessageText('📎 Надішліть файл книги:');
});

addBookScene.action('add_more_audio', async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  state.bookType = 'type_audio';
  state.addingAdditionalFormat = true;

  await ctx.answerCbQuery('🎧 Додаємо аудіо');
  await ctx.editMessageText('🎧 Надішліть аудіофайл книги:');
});

addBookScene.action('add_more_link', async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  state.bookType = 'type_link';
  state.addingAdditionalFormat = true;

  await ctx.answerCbQuery('🔗 Додаємо посилання');
  await ctx.editMessageText(`🔗 Введіть посилання на книгу:\n\n${examples.link}`);
});

// Обробник "Далі до тегів"
addBookScene.action('skip_more_formats', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✅ Переходимо до тегів');
  await proceedToTags(ctx);
});

// Обробники редагування з прев'ю
addBookScene.action('edit_title', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Редагуємо назву');
  await ctx.reply(`${getProgress(1)}\n📖 Введіть нову назву книги:\n\n${examples.title}`);
  return ctx.wizard.selectStep(1);
});

addBookScene.action('edit_author', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Редагуємо автора');
  await ctx.reply(`${getProgress(2)}\n👤 Введіть нового автора книги:\n\n${examples.author}`);
  return ctx.wizard.selectStep(2);
});

addBookScene.action('edit_description', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Редагуємо опис');
  await ctx.reply(`${getProgress(3)}\n📝 Введіть новий опис книги:\n\n${examples.description}`);
  return ctx.wizard.selectStep(4);
});

addBookScene.action('edit_photo', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Редагуємо фото');
  await ctx.reply(`${getProgress(4)}\n🖼️ Завантажте нове фото обкладинки:`, {
    reply_markup: Markup.inlineKeyboard([[{ text: '⏭️ Пропустити', callback_data: 'skip_photo' }]])
      .reply_markup,
  });
  return ctx.wizard.selectStep(5);
});

addBookScene.action('edit_formats', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Редагуємо формати');
  await showFormatSelection(ctx);
});

// Швидкий вихід з підтвердженням
addBookScene.command('exit', async (ctx) => {
  await ctx.reply('❌ Ви впевнені, що хочете скасувати додавання книги?', {
    reply_markup: Markup.inlineKeyboard([
      [
        { text: '✅ Так, скасувати', callback_data: 'confirm_cancel' },
        { text: '❌ Ні, продовжити', callback_data: 'continue_adding' },
      ],
    ]).reply_markup,
  });
});

addBookScene.action('confirm_cancel', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('❌ Додавання книги скасовано');
  return ctx.scene.leave();
});

addBookScene.action('continue_adding', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('✅ Продовжуємо додавання книги...');
});

// Обробник кнопки "Назад до адмін-панелі"
addBookScene.action('back_to_admin', async (ctx: BotContext) => {
  await ctx.answerCbQuery();

  const { isAdmin, getAdminStats, getPendingReviews, getPendingFeedbackMessages } =
    await lazyLoadModule('../database/models');
  const { getAdminMenuKeyboard } = await lazyLoadModule('../keyboards/adminKeyboards');

  const adminCheck = await isAdmin(ctx.from!.id);
  if (!adminCheck) {
    await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
    return ctx.scene!.leave();
  }

  const stats = await getAdminStats();
  const pendingReviews = await getPendingReviews();
  const pendingFeedback = await getPendingFeedbackMessages();

  const reviewsAlert =
    pendingReviews.length > 0
      ? `📝 Відгуків на модерацію: <b>${pendingReviews.length}</b> 🔔`
      : '✅ Всі відгуки оброблені';

  const feedbackAlert =
    pendingFeedback.length > 0
      ? `📞 Нових повідомлень: <b>${pendingFeedback.length}</b> 🔔`
      : '✅ Всі повідомлення прочитані';

  // Видаляємо попереднє повідомлення (ігноруємо помилки)
  await ctx.deleteMessage().catch((error) => {
    logger.debug('Failed to delete message', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // Показуємо адмін-панель ДО виходу зі сцени
  await ctx.reply(
    '🛠️ <b>Панель адміністратора</b>\n\n' +
      '📊 <b>Статистика:</b>\n' +
      `📚 Книг в каталозі: ${stats.totalBooks}\n` +
      `${reviewsAlert}\n` +
      `${feedbackAlert}`,
    {
      parse_mode: 'HTML',
      reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
    }
  );

  // Виходимо зі сцени ПІСЛЯ показу адмін-панелі
  await ctx.scene!.leave();
});

// Обробка команди /cancel
addBookScene.command('cancel', async (ctx) => {
  await ctx.reply('❌ Додавання книги скасовано', {
    reply_markup: { remove_keyboard: true },
  });
  return ctx.scene.leave();
});

// Cleanup
addBookScene.leave((ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  if (state) {
    Object.keys(state).forEach((key) => {
      delete state[key];
    });
  }
  logger.debug('AddBookScene cleanup completed', { userId: ctx.from?.id });
});

export default addBookScene;
