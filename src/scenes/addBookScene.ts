import { Scenes, Markup } from 'telegraf';
import { addBook } from '../database/models';
import { getAllTags, addBookTag } from '../database/tagFunctions';
import { formatBookCaption } from '../utils/helpers';
import { logger } from '../utils/logger';
import { BotContext, WizardState } from '../types/telegraf';
import { validateBookData } from '../utils/validation';
import { 
  generateTagsFromDescription,
  isAIEnabled 
} from '../utils/aiHelper';

const addBookScene = new Scenes.WizardScene(
  'ADD_BOOK_SCENE',
  // Крок 0: Назва книги
  async (ctx) => {
    await ctx.reply(
      '📖 Введіть назву книги:\n\n' +
      '💡 Або натисніть /cancel для скасування',
      {
        reply_markup: Markup.keyboard([
          ['❌ Скасувати']
        ]).resize().reply_markup
      }
    );
    return ctx.wizard.next();
  },
  // Крок 1: Автор
  async (ctx: BotContext) => {
    // Перевірка на скасування
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }
    
    // Валідація типу повідомлення
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply(
        '❌ Будь ласка, надішліть текст (назву книги).\n\n' +
        '💡 Або натисніть /cancel для скасування'
      );
      return;
    }
    
    const title = ctx.message.text.trim();
    
    // Валідація
    const { VALIDATION } = await import('../constants');
    if (title.length < VALIDATION.TITLE_MIN) {
      await ctx.reply(`❌ Назва занадто коротка. Мінімум ${VALIDATION.TITLE_MIN} символи.`);
      return;
    }
    
    if (title.length > VALIDATION.TITLE_MAX) {
      await ctx.reply(`❌ Назва занадто довга. Максимум ${VALIDATION.TITLE_MAX} символів.`);
      return;
    }
    
    (ctx.wizard?.state as WizardState).title = title;
    await ctx.reply(
      '👤 Введіть автора книги:\n\n' +
      '💡 Або натисніть /cancel для скасування',
      {
        reply_markup: Markup.keyboard([
          ['❌ Скасувати']
        ]).resize().reply_markup
      }
    );
    return ctx.wizard.next();
  },
  // Крок 2: Жанр
  async (ctx: BotContext) => {
    // Перевірка на скасування
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }
    
    // Валідація типу повідомлення
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply(
        '❌ Будь ласка, надішліть текст (ім\'я автора).\n\n' +
        '💡 Або натисніть /cancel для скасування'
      );
      return;
    }
    
    const author = ctx.message.text.trim();
    
    // Валідація
    const { VALIDATION } = await import('../constants');
    if (author.length < VALIDATION.AUTHOR_MIN) {
      await ctx.reply(`❌ Ім\'я автора занадто коротке. Мінімум ${VALIDATION.AUTHOR_MIN} символи.`);
      return;
    }
    
    (ctx.wizard?.state as WizardState).author = author;
    
    // Розширений список жанрів
    const genres = [
      'Фантастика', 'Sci-Fi', 'Кіберпанк', 'Фентезі', 'Антиутопія',
      'Детектив', 'Трилер', 'Нуар', 'Шпигунський роман',
      'Пригоди', 'Історичні пригоди', 'Бойовик',
      'Романтика', 'Любовний роман', 'Мелодрама',
      'Жахи', 'Містика', 'Хорор',
      'Дитячі', 'Казки', 'Young Adult',
      'Біографія', 'Мемуари', 'Есеї', 'Документальні',
      'Військова', 'Історична', 'Технічна', 'Психологія',
      'Художня', 'Поезія', 'Драма', 'Сатира'
    ];

    // Ініціалізуємо масив вибраних жанрів
    const state = ctx.wizard?.state as WizardState;
    if (!state.selectedGenres) {
      state.selectedGenres = [];
    }

    // Розбиваємо на рядки по 2 кнопки
    const keyboard = [];
    for (let i = 0; i < genres.length; i += 2) {
      const row = [
        { text: genres[i], callback_data: `genre_${i}` }
      ];
      if (i + 1 < genres.length) {
        row.push({ text: genres[i + 1], callback_data: `genre_${i + 1}` });
      }
      keyboard.push(row);
    }
    
    // Додаємо кнопку "Далі"
    keyboard.push([{ text: '✅ Далі', callback_data: 'genres_done' }]);

    await ctx.reply('📚 Оберіть жанри книги (1-5 жанрів):', {
      reply_markup: { inline_keyboard: keyboard }
    });
    return ctx.wizard.next();
  },
  // Крок 3: Опис
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      
      if (action === 'genres_done') {
        // Перевіряємо чи вибрано хоча б один жанр
        if (!state.selectedGenres || state.selectedGenres.length === 0) {
          await ctx.answerCbQuery('❌ Оберіть хоча б один жанр');
          return;
        }
        
        // Зберігаємо жанри через кому
        state.genre = state.selectedGenres.join(', ');
        await ctx.answerCbQuery('✅ Жанри обрано');
        await ctx.editMessageText(`📚 Жанри обрано: ${state.genre}`);
        
        await ctx.reply('📝 Введіть короткий опис книги (макс. 1000 символів):');
        return ctx.wizard.next();
      }
      
      if (action.startsWith('genre_')) {
        const genreIndex = parseInt(action.split('_')[1]);
        const genres = [
          'Фантастика', 'Sci-Fi', 'Кіберпанк', 'Фентезі', 'Антиутопія',
          'Детектив', 'Трилер', 'Нуар', 'Шпигунський роман',
          'Пригоди', 'Історичні пригоди', 'Бойовик',
          'Романтика', 'Любовний роман', 'Мелодрама',
          'Жахи', 'Містика', 'Хорор',
          'Дитячі', 'Казки', 'Young Adult',
          'Біографія', 'Мемуари', 'Есеї', 'Документальні',
          'Військова', 'Історична', 'Технічна', 'Психологія',
          'Художня', 'Поезія', 'Драма', 'Сатира'
        ];
        
        const selectedGenre = genres[genreIndex];
        
        if (!state.selectedGenres) {
          state.selectedGenres = [];
        }
        
        // Перевіряємо чи жанр вже вибраний
        const index = state.selectedGenres.indexOf(selectedGenre);
        if (index > -1) {
          // Видаляємо жанр
          state.selectedGenres.splice(index, 1);
          await ctx.answerCbQuery(`❌ ${selectedGenre} видалено`);
        } else {
          // Додаємо жанр (максимум 5)
          if (state.selectedGenres.length >= 5) {
            await ctx.answerCbQuery('❌ Максимум 5 жанрів');
            return;
          }
          state.selectedGenres.push(selectedGenre);
          await ctx.answerCbQuery(`✅ ${selectedGenre} додано (${state.selectedGenres.length}/5)`);
        }
        return;
      }
    }
  },
  // Крок 4: Фото + AI перевірка опису
  async (ctx: BotContext) => {
    // Перевірка на скасування
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }
    
    // Валідація типу повідомлення
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply(
        '❌ Будь ласка, надішліть текст (опис книги).\n\n' +
        '💡 Або натисніть /cancel для скасування'
      );
      return;
    }
    
    const description = ctx.message.text.trim();
    
    const { VALIDATION } = await import('../constants');
    if (description.length < VALIDATION.DESCRIPTION_MIN) {
      await ctx.reply(`❌ Опис занадто короткий. Мінімум ${VALIDATION.DESCRIPTION_MIN} символів.`);
      return;
    }
    
    if (description.length > VALIDATION.DESCRIPTION_MAX) {
      await ctx.reply(`❌ Опис занадто довгий. Максимум ${VALIDATION.DESCRIPTION_MAX} символів. Спробуйте ще раз:`);
      return;
    }
    
    const state = ctx.wizard?.state as WizardState;
    state.description = description;
    
    // AI перевірка якості опису та генерація тегів
    if (isAIEnabled() && state.title && state.author && state.genre) {
      await ctx.reply('🤖 AI перевіряє опис та генерує теги...');
      
      try {
        // Генерація тегів
        const suggestedTags = await generateTagsFromDescription(
          state.title,
          description,
          state.genre
        );
        
        if (suggestedTags.length > 0) {
          state.aiSuggestedTags = suggestedTags;
          await ctx.reply(
            `🏷️ *AI запропонував теги:*\n\n` +
            suggestedTags.map(tag => `• ${tag}`).join('\n') +
            `\n\nВи зможете додати їх після збереження книги.`,
            { parse_mode: 'HTML' }
          );
        }
      } catch (error) {
        logger.error('AI tag generation error', error instanceof Error ? error : new Error(String(error)));
      }
    }

    await ctx.reply('🖼️ Завантажте фото обкладинки книги (або натисніть "Пропустити"):', {
      reply_markup: Markup.inlineKeyboard([
        [{ text: '⏭️ Пропустити', callback_data: 'skip_photo' }]
      ]).reply_markup
    });
    return ctx.wizard.next();
  },
  // Крок 5: Вибір типу файлу
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    
    // Перевіряємо чи це callback (пропустити)
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'skip_photo') {
      state.photoFileId = 'default_book_cover';
      await ctx.answerCbQuery('Пропущено');
      await ctx.editMessageText('🖼️ Фото пропущено, буде використана стандартна обкладинка');
    } 
    // Перевіряємо чи це фото
    else if (ctx.message && 'photo' in ctx.message && ctx.message.photo && ctx.message.photo.length > 0) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      
      // Зберігаємо фото без валідації
      state.photoFileId = photo.file_id;
      const fileSizeMB = photo.file_size ? (photo.file_size / (1024 * 1024)).toFixed(2) : '';
      await ctx.reply(`✅ Фото завантажено${fileSizeMB ? ` (${fileSizeMB} MB)` : ''}`);
    } 
    // Якщо ні фото ні callback - просимо ще раз
    else {
      await ctx.reply('❌ Будь ласка, завантажте фото або натисніть "Пропустити".');
      return; // Не переходимо далі
    }

    await ctx.reply('📎 Оберіть тип книги:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📄 Файл (PDF/EPUB)', callback_data: 'type_file' }],
          [{ text: '🎧 Аудіокнига', callback_data: 'type_audio' }],
          [{ text: '🔗 Посилання', callback_data: 'type_link' }],
          [{ text: '❌ Скасувати', callback_data: 'cancel_add' }]
        ]
      }
    });
    
    return ctx.wizard.next();
  },
  // Крок 6: Введення файлу/посилання
  async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply(
        '❌ Будь ласка, оберіть тип книги, використовуючи кнопки.\n\n' +
        '💡 Або натисніть /cancel для скасування'
      );
      return;
    }

    const type = ctx.callbackQuery.data;
    
    // Перевірка на скасування
    if (type === 'cancel_add') {
      await ctx.answerCbQuery('❌ Скасовано');
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }
    
    // Перевіряємо чи це правильний callback для типу книги
    if (!type.startsWith('type_')) {
      await ctx.answerCbQuery('❌ Невірний вибір');
      await ctx.reply(
        '❌ Будь ласка, оберіть тип книги, використовуючи кнопки.\n\n' +
        '💡 Або натисніть /cancel для скасування'
      );
      return;
    }
    
    const state = ctx.wizard?.state as WizardState;
    state.bookType = type;

    if (type === 'type_file') {
      await ctx.answerCbQuery('📄 Файл обрано');
      await ctx.editMessageText('📎 Надішліть файл книги (PDF/EPUB/MOBI/FB2):\n\n💡 Або натисніть /cancel для скасування');
    } else if (type === 'type_audio') {
      await ctx.answerCbQuery('🎧 Аудіокнига обрана');
      await ctx.editMessageText('🎧 Надішліть аудіофайл книги (MP3/M4A):\n\n💡 Або натисніть /cancel для скасування');
    } else if (type === 'type_link') {
      await ctx.answerCbQuery('🔗 Посилання обрано');
      await ctx.editMessageText('🔗 Введіть посилання на книгу:\n\n💡 Або натисніть /cancel для скасування');
    }
    return ctx.wizard.next();
  },
  // Крок 7: Теги (НОВИЙ КРОК - додаємо ПЕРЕД підтвердженням)
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    
    // Перевірка на скасування через текст
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }
    
    if (state.bookType === 'type_file') {
      if (ctx.message && 'document' in ctx.message && ctx.message.document) {
        const document = ctx.message.document;
        
        // Зберігаємо файл без валідації
        state.bookFile = document.file_id;
        state.bookFileName = document.file_name || 'unknown.pdf';
        
        const fileSizeMB = document.file_size ? (document.file_size / (1024 * 1024)).toFixed(2) : '?';
        await ctx.reply(
          `✅ Файл завантажено: ${state.bookFileName}\n` +
          `📦 Розмір: ${fileSizeMB} MB`
        );
      } else {
        await ctx.reply(
          '❌ Будь ласка, надішліть файл документа.\n\n' +
          '💡 Або натисніть /cancel для скасування'
        );
        return;
      }
    } else if (state.bookType === 'type_audio') {
      if (ctx.message && 'audio' in ctx.message && ctx.message.audio) {
        const audio = ctx.message.audio;
        
        // Зберігаємо аудіо без валідації
        state.bookAudio = audio.file_id;
        state.bookAudioName = audio.file_name || 'audiobook.mp3';
        
        const fileSizeMB = audio.file_size ? (audio.file_size / (1024 * 1024)).toFixed(2) : '?';
        const duration = audio.duration ? `${Math.floor(audio.duration / 60)}хв` : '';
        await ctx.reply(
          `✅ Аудіофайл завантажено: ${state.bookAudioName}\n` +
          `📦 Розмір: ${fileSizeMB} MB ${duration}`
        );
      } else if (ctx.message && 'voice' in ctx.message && ctx.message.voice) {
        const voice = ctx.message.voice;
        
        // Зберігаємо голосове повідомлення без валідації
        state.bookAudio = voice.file_id;
        state.bookAudioName = 'voice_message.ogg';
        
        const duration = voice.duration ? `${Math.floor(voice.duration / 60)}хв` : '';
        await ctx.reply(`✅ Голосове повідомлення завантажено ${duration}`);
      } else {
        await ctx.reply(
          '❌ Будь ласка, надішліть аудіофайл.\n\n' +
          '💡 Або натисніть /cancel для скасування'
        );
        return;
      }
    } else if (state.bookType === 'type_link') {
      // Валідація типу повідомлення для посилання
      if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply(
          '❌ Будь ласка, надішліть текст (посилання на книгу).\n\n' +
          '💡 Або натисніть /cancel для скасування'
        );
        return;
      }
      
      const url = ctx.message.text.trim();
      // Зберігаємо посилання без валідації
      state.bookLink = url;
      console.log('DEBUG: Посилання збережено в state.bookLink:', url);
      await ctx.reply('✅ Посилання збережено');
    }

    // Запитуємо чи хоче користувач додати ще формати
    const hasFile = !!state.bookFile;
    const hasAudio = !!state.bookAudio;
    const hasLink = !!state.bookLink;
    
    // Показуємо що вже додано
    const addedFormats = [];
    if (hasFile) addedFormats.push('📄 Файл');
    if (hasAudio) addedFormats.push('🎧 Аудіо');
    if (hasLink) addedFormats.push('🌐 Посилання');
    
    // Показуємо доступні формати для додавання
    const availableFormats = [];
    if (!hasFile) availableFormats.push([{ text: '📄 Додати файл книги', callback_data: 'add_more_file' }]);
    if (!hasAudio) availableFormats.push([{ text: '🎧 Додати аудіофайл', callback_data: 'add_more_audio' }]);
    if (!hasLink) availableFormats.push([{ text: '🌐 Додати посилання', callback_data: 'add_more_link' }]);
    
    if (availableFormats.length > 0) {
      availableFormats.push([{ text: '✅ Далі до тегів', callback_data: 'skip_more_formats' }]);
      
      await ctx.reply(
        `✅ Додано: ${addedFormats.join(', ')}\n\n` +
        `Хочете додати ще формати?`,
        {
          reply_markup: { inline_keyboard: availableFormats }
        }
      );
      return ctx.wizard.next();
    }
    
    // Якщо всі формати додані - переходимо до тегів
    // Пропонуємо додати теги ПЕРЕД підтвердженням
    const allTags = await getAllTags();
    if (allTags.length > 0) {
      // Створюємо кнопки з тегами (по 2 в рядок)
      const tagButtons = [];
      for (let i = 0; i < allTags.length; i += 2) {
        const row = [
          Markup.button.callback(allTags[i].name, `preview_tag_${allTags[i].id}`)
        ];
        if (i + 1 < allTags.length) {
          row.push(Markup.button.callback(allTags[i + 1].name, `preview_tag_${allTags[i + 1].id}`));
        }
        tagButtons.push(row);
      }
      
      tagButtons.push([
        Markup.button.callback('✅ Далі (без тегів)', 'preview_skip_tags'),
        Markup.button.callback('❌ Скасувати', 'cancel_add')
      ]);
      
      state.selectedTags = [];
      
      await ctx.reply(
        '🏷️ *Додайте теги до книги (опціонально):*\n\n' +
        'Оберіть один або кілька тегів, які підходять до цієї книги.\n' +
        'Натисніть "Далі" коли закінчите або щоб пропустити цей крок.',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(tagButtons).reply_markup
        }
      );
      return ctx.wizard.next();
    } else {
      // Якщо немає тегів - одразу переходимо до підтвердження
      state.selectedTags = [];
      return ctx.wizard.next();
    }
  },
  // Крок 8: Підтвердження (з тегами)
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    
    // Перевірка на скасування
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_add') {
      await ctx.answerCbQuery('❌ Скасовано');
      await ctx.reply('❌ Додавання книги скасовано');
      return ctx.scene?.leave();
    }
    
    // Якщо це callback "Далі" - показуємо прев'ю
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'preview_skip_tags') {
      await ctx.answerCbQuery('✅ Переходимо до підтвердження');
    }

    // Підготовка даних для збереження
    const bookData: any = {
      title: state.title,
      author: state.author,
      genre: state.genre,
      description: state.description,
      photo_file_id: state.photoFileId || 'default_book_cover'
    };

    // Отримуємо назви вибраних тегів
    let tagsText = '';
    if (state.selectedTags && state.selectedTags.length > 0) {
      const allTags = await getAllTags();
      const selectedTagNames = state.selectedTags
        .map(tagId => allTags.find(t => t.id === tagId)?.name)
        .filter(Boolean)
        .join(', ');
      tagsText = `\n🏷️ Теги: ${selectedTagNames}`;
    }

    // Формуємо список доступних форматів
    const formats = [];
    if (state.bookFile) formats.push('📄 Файл для завантаження');
    if (state.bookAudio) formats.push('🎧 Аудіокнига');
    if (state.bookLink) formats.push('🔗 Онлайн-посилання');
    
    const formatsText = formats.length > 0 
      ? '\n\n' + formats.join('\n')
      : '\n\n📖 Тільки фізична копія';
    
    // Прев'ю книги
    const previewText = `
📖 *${bookData.title}*
👤 ${bookData.author}
📚 ${bookData.genre}
📝 ${bookData.description}${tagsText}${formatsText}
    `.trim();

    if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
      await ctx.replyWithPhoto(bookData.photo_file_id, {
        caption: previewText + '\n\n💡 Перевірте всі дані перед публікацією',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Підтвердити і опублікувати', callback_data: 'confirm_book' }],
            [{ text: '❌ Скасувати', callback_data: 'cancel_book' }]
          ]
        }
      });
    } else {
      await ctx.reply(previewText + '\n\n💡 Перевірте всі дані перед публікацією', {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Підтвердити і опублікувати', callback_data: 'confirm_book' }],
            [{ text: '❌ Скасувати', callback_data: 'cancel_book' }]
          ]
        }
      });
    }
    return ctx.wizard.next();
  },
  // Крок 9: Збереження
  async (ctx: BotContext) => {
    if (!ctx.callbackQuery) return;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'confirm_book') {
      const state = ctx.wizard?.state as WizardState;
      
      // Визначаємо file_type на основі того що додано
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
        file_type: file_type
      };
      
      // Додаємо файл якщо є
      if (state.bookFile) {
        bookData.file_url = state.bookFile;
        bookData.file_name = state.bookFileName;
      }
      
      // Додаємо аудіо якщо є
      if (state.bookAudio) {
        bookData.audio_file_id = state.bookAudio;
      }
      
      // Додаємо посилання якщо є
      if (state.bookLink) {
        bookData.online_link = state.bookLink;
      }
      
      // ДЕБАГ: Перевіряємо що є в state
      console.log('DEBUG state:', {
        bookFile: state.bookFile,
        bookAudio: state.bookAudio,
        bookLink: state.bookLink
      });
      console.log('DEBUG bookData:', {
        file_url: bookData.file_url,
        audio_file_id: bookData.audio_file_id,
        online_link: bookData.online_link
      });

      // Валідація даних
      const validation = validateBookData(bookData);
      if (!validation.isValid) {
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('❌ Помилка валідації');
        }
        
        await ctx.reply(
          '❌ *Помилка валідації:*\n\n' + validation.errors.join('\n') + '\n\nСпробуйте додати книгу ще раз.',
          { parse_mode: 'HTML' }
        );
        return ctx.scene?.leave();
      }

      try {
        // Логування для дебагу
        logger.debug('Saving book with data:', { 
          hasFile: !!bookData.file_url,
          hasAudio: !!bookData.audio_file_id,
          hasLink: !!bookData.online_link,
          bookData 
        });
        
        const bookId = await addBook(bookData);

        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('✅ Книга додається...');
        }
        
        // Додаємо теги до книги (якщо були вибрані)
        if (state.selectedTags && state.selectedTags.length > 0) {
          for (const tagId of state.selectedTags) {
            try {
              await addBookTag(bookId, tagId);
            } catch (error) {
              logger.error('Error adding tag to book', error instanceof Error ? error : new Error(String(error)));
            }
          }
        }
        
        await ctx.reply('✅ Книга успішно додана до бібліотеки!');

        // Показати додану книгу
        const finalCaption = await formatBookCaption({...bookData, id: bookId, is_available: true});
        if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
          await ctx.replyWithPhoto(bookData.photo_file_id, {
            caption: finalCaption,
            parse_mode: 'HTML'
          });
        } else {
          await ctx.reply(finalCaption, { parse_mode: 'HTML' });
        }
        
        // Показуємо кнопку назад до адмін-панелі
        await ctx.reply(
          '✅ Книга успішно опублікована!',
          {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🏠 Назад до адмін-панелі', 'back_to_admin')]
            ]).reply_markup
          }
        );
        
        // НЕ виходимо зі сцени - чекаємо натискання кнопки
        return;
      } catch (error) {
        logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
        await ctx.reply('❌ Виникла помилка при додаванні книги. Спробуйте ще раз.');
        return ctx.scene?.leave();
      }
    } else {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Скасовано');
      }
      await ctx.reply('❌ Додавання книги скасовано.');
      return ctx.scene?.leave();
    }
  }
);

