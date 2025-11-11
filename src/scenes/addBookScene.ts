import { Scenes, Markup } from 'telegraf';
import { addBook } from '../database/models';
import { getAllTags, addBookTag } from '../database/tagFunctions';
import { formatBookCaption } from '../utils/helpers';
import { logger } from '../utils/logger';
import { BotContext, WizardState } from '../types/telegraf';
import { validateBookData } from '../utils/validation';
import { 
  extractBookInfoFromCover, 
  detectGenreFromDescription, 
  generateTagsFromDescription,
  checkDescriptionQuality,
  isAIEnabled 
} from '../utils/aiHelper';

// ✅ ВИПРАВЛЕНО #18: helper функція для уникнення дублювання коду
async function promptForBookTitle(ctx: BotContext): Promise<void> {
  await ctx.reply(
    '📖 Введіть назву книги:\n\n' +
    '💡 Або натисніть /cancel для скасування',
    {
      reply_markup: Markup.keyboard([
        ['❌ Скасувати']
      ]).resize().reply_markup
    }
  );
}

const addBookScene = new Scenes.WizardScene(
  'ADD_BOOK_SCENE',
  // Крок 0: AI-асистент (опціонально)
  async (ctx) => {
    if (isAIEnabled()) {
      await ctx.reply(
        '🤖 *AI-Асистент для додавання книги*\n\n' +
        '✨ Я можу автоматично заповнити інформацію про книгу!\n\n' +
        '*Оберіть спосіб:*\n' +
        '📸 Завантажте обкладинку - я розпізнаю назву, автора та жанр\n' +
        '✍️ Введіть вручну - заповніть всі поля самостійно',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📸 Завантажити обкладинку (AI)', callback_data: 'ai_cover' }],
              [{ text: '✍️ Ввести вручну', callback_data: 'manual_entry' }],
              [{ text: '❌ Скасувати', callback_data: 'cancel_add' }]
            ]
          }
        }
      );
    } else {
      // Якщо AI недоступний - одразу ручне введення
      await ctx.reply(
        '📖 Введіть назву книги:\n\n' +
        '💡 Або натисніть /cancel для скасування',
        {
          reply_markup: Markup.keyboard([
            ['❌ Скасувати']
          ]).resize().reply_markup
        }
      );
      return ctx.wizard.selectStep(2); // Пропускаємо AI крок
    }
    return ctx.wizard.next();
  },
  // Крок 1: Обробка вибору AI або ручного введення
  async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const choice = ctx.callbackQuery.data;
      
      if (choice === 'cancel_add') {
        await ctx.answerCbQuery('❌ Скасовано');
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
      }
      
      if (choice === 'manual_entry') {
        await ctx.answerCbQuery('✍️ Ручне введення');
        await ctx.editMessageText('✍️ Ручне введення обрано');
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
      }
      
      if (choice === 'ai_cover') {
        await ctx.answerCbQuery('📸 AI розпізнавання');
        await ctx.editMessageText(
          '📸 *AI розпізнавання обкладинки*\n\n' +
          'Завантажте фото обкладинки книги.\n' +
          'Я спробую автоматично визначити:\n' +
          '• Назву книги\n' +
          '• Автора\n' +
          '• Жанр\n\n' +
          '💡 Для кращого результату використовуйте чітке фото обкладинки',
          { parse_mode: 'Markdown' }
        );
        
        const state = ctx.wizard?.state as WizardState;
        state.useAI = true;
        return ctx.wizard.next();
      }
    }
    
    await ctx.reply('❌ Будь ласка, оберіть спосіб додавання книги');
    return;
  },
  // Крок 2: Назва книги (або AI розпізнавання)
  async (ctx: BotContext) => {
    const state = ctx.wizard?.state as WizardState;
    
    // Якщо використовуємо AI - очікуємо фото
    if (state.useAI) {
      if (ctx.message && 'photo' in ctx.message && ctx.message.photo && ctx.message.photo.length > 0) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        state.photoFileId = photo.file_id;
        
        await ctx.reply('⏳ Аналізую обкладинку за допомогою AI...');
        
        try {
          // Отримуємо файл з Telegram
          const file = await ctx.telegram.getFile(photo.file_id);
          const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
          
          // Завантажуємо зображення
          const imageResponse = await fetch(fileUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          const imageBase64 = Buffer.from(imageBuffer).toString('base64');
          
          // Розпізнаємо обкладинку
          const bookInfo = await extractBookInfoFromCover(imageBase64);
          
          if (bookInfo.title || bookInfo.author || bookInfo.genre) {
            let message = '✅ *AI розпізнав інформацію:*\n\n';
            
            if (bookInfo.title) {
              state.title = bookInfo.title;
              message += `📖 Назва: ${bookInfo.title}\n`;
            }
            if (bookInfo.author) {
              state.author = bookInfo.author;
              message += `👤 Автор: ${bookInfo.author}\n`;
            }
            if (bookInfo.genre) {
              state.genre = bookInfo.genre;
              message += `📚 Жанр: ${bookInfo.genre}\n`;
            }
            
            message += `\n🎯 Впевненість: ${bookInfo.confidence === 'high' ? 'Висока' : bookInfo.confidence === 'medium' ? 'Середня' : 'Низька'}`;
            
            await ctx.reply(message, { parse_mode: 'Markdown' });
            
            // Пропонуємо підтвердити або виправити
            await ctx.reply(
              '✏️ Перевірте розпізнану інформацію.\n\n' +
              'Якщо щось неправильно - введіть виправлення:\n' +
              '• Для назви: напишіть "Назва: [нова назва]"\n' +
              '• Для автора: напишіть "Автор: [новий автор]"\n' +
              '• Для жанру: напишіть "Жанр: [новий жанр]"\n\n' +
              'Або натисніть "Продовжити" якщо все правильно',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '✅ Продовжити', callback_data: 'ai_continue' }],
                    [{ text: '✏️ Виправити все вручну', callback_data: 'ai_manual_fix' }]
                  ]
                }
              }
            );
            
            state.aiRecognized = true;
            return ctx.wizard.selectStep(4); // Переходимо до опису
          } else {
            await ctx.reply(
              '❌ Не вдалося розпізнати обкладинку.\n\n' +
              'Спробуйте:\n' +
              '• Використати більш чітке фото\n' +
              '• Ввести дані вручну',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🔄 Спробувати інше фото', callback_data: 'ai_retry' }],
                    [{ text: '✍️ Ввести вручну', callback_data: 'ai_manual' }]
                  ]
                }
              }
            );
            return;
          }
        } catch (error) {
          logger.error('AI cover recognition error', error instanceof Error ? error : new Error(String(error)));
          await ctx.reply(
            '❌ Помилка розпізнавання обкладинки.\n\n' +
            'Будь ласка, введіть дані вручну.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✍️ Ввести вручну', callback_data: 'ai_manual' }]
                ]
              }
            }
          );
          return;
        }
      } else {
        await ctx.reply('❌ Будь ласка, надішліть фото обкладинки');
        return;
      }
    }
    
    // Ручне введення назви
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
    if (title.length < 2) {
      await ctx.reply('❌ Назва занадто коротка. Мінімум 2 символи.');
      return;
    }
    
    if (title.length > 200) {
      await ctx.reply('❌ Назва занадто довга. Максимум 200 символів.');
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
  // ✅ ВИПРАВЛЕНО #18: видалено дублювання - крок 2 був ідентичний кроку 3
  // Крок 3: Автор
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
    if (author.length < 2) {
      await ctx.reply('❌ Ім\'я автора занадто коротке. Мінімум 2 символи.');
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

    await ctx.reply('📚 Оберіть жанр книги:', {
      reply_markup: { inline_keyboard: keyboard }
    });
    return ctx.wizard.next();
  },
  // Крок 4: Опис з лічильником символів
  async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const genreIndex = parseInt(ctx.callbackQuery.data.split('_')[1]);
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
      const state = ctx.wizard?.state as WizardState;
      state.genre = genres[genreIndex];
      await ctx.editMessageText('📚 Жанр обрано: ' + state.genre);
    }

    await ctx.reply('📝 Введіть короткий опис книги (макс. 500 символів):');
    return ctx.wizard.next();
  },
  // Крок 5: Фото (опціонально) + AI перевірка якості опису
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
    
    if (description.length < 10) {
      await ctx.reply('❌ Опис занадто короткий. Мінімум 10 символів.');
      return;
    }
    
    if (description.length > 500) {
      await ctx.reply('❌ Опис занадто довгий. Максимум 500 символів. Спробуйте ще раз:');
      return;
    }
    
    const state = ctx.wizard?.state as WizardState;
    state.description = description;
    
    // AI перевірка якості опису (Завдання 29.3)
    if (isAIEnabled() && state.title && state.author && state.genre) {
      await ctx.reply('🤖 Перевіряю якість опису за допомогою AI...');
      
      try {
        // ✅ ВИПРАВЛЕНО #31: timeout для AI
        const quality = await Promise.race([
          checkDescriptionQuality(description),
          new Promise<any>((resolve) => setTimeout(() => resolve({ score: 100 }), 5000))
        ]);
        
        if (quality.score >= 70) {
          await ctx.reply(
            `✅ *Якість опису: ${quality.score}/100*\n\n` +
            `Опис виглядає добре!`,
            { parse_mode: 'Markdown' }
          );
        } else if (quality.score >= 50) {
          let message = `⚠️ *Якість опису: ${quality.score}/100*\n\n`;
          
          if (quality.suggestions.length > 0) {
            message += `*Рекомендації для покращення:*\n`;
            quality.suggestions.forEach(suggestion => {
              message += `• ${suggestion}\n`;
            });
          }
          
          await ctx.reply(message, { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Залишити як є', callback_data: 'desc_keep' }],
                [{ text: '✏️ Виправити опис', callback_data: 'desc_fix' }]
              ]
            }
          });
          
          state.awaitingDescriptionFix = true;
          return; // Чекаємо вибору
        } else {
          let message = `❌ *Якість опису: ${quality.score}/100*\n\n`;
          message += `Опис потребує покращення.\n\n`;
          
          if (quality.suggestions.length > 0) {
            message += `*Рекомендації:*\n`;
            quality.suggestions.forEach(suggestion => {
              message += `• ${suggestion}\n`;
            });
          }
          
          await ctx.reply(message, { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✏️ Виправити опис', callback_data: 'desc_fix' }],
                [{ text: '⏭️ Продовжити все одно', callback_data: 'desc_keep' }]
              ]
            }
          });
          
          state.awaitingDescriptionFix = true;
          return; // Чекаємо вибору
        }
      } catch (error) {
        logger.error('AI quality check error', error instanceof Error ? error : new Error(String(error)));
        // Продовжуємо без AI перевірки
      }
    }
    
    // AI визначення жанру якщо не було визначено (Завдання 29.1)
    if (isAIEnabled() && !state.genre && state.title && state.author) {
      await ctx.reply('🤖 Визначаю жанр за допомогою AI...');
      
      try {
        const detectedGenre = await detectGenreFromDescription(description);
        
        state.genre = detectedGenre;
        await ctx.reply(`📚 AI визначив жанр: *${detectedGenre}*`, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('AI genre detection error', error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    // AI генерація тегів (Завдання 29.2)
    if (isAIEnabled() && state.title && state.genre) {
      await ctx.reply('🤖 Генерую теги за допомогою AI...');
      
      try {
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
            { parse_mode: 'Markdown' }
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
  // Крок 6: Вибір типу файлу
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
      
      // ✅ ВИПРАВЛЕНО #3: валідація фото
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      
      // Перевірка розміру
      if (photo.file_size && photo.file_size > MAX_SIZE) {
        await ctx.reply(
          `❌ Фото занадто велике!\n\n` +
          `Розмір: ${(photo.file_size / (1024 * 1024)).toFixed(2)} MB\n` +
          `Максимум: 5 MB\n\n` +
          `Будь ласка, завантажте менше фото або використайте посилання на зображення.`
        );
        return;
      }
      
      // Попередження про пропорції (обкладинки зазвичай 2:3)
      if (photo.width && photo.height) {
        const ratio = photo.width / photo.height;
        if (ratio < 0.5 || ratio > 1) {
          await ctx.reply(
            '⚠️ *Рекомендація:* обкладинки книг зазвичай мають пропорції 2:3 (вертикальні)\n\n' +
            'Але ми приймемо це фото. Продовжуємо...',
            { parse_mode: 'Markdown' }
          );
        }
      }
      
      state.photoFileId = photo.file_id;
      await ctx.reply('✅ Фото завантажено');
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
          [{ text: '🔗 Посилання', callback_data: 'type_link' }],
          [{ text: '❌ Скасувати', callback_data: 'cancel_add' }]
        ]
      }
    });
    
    return ctx.wizard.next();
  },
  // Крок 7: Введення файлу/посилання
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
      await ctx.editMessageText('📎 Надішліть файл книги (PDF/EPUB):\n\n💡 Або натисніть /cancel для скасування');
    } else if (type === 'type_link') {
      await ctx.answerCbQuery('🔗 Посилання обрано');
      await ctx.editMessageText('🔗 Введіть посилання на книгу:\n\n💡 Або натисніть /cancel для скасування');
    }
    return ctx.wizard.next();
  },
  // Крок 8: Підтвердження
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
        
        // ✅ ВИПРАВЛЕНО #23: валідація розміру файлу
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
        
        if (document.file_size && document.file_size > MAX_FILE_SIZE) {
          await ctx.reply(
            `❌ Файл занадто великий!\n\n` +
            `Розмір: ${(document.file_size / (1024 * 1024)).toFixed(2)} MB\n` +
            `Максимум: 50 MB\n\n` +
            `Будь ласка, завантажте менший файл або використайте посилання.`
          );
          return;
        }
        
        state.fileUrl = document.file_id;
        state.fileName = document.file_name || 'unknown.pdf';
        
        const fileSizeMB = document.file_size ? (document.file_size / (1024 * 1024)).toFixed(2) : 'невідомо';
        await ctx.reply(`✅ Файл завантажено: ${state.fileName}\nРозмір: ${fileSizeMB} MB`);
      } else {
        await ctx.reply(
          '❌ Будь ласка, надішліть файл.\n\n' +
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
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        state.fileUrl = url;
        await ctx.reply('✅ Посилання збережено');
      } else {
        await ctx.reply(
          '❌ Будь ласка, введіть коректне посилання (http/https).\n\n' +
          '💡 Або натисніть /cancel для скасування'
        );
        return;
      }
    }

    // Підготовка даних для збереження
    const bookData: any = {
      title: state.title,
      author: state.author,
      genre: state.genre,
      description: state.description,
      photo_file_id: state.photoFileId || 'default_book_cover'
    };
    
    // Додаємо narrator якщо є аудіо
    if (state.narrator) {
      bookData.narrator = state.narrator;
    }

    // Прев'ю книги
    const previewText = `
📖 *${bookData.title}*
👤 ${bookData.author}
📚 ${bookData.genre}
📝 ${bookData.description}

${state.bookType === 'type_file' ? '📄 Доступна для завантаження' :
  state.bookType === 'type_link' ? '🔗 Доступна за посиланням' :
  '📖 Тільки фізична копія'}
    `.trim();

    // ✅ ВИПРАВЛЕНО #15: Preview з можливістю редагування
    if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
      await ctx.replyWithPhoto(bookData.photo_file_id, {
        caption: previewText + '\n\n💡 Перевірте всі дані перед публікацією',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Підтвердити і опублікувати', callback_data: 'confirm_book' }],
            [{ text: '✏️ Редагувати назву', callback_data: 'edit_title' }],
            [{ text: '✏️ Редагувати автора', callback_data: 'edit_author' }],
            [{ text: '✏️ Редагувати опис', callback_data: 'edit_description' }],
            [{ text: '❌ Скасувати', callback_data: 'cancel_book' }]
          ]
        }
      });
    } else {
      await ctx.reply(previewText + '\n\n💡 Перевірте всі дані перед публікацією', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Підтвердити і опублікувати', callback_data: 'confirm_book' }],
            [{ text: '✏️ Редагувати назву', callback_data: 'edit_title' }],
            [{ text: '✏️ Редагувати автора', callback_data: 'edit_author' }],
            [{ text: '✏️ Редагувати опис', callback_data: 'edit_description' }],
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
      // Визначаємо file_type на основі вибору
      let file_type = 'physical';
      if (state.bookType === 'type_file') file_type = 'file';
      else if (state.bookType === 'type_link') file_type = 'link';
      
      const bookData = {
        title: state.title,
        author: state.author,
        genre: state.genre,
        description: state.description,
        photo_file_id: state.photoFileId || 'default_book_cover',
        file_url: state.fileUrl || null,
        file_type: file_type,
        file_name: state.fileName || null
      };

      // Валідація даних
      const validation = validateBookData(bookData);
      if (!validation.isValid) {
        // Відповідаємо на callback query
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('❌ Помилка валідації');
        }
        
        await ctx.reply(
          '❌ *Помилка валідації:*\n\n' + validation.errors.join('\n') + '\n\nСпробуйте додати книгу ще раз.',
          { parse_mode: 'Markdown' }
        );
        return ctx.scene?.leave();
      }

      try {
        const bookId = await addBook(bookData);

        // Відповідаємо на callback query
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('✅ Книга додається...');
        }
        
        await ctx.reply('✅ Книга успішно додана до бібліотеки!');

        // Показати додану книгу
        const finalCaption = await formatBookCaption({...bookData, id: bookId, is_available: true});
        if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
          await ctx.replyWithPhoto(bookData.photo_file_id, {
            caption: finalCaption,
            parse_mode: 'Markdown'
          });
        } else {
          await ctx.reply(finalCaption, { parse_mode: 'Markdown' });
        }
        
        // Пропонуємо додати теги
        const allTags = await getAllTags();
        if (allTags.length > 0) {
          // Зберігаємо bookId в state для наступного кроку
          state.savedBookId = bookId;
          
          // Створюємо кнопки з тегами (по 2 в рядок)
          const tagButtons = [];
          for (let i = 0; i < allTags.length; i += 2) {
            const row = [
              Markup.button.callback(allTags[i].name, `tag_${allTags[i].id}`)
            ];
            if (i + 1 < allTags.length) {
              row.push(Markup.button.callback(allTags[i + 1].name, `tag_${allTags[i + 1].id}`));
            }
            tagButtons.push(row);
          }
          
          // Додаємо кнопки "Готово" та "Пропустити"
          tagButtons.push([
            Markup.button.callback('✅ Готово', 'tags_done'),
            Markup.button.callback('⏭️ Пропустити', 'tags_skip')
          ]);
          
          await ctx.reply(
            '🏷️ *Додайте теги до книги:*\n\n' +
            'Оберіть один або кілька тегів, які підходять до цієї книги.\n' +
            'Натисніть "Готово" коли закінчите.',
            {
              parse_mode: 'Markdown',
              reply_markup: Markup.inlineKeyboard(tagButtons).reply_markup
            }
          );
          
          // Ініціалізуємо масив вибраних тегів
          state.selectedTags = [];
          
          return; // Не виходимо зі scene, чекаємо вибору тегів
        }
      } catch (error) {
        logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
        await ctx.reply('❌ Виникла помилка при додаванні книги. Спробуйте ще раз.');
      }
    } else {
      // Відповідаємо на callback query
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Скасовано');
      }
      await ctx.reply('❌ Додавання книги скасовано.');
    }
    return ctx.scene?.leave();
  }
);

