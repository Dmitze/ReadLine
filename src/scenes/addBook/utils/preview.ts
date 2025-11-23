import { Markup } from 'telegraf';
import { BotContext, WizardState } from '../../../types/telegraf';
import { getCachedTags } from './cache';
import { getProgress } from './progress';

export async function showFormatSelection(ctx: BotContext): Promise<void> {
  const state = ctx.wizard?.state as WizardState;
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return;
  }

  const hasFile = !!state.bookFile;
  const hasAudio = !!state.bookAudio;
  const hasLink = !!state.bookLink;

  const MAX_FORMATS = 3;
  const currentFormats = (hasFile ? 1 : 0) + (hasAudio ? 1 : 0) + (hasLink ? 1 : 0);

  if (currentFormats >= MAX_FORMATS) {
    await ctx.reply(
      `✅ Додано максимальну кількість форматів (${MAX_FORMATS}). Переходимо до тегів...`
    );
    await proceedToTags(ctx);
    return;
  }

  const addedFormats = [];
  if (hasFile) addedFormats.push('📄 Файл');
  if (hasAudio) addedFormats.push('🎧 Аудіо');
  if (hasLink) addedFormats.push('🌐 Посилання');

  const availableFormats = [];
  if (!hasFile)
    availableFormats.push([{ text: '📄 Додати файл книги', callback_data: `add_more_file_${userId}` }]);
  if (!hasAudio)
    availableFormats.push([{ text: '🎧 Додати аудіофайл', callback_data: `add_more_audio_${userId}` }]);
  if (!hasLink)
    availableFormats.push([{ text: '🌐 Додати посилання', callback_data: `add_more_link_${userId}` }]);

  if (availableFormats.length > 0) {
    availableFormats.push([{ text: '✅ Далі до тегів', callback_data: `skip_more_formats_${userId}` }]);

    await ctx.reply(
      `✅ Додано: ${addedFormats.join(', ') || 'поки нічого'}\n\n` + 'Хочете додати ще формати?',
      {
        reply_markup: { inline_keyboard: availableFormats },
      }
    );
  } else {
    await ctx.reply('✅ Всі формати додано! Переходимо до тегів...');
    await proceedToTags(ctx);
  }
}

export async function proceedToTags(ctx: BotContext): Promise<void> {
  const state = ctx.wizard?.state as WizardState;
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return;
  }

  const allTags = await getCachedTags();
  if (allTags.length > 0) {
    const tagButtons = [];
    for (let i = 0; i < allTags.length; i += 2) {
      const row = [Markup.button.callback(allTags[i].name, `preview_tag_${allTags[i].id}_${userId}`)];
      if (i + 1 < allTags.length) {
        row.push(Markup.button.callback(allTags[i + 1].name, `preview_tag_${allTags[i + 1].id}_${userId}`));
      }
      tagButtons.push(row);
    }

    tagButtons.push([
      Markup.button.callback('✅ Далі (без тегів)', `preview_skip_tags_${userId}`),
      Markup.button.callback('❌ Скасувати', `cancel_add_${userId}`),
    ]);

    if (!state.selectedTags) {
      state.selectedTags = [];
    }

    await ctx.reply(
      `${getProgress(8)}\n🏷️ <b>Додайте теги до книги (опціонально):</b>\n\n` +
        'Оберіть один або кілька тегів, які підходять до цієї книги.\n' +
        'Натисніть "Далі" коли закінчите або щоб пропустити цей крок.',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(tagButtons).reply_markup,
      }
    );
  } else {
    state.selectedTags = [];
    await showBookPreview(ctx);
  }
}

export async function showBookPreview(ctx: BotContext): Promise<void> {
  const state = ctx.wizard?.state as WizardState;
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return;
  }

  const bookData: any = {
    title: state.title,
    author: state.author,
    genre: state.genre,
    description: state.description,
    photo_file_id: state.photoFileId || 'default_book_cover',
  };

  let tagsText = '';
  if (state.selectedTags && state.selectedTags.length > 0) {
    const allTags = await getCachedTags();
    const selectedTagNames = state.selectedTags
      .map((tagId) => allTags.find((t) => t.id === tagId)?.name)
      .filter(Boolean)
      .join(', ');
    tagsText = `\n🏷️ Теги: ${selectedTagNames}`;
  }

  const formats = [];
  if (state.bookFile) formats.push('📄 Файл для завантаження');
  if (state.bookAudio) formats.push('🎧 Аудіокнига');
  if (state.bookLink) formats.push('🔗 Онлайн-посилання');

  const formatsText =
    formats.length > 0 ? '\n\n' + formats.join('\n') : '\n\n📖 Тільки фізична копія';

  const previewText = `
📖 *${bookData.title}*
👤 ${bookData.author}
📚 ${bookData.genre}
📝 ${bookData.description}${tagsText}${formatsText}
  `.trim();

  const previewKeyboard = [
    [{ text: '✏️ Редагувати назву', callback_data: `edit_title_${userId}` }],
    [{ text: '✏️ Редагувати автора', callback_data: `edit_author_${userId}` }],
    [{ text: '✏️ Редагувати опис', callback_data: `edit_description_${userId}` }],
    [{ text: '✏️ Редагувати фото', callback_data: `edit_photo_${userId}` }],
    [{ text: '✏️ Редагувати формати', callback_data: `edit_formats_${userId}` }],
    [
      { text: '✅ Підтвердити і опублікувати', callback_data: `confirm_book_${userId}` },
      { text: '❌ Скасувати', callback_data: `cancel_book_${userId}` },
    ],
  ];

  if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
    await ctx.replyWithPhoto(bookData.photo_file_id, {
      caption: previewText + '\n\n💡 Перевірте всі дані перед публікацією',
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: previewKeyboard },
    });
  } else {
    await ctx.reply(previewText + '\n\n💡 Перевірте всі дані перед публікацією', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: previewKeyboard },
    });
  }
}