// Обробка вибору тегів на етапі прев'ю (ПЕРЕД публікацією)
addBookScene.action(/preview_tag_(\d+)/, async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  const tagId = parseInt(ctx.match[1]);
  
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
});

// Cleanup при виході зі сцени
addBookScene.leave((ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  if (state) {
    delete state.title;
    delete state.author;
    delete state.genre;
    delete state.description;
    delete state.photoFileId;
    delete state.bookType;
    delete state.fileUrl;
    delete state.fileName;
    delete state.bookFile;
    delete state.bookFileName;
    delete state.bookAudio;
    delete state.bookAudioName;
    delete state.bookLink;
    delete state.selectedFormats;
    delete state.selectedGenres;
    delete state.selectedTags;
    delete state.savedBookId;
    delete state.aiSuggestedTags;
  }
  logger.debug('AddBookScene cleanup completed', { userId: ctx.from?.id });
});

// Обробники для додавання додаткових форматів
addBookScene.action('add_more_file', async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  state.bookType = 'type_file';
  
  await ctx.answerCbQuery('📄 Додаємо файл');
  await ctx.editMessageText('📎 Надішліть файл книги (PDF/EPUB/MOBI/FB2):');
  
  // НЕ змінюємо крок - залишаємося на поточному (крок 7)
  // Wizard автоматично обробить наступне повідомлення
});