// ============================================
// ОБРОБНИКИ AI CALLBACKS
// ============================================

addBookScene.action('ai_continue', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✅ Продовжуємо');
  await ctx.editMessageText('✅ Інформація підтверджена. Переходимо до опису.');
  
  await ctx.reply('📝 Введіть короткий опис книги (макс. 500 символів):');
  return ctx.wizard.selectStep(5); // Переходимо до опису
});

// ✅ ВИПРАВЛЕНО #18: використання helper функції
addBookScene.action('ai_manual_fix', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Ручне виправлення');
  await ctx.editMessageText('✏️ Введіть виправлення або натисніть "Продовжити"');
  await promptForBookTitle(ctx);
  return ctx.wizard.selectStep(2);
});

addBookScene.action('ai_retry', async (ctx: BotContext) => {
  await ctx.answerCbQuery('🔄 Спробуйте ще раз');
  await ctx.editMessageText('📸 Завантажте інше фото обкладинки');
  return; // Залишаємось на тому ж кроці
});

addBookScene.action('ai_manual', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✍️ Ручне введення');
  await ctx.editMessageText('✍️ Переходимо до ручного введення');
  
  const state = ctx.wizard?.state as WizardState;
  state.useAI = false;
  
  await promptForBookTitle(ctx);
  return ctx.wizard.selectStep(2);
});

