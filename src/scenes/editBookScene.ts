import { Scenes, Markup } from 'telegraf';
import { getBookById, updateBook } from '../database/models';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { getBookIdText } from '../utils/helpers';
import { POPULAR_GENRES, OTHER_GENRES } from '../constants/genres';

interface EditBookState {
  bookId: number;
  book?: any;
  updates?: Record<string, any>;
  editingField?: string;
  selectedGenres?: string[];
}

const editBookScene = new Scenes.WizardScene(
  'EDIT_BOOK_SCENE',
  // Крок 1: Показати поточні дані книги та меню редагування
  async (ctx: BotContext) => {
    const state = ctx.scene.state as EditBookState;

    logger.info('EditBookScene step 1 entered', { 
      bookId: state.bookId,
      hasSceneState: !!ctx.scene.state,
      userId: ctx.from?.id 
    });

    if (!state.bookId) {
      logger.error('EditBookScene: bookId not found in state', {
        state,
        userId: ctx.from?.id,
      });
      await ctx.reply('❌ Помилка: ID книги не знайдено');
      return ctx.scene.leave();
    }

    const book = await getBookById(state.bookId);

    if (!book) {
      logger.error('EditBookScene: book not found', {
        bookId: state.bookId,
        userId: ctx.from?.id,
      });
      await ctx.reply('❌ Книга не знайдена');
      return ctx.scene.leave();
    }

    // Зберігаємо дані книги в state
    const wizardState = ctx.wizard.state as EditBookState;
    wizardState.book = book;

    const bookInfo = `
<b>📖 Поточні дані книги:</b>${getBookIdText(book.id)}

<b>📚 Назва:</b> ${book.title}
<b>👤 Автор:</b> ${book.author}
<b>🎭 Жанр:</b> ${book.genre}
<b>📝 Опис:</b> ${book.description}
<b>📊 Рейтинг:</b> ${book.rating || 0}/5 (${book.reviews_count || 0} відгуків)
<b>📥 Завантажень:</b> ${book.downloads_count || 0}
<b>✅ Доступна:</b> ${book.is_available ? 'Так' : 'Ні'}
      `.trim();

    await ctx.reply(bookInfo, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('✏️ Назва', 'edit_title')],
        [Markup.button.callback('✏️ Автор', 'edit_author')],
        [Markup.button.callback('✏️ Жанр', 'edit_genre')],
        [Markup.button.callback('✏️ Опис', 'edit_description')],
        [Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
        [Markup.button.callback('✅ Доступність', 'edit_availability')],
        [Markup.button.callback('💾 Зберегти', 'save_changes')],
        [Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
        [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
      ]).reply_markup,
    });

    return ctx.wizard.next();
  },

  // Крок 2: Обробка вибору поля для редагування
  async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('❌ Будь ласка, використовуйте кнопки для вибору');
      return;
    }

    const action = ctx.callbackQuery.data;
    const state = ctx.wizard.state as EditBookState;

    if (action === 'cancel_edit') {
      await ctx.answerCbQuery('Скасовано');
      await ctx.reply('❌ Редагування скасовано');
      return ctx.scene.leave();
    }

    if (action === 'back_to_list') {
      await ctx.answerCbQuery('Повертаємось до списку книг');
      await ctx.reply('⬅️ Повертаємось до списку книг');
      // Повертаємось до сцени управління книгами
      return ctx.scene.enter('MANAGE_BOOKS_SCENE');
    }

    if (action === 'save_changes') {
      // Зберігаємо зміни
      const updates = state.updates || {};

      if (Object.keys(updates).length === 0) {
        await ctx.answerCbQuery('Немає змін для збереження');
        await ctx.reply(
          'ℹ️ Ви не внесли жодних змін.\n\n' +
            'Оберіть поле для редагування з меню вище або натисніть "❌ Скасувати".'
        );
        return;
      }

      if (state.book) {
        await updateBook(state.book.id, updates);
      }
      await ctx.answerCbQuery('✅ Зміни збережено!');

      // Показуємо що саме змінено
      const changedFields = Object.keys(updates)
        .map((key) => {
          const fieldNames: Record<string, string> = {
            title: 'Назва',
            author: 'Автор',
            genre: 'Жанр',
            description: 'Опис',
            photo_file_id: 'Фото',
            is_available: 'Доступність',
          };
          return `✅ ${fieldNames[key] || key}`;
        })
        .join('\n');

      await ctx.reply('✅ *Книгу успішно оновлено!*\n\n' + `Змінено:\n${changedFields}`, {
        parse_mode: 'Markdown',
      });

      if (ctx.from && state.book) {
        logger.adminAction(ctx.from.id, 'edit_book', { bookId: state.book.id, updates });
      }

      // ✅ ВИПРАВЛЕНО: Гарантуємо що сцена коректно завершується
      // Невелика затримка перед виходом щоб Telegram встиг отримати всі повідомлення
      setTimeout(() => {
        ctx.scene.leave().catch((err: unknown) => {
          logger.error('Error leaving edit scene', { error: err });
        });
      }, 500);

      return;
    }

    // Зберігаємо яке поле редагуємо
    state.editingField = action.replace('edit_', '');

    await ctx.answerCbQuery();

    // Запитуємо нове значення
    const fieldNames: Record<string, string> = {
      title: 'назву',
      author: 'автора',
      genre: 'жанр',
      description: 'опис',
      photo: 'фото',
      availability: 'доступність',
    };

    // ✅ ВИПРАВЛЕНО #11: Перевірка що editingField існує перед використанням як ключ
    const fieldName = (state.editingField && fieldNames[state.editingField as keyof typeof fieldNames]) || 'значення';

    if (state.editingField === 'availability') {
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [Markup.button.callback('✅ Доступна', 'set_available_true')],
          [Markup.button.callback('❌ Недоступна', 'set_available_false')],
          [Markup.button.callback('⬅️ Назад', 'back_to_menu')],
        ],
      });
    } else if (state.editingField === 'photo') {
      await ctx.reply('🖼️ Надішліть нове фото обкладинки або натисніть /skip щоб пропустити');
    } else if (state.editingField === 'genre') {
      // Ініціалізуємо масив обраних жанрів з поточних жанрів книги (розділені новим рядком)
      state.selectedGenres = state.book?.genre 
        ? state.book.genre.split('\n').filter(Boolean) 
        : [];

      // ✅ ВИПРАВЛЕНО #11: Ініціалізувати selectedGenres якщо undefined
      const selectedGenres = state.selectedGenres || [];
      const popularGenres = POPULAR_GENRES;
      const otherGenres = OTHER_GENRES;

      // Популярні жанри
      const popularKeyboard = [];
      for (let i = 0; i < popularGenres.length; i += 2) {
        const row = [
          Markup.button.callback(
            `${selectedGenres.includes(popularGenres[i]) ? '✅' : ''} ${popularGenres[i]}`,
            `genre_${popularGenres[i]}`
          ),
        ];
        if (i + 1 < popularGenres.length) {
          row.push(
            Markup.button.callback(
              `${selectedGenres.includes(popularGenres[i + 1]) ? '✅' : ''} ${popularGenres[i + 1]}`,
              `genre_${popularGenres[i + 1]}`
            )
          );
        }
        popularKeyboard.push(row);
      }

      // Інші жанри
      const otherKeyboard = [];
      for (let i = 0; i < otherGenres.length; i += 2) {
        const row = [
          Markup.button.callback(
            `${selectedGenres.includes(otherGenres[i]) ? '✅' : ''} ${otherGenres[i]}`,
            `genre_${otherGenres[i]}`
          ),
        ];
        if (i + 1 < otherGenres.length) {
          row.push(
            Markup.button.callback(
              `${selectedGenres.includes(otherGenres[i + 1]) ? '✅' : ''} ${otherGenres[i + 1]}`,
              `genre_${otherGenres[i + 1]}`
            )
          );
        }
        otherKeyboard.push(row);
      }

      const keyboard = [
        ...popularKeyboard,
        [Markup.button.callback('📖 Більше жанрів...', 'show_more_genres')],
        [Markup.button.callback('✅ Готово', 'genres_done')],
        [Markup.button.callback('⬅️ Назад', 'back_to_menu')],
      ];

      const selectedText =
        selectedGenres.length > 0 ? `\n\n✅ Вибрано: ${selectedGenres.join(', ')}` : '';

      await ctx.reply(`🎭 Оберіть жанри (до 5):${selectedText}\n\n📚 *Популярні жанри:*`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard },
      });
    } else {
      await ctx.reply(`✏️ Введіть нове значення для поля "${fieldName}":`);
    }

    return ctx.wizard.next();
  },

  // Крок 3: Отримання нового значення
  async (ctx: BotContext) => {
    const state = ctx.wizard.state as EditBookState;

    // Обробка callback для доступності
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;

      if (action === 'back_to_menu') {
        await ctx.answerCbQuery();
        // Повертаємось до меню редагування
        ctx.wizard.selectStep(0);
        return;
      }

      // Обробка вибору жанрів
      if (action.startsWith('genre_')) {
        const selectedGenre = action.replace('genre_', '');

        if (!state.selectedGenres) {
          state.selectedGenres = [];
        }

        const index = state.selectedGenres.indexOf(selectedGenre);
        if (index > -1) {
          // Видаляємо жанр якщо він вже обраний
          state.selectedGenres.splice(index, 1);
          await ctx.answerCbQuery(`❌ ${selectedGenre} видалено`);
        } else {
          // Додаємо жанр якщо він ще не обраний (максимум 5)
          if (state.selectedGenres.length >= 5) {
            await ctx.answerCbQuery('❌ Максимум 5 жанрів!', { show_alert: true });
            return;
          }
          state.selectedGenres.push(selectedGenre);
          await ctx.answerCbQuery(`✅ ${selectedGenre} додано (${state.selectedGenres.length}/5)`);
        }

        // Оновлюємо клавіатуру з новими галочками
        const popularGenres = POPULAR_GENRES;

        const popularKeyboard = [];
        for (let i = 0; i < popularGenres.length; i += 2) {
          const row = [
            Markup.button.callback(
              `${state.selectedGenres.includes(popularGenres[i]) ? '✅' : ''} ${popularGenres[i]}`,
              `genre_${popularGenres[i]}`
            ),
          ];
          if (i + 1 < popularGenres.length) {
            row.push(
              Markup.button.callback(
                `${state.selectedGenres.includes(popularGenres[i + 1]) ? '✅' : ''} ${popularGenres[i + 1]}`,
                `genre_${popularGenres[i + 1]}`
              )
            );
          }
          popularKeyboard.push(row);
        }

        const keyboard = [
          ...popularKeyboard,
          [Markup.button.callback('📖 Більше жанрів...', 'show_more_genres')],
          [Markup.button.callback('✅ Готово', 'genres_done')],
          [Markup.button.callback('⬅️ Назад', 'back_to_menu')],
        ];

        const selectedText =
          state.selectedGenres.length > 0
            ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
            : '';

        await ctx.editMessageText(
          `🎭 Оберіть жанри (до 5):${selectedText}\n\n📚 *Популярні жанри:*`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard },
          }
        );

        return;
      }

      // Показати більше жанрів
      if (action === 'show_more_genres') {
        const otherGenres = OTHER_GENRES;

        const otherKeyboard = [];
        for (let i = 0; i < otherGenres.length; i += 2) {
          const row = [
            Markup.button.callback(
              `${state.selectedGenres && state.selectedGenres.includes(otherGenres[i]) ? '✅' : ''} ${otherGenres[i]}`,
              `genre_${otherGenres[i]}`
            ),
          ];
          if (i + 1 < otherGenres.length) {
            row.push(
              Markup.button.callback(
                `${state.selectedGenres && state.selectedGenres.includes(otherGenres[i + 1]) ? '✅' : ''} ${otherGenres[i + 1]}`,
                `genre_${otherGenres[i + 1]}`
              )
            );
          }
          otherKeyboard.push(row);
        }

        const keyboard = [
          ...otherKeyboard,
          [Markup.button.callback('✅ Готово', 'genres_done')],
          [Markup.button.callback('⬅️ Назад до популярних', 'back_to_popular_genres')],
        ];

        const selectedText =
          state.selectedGenres && state.selectedGenres.length > 0
            ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
            : '';

        await ctx.editMessageText(`🎭 Оберіть жанри (до 5):${selectedText}\n\n📚 *Інші жанри:*`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard },
        });

        await ctx.answerCbQuery();
        return;
      }

      // Повернення до популярних жанрів
      if (action === 'back_to_popular_genres') {
        const popularGenres = POPULAR_GENRES;

        const popularKeyboard = [];
        for (let i = 0; i < popularGenres.length; i += 2) {
          const row = [
            Markup.button.callback(
              `${state.selectedGenres && state.selectedGenres.includes(popularGenres[i]) ? '✅' : ''} ${popularGenres[i]}`,
              `genre_${popularGenres[i]}`
            ),
          ];
          if (i + 1 < popularGenres.length) {
            row.push(
              Markup.button.callback(
                `${state.selectedGenres && state.selectedGenres.includes(popularGenres[i + 1]) ? '✅' : ''} ${popularGenres[i + 1]}`,
                `genre_${popularGenres[i + 1]}`
              )
            );
          }
          popularKeyboard.push(row);
        }

        const keyboard = [
          ...popularKeyboard,
          [Markup.button.callback('📖 Більше жанрів...', 'show_more_genres')],
          [Markup.button.callback('✅ Готово', 'genres_done')],
          [Markup.button.callback('⬅️ Назад', 'back_to_menu')],
        ];

        const selectedText =
          state.selectedGenres && state.selectedGenres.length > 0
            ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
            : '';

        await ctx.editMessageText(
          `🎭 Оберіть жанри (до 5):${selectedText}\n\n📚 *Популярні жанри:*`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard },
          }
        );

        await ctx.answerCbQuery();
        return;
      }

      // Завершення вибору жанрів
      if (action === 'genres_done') {
        if (!state.selectedGenres || state.selectedGenres.length === 0) {
          await ctx.answerCbQuery('❌ Оберіть хоча б один жанр!', { show_alert: true });
          return;
        }

        state.updates = state.updates || {};
        state.updates.genre = state.selectedGenres.join('\n'); // Зберігаємо всі жанри, розділені новим рядком

        await ctx.answerCbQuery(`✅ Жанри змінено (${state.selectedGenres.length} обрано)`);

        // Повертаємося на крок 0 (меню редагування)
        ctx.wizard.selectStep(0);

        // Показуємо меню редагування з оновленою інформацією
        if (!state.book) {
          await ctx.reply('❌ Помилка: дані книги відсутні');
          return ctx.scene.leave();
        }

        await ctx.editMessageText(
          '<b>📝 Редагування книги</b>\n\n' +
            `📖 ${state.book.title}\n` +
            `👤 ${state.book.author}\n\n` +
            `✅ Жанри змінено на: ${state.selectedGenres.join(', ')}\n\n` +
            'Оберіть що хочете змінити або збережіть зміни:',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('📖 Назва', 'edit_title')],
              [Markup.button.callback('👤 Автор', 'edit_author')],
              [Markup.button.callback('📚 Жанр', 'edit_genre')],
              [Markup.button.callback('📝 Опис', 'edit_description')],
              [Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
              [Markup.button.callback('✅ Доступність', 'edit_availability')],
              [Markup.button.callback('💾 Зберегти', 'save_changes')],
              [Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
              [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
            ]).reply_markup,
          }
        );
        return;
      }

      if (action === 'set_available_true' || action === 'set_available_false') {
        const isAvailable = action === 'set_available_true';
        state.updates = state.updates || {};
        state.updates.is_available = isAvailable;

        await ctx.answerCbQuery('✅ Змінено');

        // Повертаємося на крок 0 (меню редагування)
        ctx.wizard.selectStep(0);

        // Показуємо меню редагування
        const { Markup } = await import('telegraf');

        if (!state.book) {
          await ctx.reply('❌ Помилка: дані книги відсутні');
          return ctx.scene.leave();
        }

        await ctx.editMessageText(
          '<b>📝 Редагування книги</b>\n\n' +
            `📖 ${state.book.title}\n` +
            `👤 ${state.book.author}\n\n` +
            `✅ Доступність змінено на: ${isAvailable ? 'Доступна' : 'Недоступна'}\n\n` +
            'Оберіть що хочете змінити або збережіть зміни:',
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('📖 Назва', 'edit_title')],
              [Markup.button.callback('👤 Автор', 'edit_author')],
              [Markup.button.callback('📚 Жанр', 'edit_genre')],
              [Markup.button.callback('📝 Опис', 'edit_description')],
              [Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
              [Markup.button.callback('✅ Доступність', 'edit_availability')],
              [Markup.button.callback('💾 Зберегти', 'save_changes')],
              [Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
              [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
            ]).reply_markup,
          }
        );
        return;
      }
    }

    // Обробка команди skip
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '/skip') {
      await ctx.reply('⏭️ Пропущено. Використайте меню вище для продовження.');
      return;
    }

    // Обробка фото
    if (state.editingField === 'photo') {
      if (
        ctx.message &&
        'photo' in ctx.message &&
        ctx.message.photo &&
        ctx.message.photo.length > 0
      ) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];

        // Перевіряємо розмір фото
        if (photo.file_size && photo.file_size > 10 * 1024 * 1024) {
          await ctx.reply('❌ Фото занадто велике. Максимум 10 МБ. Спробуйте інше фото або /skip');
          return;
        }

        state.updates = state.updates || {};
        state.updates.photo_file_id = photo.file_id;

        // ✅ ВИПРАВЛЕНО: Повертаємось до меню редагування замість простого превью
        // Повертаємося на крок 0 (меню редагування)
        ctx.wizard.selectStep(0);

        // Показуємо меню редагування з оновленою інформацією
        if (!state.book) {
          await ctx.reply('❌ Помилка: дані книги відсутні');
          return ctx.scene.leave();
        }

        await ctx.replyWithPhoto(photo.file_id, {
          caption:
            '<b>📝 Редагування книги</b>\n\n' +
            `📖 ${state.book.title}\n` +
            `👤 ${state.book.author}\n\n` +
            '✅ Нове фото обкладинки збережено!\n\n' +
            'Оберіть що хочете змінити або збережіть зміни:',
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Назва', 'edit_title')],
            [Markup.button.callback('✏️ Автор', 'edit_author')],
            [Markup.button.callback('✏️ Жанр', 'edit_genre')],
            [Markup.button.callback('✏️ Опис', 'edit_description')],
            [Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
            [Markup.button.callback('✅ Доступність', 'edit_availability')],
            [Markup.button.callback('💾 Зберегти', 'save_changes')],
            [Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
            [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
          ]).reply_markup,
        });
        return;
      } else if (ctx.message && 'text' in ctx.message) {
        // Якщо надіслано текст замість фото
        await ctx.reply('❌ Будь ласка, надішліть фото (не текст) або /skip для пропуску');
        return;
      } else {
        await ctx.reply('❌ Будь ласка, надішліть фото або /skip для пропуску');
        return;
      }
    }

    // Обробка текстових полів
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('❌ Будь ласка, надішліть текст');
      return;
    }

    const newValue = ctx.message.text;

    // Валідація
    if (newValue.length < 2) {
      await ctx.reply('❌ Значення занадто коротке. Спробуйте ще раз:');
      return;
    }

    // ✅ ВИДАЛЕНО: Ограничение на описание больше не применяется (было 500 символов)
    // Опис тепер може бути довільної довжини

    // Зберігаємо зміну
    state.updates = state.updates || {};
    // ✅ ВИПРАВЛЕНО #11: Перевірка що editingField існує перед використанням як ключ
    if (state.editingField) {
      state.updates[state.editingField] = newValue;
    }

    // ✅ ВИПРАВЛЕНО: Повертаємось до меню редагування замість простого повідомлення
    await ctx.answerCbQuery?.();
    
    // Повертаємося на крок 0 (меню редагування)
    ctx.wizard.selectStep(0);

    // Показуємо меню редагування з оновленою інформацією
    if (!state.book) {
      await ctx.reply('❌ Помилка: дані книги відсутні');
      return ctx.scene.leave();
    }

    await ctx.reply(
      '<b>📝 Редагування книги</b>\n\n' +
        `📖 ${state.book.title}\n` +
        `👤 ${state.book.author}\n\n` +
        `✅ Поле "${state.editingField}" оновлено\n\n` +
        'Оберіть що хочете змінити або збережіть зміни:',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('✏️ Назва', 'edit_title')],
          [Markup.button.callback('✏️ Автор', 'edit_author')],
          [Markup.button.callback('✏️ Жанр', 'edit_genre')],
          [Markup.button.callback('✏️ Опис', 'edit_description')],
          [Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
          [Markup.button.callback('✅ Доступність', 'edit_availability')],
          [Markup.button.callback('💾 Зберегти', 'save_changes')],
          [Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
          [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
        ]).reply_markup,
      }
    );
    return;
  }
);

export default editBookScene;