addBookScene.action('add_more_audio', async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  state.bookType = 'type_audio';
  
  await ctx.answerCbQuery('🎧 Додаємо аудіо');
  await ctx.editMessageText('🎧 Надішліть аудіофайл книги (MP3/M4A):');
  
  // НЕ змінюємо крок - залишаємося на поточному (крок 7)
});

addBookScene.action('add_more_link', async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  state.bookType = 'type_link';
  
  await ctx.answerCbQuery('🔗 Додаємо посилання');
  await ctx.editMessageText('🔗 Введіть посилання на книгу:');
  
  // НЕ змінюємо крок - залишаємося на поточному (крок 7)
});

addBookScene.action('skip_more_formats', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✅ Переходимо до тегів');
  
  // Переходимо до тегів (крок 8)
  const state = ctx.wizard?.state as WizardState;
  const allTags = await getAllTags();
  
  if (allTags.length > 0) {
    const tagButtons = [];
    for (let i = 0; i < allTags.length; i += 2) {
      const row = [
        Markup.button.callback(allTags[i].name, `preview_tag_${allTags[i].id}`)
      ];
      if (i + 1 < allTags.length) {
        row.push(Markup.button.callback(allTags[i + 1].name, `preview_tag_${allTags[i + 1].id}`));
      }
      tagButtons.push(row);
    }
    
    tagButtons.push([
      Markup.button.callback('✅ Далі (без тегів)', 'preview_skip_tags'),
      Markup.button.callback('❌ Скасувати', 'cancel_add')
    ]);
    
    state.selectedTags = [];
    
    await ctx.editMessageText(
      '🏷️ *Додайте теги до книги (опціонально):*\n\n' +
      'Оберіть один або кілька тегів, які підходять до цієї книги.\n' +
      'Натисніть "Далі" коли закінчите або щоб пропустити цей крок.',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(tagButtons).reply_markup
      }
    );
    ctx.wizard.selectStep(7); // Переходимо на крок тегів
  } else {
    state.selectedTags = [];
    ctx.wizard.selectStep(8); // Переходимо на крок підтвердження
  }
});

// Обробник кнопки "Назад до адмін-панелі"
addBookScene.action('back_to_admin', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  
  // Імпортуємо функції для адмін-панелі
  const { isAdmin, getAdminStats, getPendingReviews, getPendingFeedbackMessages } = await import('../database/models');
  const { getAdminMenuKeyboard } = await import('../keyboards/adminKeyboards');
  
  const adminCheck = await isAdmin(ctx.from!.id);
  if (!adminCheck) {
    await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
    return ctx.scene.leave();
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
  
  // Видаляємо попереднє повідомлення з кнопкою
  try {
    await ctx.deleteMessage();
  } catch (error) {
    // Ігноруємо помилку якщо повідомлення вже видалене
  }
  
  // Показуємо адмін-панель
  await ctx.reply(
    `🛠️ <b>Панель адміністратора</b>\n\n` +
    `📊 <b>Статистика:</b>\n` +
    `📚 Книг в каталозі: ${stats.totalBooks}\n` +
    `${reviewsAlert}\n` +
    `${feedbackAlert}`,
    {
      parse_mode: 'HTML',
      reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length)
    }
  );
  
  // Виходимо зі сцени
  return ctx.scene.leave();
});

export default addBookScene;