addBookScene.action('desc_keep', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✅ Продовжуємо');
  await ctx.editMessageText('✅ Опис збережено');
  
  const state = ctx.wizard?.state as WizardState;
  state.awaitingDescriptionFix = false;
  
  await ctx.reply('🖼️ Завантажте фото обкладинки книги (або натисніть "Пропустити"):', {
    reply_markup: Markup.inlineKeyboard([
      [{ text: '⏭️ Пропустити', callback_data: 'skip_photo' }]
    ]).reply_markup
  });
  
  return ctx.wizard.selectStep(6); // Переходимо до фото
});

addBookScene.action('desc_fix', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Виправлення опису');
  await ctx.editMessageText('✏️ Введіть новий опис книги');
  
  const state = ctx.wizard?.state as WizardState;
  state.awaitingDescriptionFix = false;
  
  await ctx.reply('📝 Введіть покращений опис книги (макс. 500 символів):');
  return; // Залишаємось на кроці опису
});

// ============================================
// ОБРОБНИКИ ТЕГІВ
// ============================================

// Обробники для вибору тегів
addBookScene.action(/^tag_(\d+)$/, async (ctx: BotContext) => {
  const tagId = parseInt(ctx.match[1]);
  const state = ctx.wizard?.state as WizardState;
  
  if (!state.selectedTags) {
    state.selectedTags = [];
  }
  
  // Перевіряємо чи тег вже вибраний
  const index = state.selectedTags.indexOf(tagId);
  if (index > -1) {
    // Видаляємо тег
    state.selectedTags.splice(index, 1);
    await ctx.answerCbQuery('❌ Тег видалено');
  } else {
    // Додаємо тег
    state.selectedTags.push(tagId);
    await ctx.answerCbQuery('✅ Тег додано');
  }
  
  // Оновлюємо повідомлення з позначкою вибраних тегів
  const allTags = await getAllTags();
  const tagButtons = [];
  for (let i = 0; i < allTags.length; i += 2) {
    const tag1 = allTags[i];
    const isSelected1 = state.selectedTags.includes(tag1.id!);
    const row = [
      Markup.button.callback(
        `${isSelected1 ? '✅ ' : ''}${tag1.name}`,
        `tag_${tag1.id}`
      )
    ];
    if (i + 1 < allTags.length) {
      const tag2 = allTags[i + 1];
      const isSelected2 = state.selectedTags.includes(tag2.id!);
      row.push(
        Markup.button.callback(
          `${isSelected2 ? '✅ ' : ''}${tag2.name}`,
          `tag_${tag2.id}`
        )
      );
    }
    tagButtons.push(row);
  }
  
  tagButtons.push([
    Markup.button.callback('✅ Готово', 'tags_done'),
    Markup.button.callback('⏭️ Пропустити', 'tags_skip')
  ]);
  
  try {
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(tagButtons).reply_markup);
  } catch (error) {
    // Ігноруємо помилки редагування
  }
});

addBookScene.action('tags_done', async (ctx: BotContext) => {
  const state = ctx.wizard?.state as WizardState;
  
  if (state.selectedTags && state.selectedTags.length > 0 && state.savedBookId) {
    try {
      // Додаємо всі вибрані теги до книги
      for (const tagId of state.selectedTags) {
        await addBookTag(state.savedBookId, tagId);
      }
      
      await ctx.answerCbQuery('✅ Теги додано');
      await ctx.editMessageText(
        `🏷️ *Теги додано:* ${state.selectedTags.length}\n\n` +
        'Книга успішно створена з тегами!',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Error adding tags', error instanceof Error ? error : new Error(String(error)));
      await ctx.answerCbQuery('❌ Помилка додавання тегів');
    }
  } else {
    await ctx.answerCbQuery('Теги не вибрано');
    await ctx.editMessageText('⏭️ Книга створена без тегів');
  }
  
  return ctx.scene?.leave();
});

addBookScene.action('tags_skip', async (ctx: BotContext) => {
  await ctx.answerCbQuery('⏭️ Пропущено');
  await ctx.editMessageText('⏭️ Книга створена без тегів');
  return ctx.scene?.leave();
});

// ✅ ВИПРАВЛЕНО #15: Обробники редагування в preview
addBookScene.action('edit_title', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Редагування назви');
  await ctx.reply('📝 Введіть нову назву книги:');
  
  const state = ctx.wizard?.state as WizardState;
  state.editingField = 'title';
  
  // Повертаємось на крок введення назви
  return ctx.wizard?.selectStep(1);
});

addBookScene.action('edit_author', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Редагування автора');
  await ctx.reply('👤 Введіть нового автора:');
  
  const state = ctx.wizard?.state as WizardState;
  state.editingField = 'author';
  
  // Повертаємось на крок введення автора
  return ctx.wizard?.selectStep(2);
});

addBookScene.action('edit_description', async (ctx: BotContext) => {
  await ctx.answerCbQuery('✏️ Редагування опису');
  await ctx.reply('📝 Введіть новий опис книги:');
  
  const state = ctx.wizard?.state as WizardState;
  state.editingField = 'description';
  
  // Повертаємось на крок введення опису
  return ctx.wizard?.selectStep(4);
});

export default addBookScene;