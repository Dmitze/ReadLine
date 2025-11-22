import { BotContext, WizardState } from '../../types/telegraf';
import { logger } from '../../utils/logger';

// Прогрес бар для кроків
export function getProgress(step: number): string {
  const totalSteps = 10; // Оновлено: тепер 10 кроків (додано фізична наявність)
  const filled = '█'.repeat(step);
  const empty = '░'.repeat(totalSteps - step);
  return `[${filled}${empty}] ${step}/${totalSteps} кроків`;
}

// Приклади для користувача
export const examples = {
  title: '💡 <i>Приклад: "Кобзар", "Тіні забутих предків"</i>',
  author: '💡 <i>Приклад: "Тарас Шевченко", "Михайло Коцюбинський"</i>',
  description:
    '💡 <i>Приклад: "Збірка поезій великого українського поета. Включає найвідоміші твори про свободу, любов та боротьбу українського народу."</i>',
  link: '💡 <i>Приклад: https://example.com/book.pdf</i>',
};

// Популярні жанри
export const popularGenres = [
  'Художня література',
  'Наукова література',
  'Історія',
  'Філософія',
  'Поезія',
  'Детектив',
  'Фантастика',
  'Біографія',
];

// Інші жанри
export const otherGenres = [
  'Пригоди',
  'Роман',
  'Драма',
  'Комедія',
  'Трилер',
  'Містика',
  'Фентезі',
  'Класика',
  'Психологія',
  'Економіка',
  'Політика',
  'Мемуари',
  'Есе',
  'Публіцистика',
  'Довідник',
  'Енциклопедія',
];

// Логування дій користувача
export function logUserAction(ctx: BotContext, action: string, data?: Record<string, unknown>) {
  if (ctx.from?.id) {
    logger.userAction(ctx.from.id, action, data);
  }
}

// Автозбереження стану
export function autoSaveState(state: WizardState) {
  // Можна додати логіку збереження в Redis або файл
  logger.debug('State auto-saved', state);
}

// Кешовані теги
let cachedTags: Array<{ id: number; name: string }> | null = null;

export async function getCachedTags(): Promise<Array<{ id: number; name: string }>> {
  if (cachedTags) {
    return cachedTags;
  }

  const { getAllTags } = await import('../../database/tagFunctions');
  cachedTags = await getAllTags();
  return cachedTags;
}

// Показати вибір формату
export async function showFormatSelection(ctx: BotContext, state: WizardState) {
  await ctx.reply(`${getProgress(6)}\n📎 Оберіть тип книги:`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📄 Файл (PDF, EPUB, FB2)', callback_data: 'format_file' },
          { text: '🎧 Аудіокнига', callback_data: 'format_audio' },
        ],
        [
          { text: '🌐 Онлайн посилання', callback_data: 'format_link' },
          { text: '📚 Тільки фізична', callback_data: 'format_physical' },
        ],
      ],
    },
  });
}

// Перейти до тегів
export async function proceedToTags(ctx: BotContext) {
  const tags = await getCachedTags();

  const keyboard = tags.map((tag) => [
    {
      text: tag.name,
      callback_data: `tag_${tag.id}`,
    },
  ]);

  keyboard.push([{ text: '✅ Далі', callback_data: 'preview_skip_tags' }]);

  await ctx.reply(`${getProgress(8)}\n🏷️ Додайте теги до книги (опціонально):`, {
    reply_markup: { inline_keyboard: keyboard },
  });
}

// Показати попередній перегляд книги
export async function showBookPreview(ctx: BotContext, state: WizardState) {
  const { getAllTags } = await import('../../database/tagFunctions');

  try {
    const tags = await getAllTags();
    const selectedTags = state.selectedTags || [];
    const tagNames = tags
      .filter((t) => selectedTags.includes(t.id))
      .map((t) => `#${t.name}`)
      .join(' ');

    const tagsText = tagNames ? `\n🏷️ <b>Теги:</b> ${tagNames}` : '';

    // Формати доступності
    const formats = [];
    if (state.bookFile) {
      formats.push('📥 Завантажити');
    }
    if (state.bookAudio) {
      formats.push('🎧 Слухати');
    }
    if (state.bookLink) {
      formats.push('🔗 Читати онлайн');
    }

    const formatsText = formats.length > 0 ? `\n\n📎 <b>Доступно:</b> ${formats.join(' • ')}` : '';

    // Статус фізичної наявності
    const physicalStatus = state.is_physically_available
      ? '\n\n📦 <b>ФІЗИЧНА НАЯВНІСТЬ:</b>\n✅ Книга є в бібліотеці Галичини\n📍 Можна замовити для отримання'
      : '\n\n📦 <b>ФІЗИЧНА НАЯВНІСТЬ:</b>\n❌ Тільки електронна версія';

    const preview =
      `${getProgress(10)}\n\n` +
      '📖 <b>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</b>\n\n' +
      `<b>${state.title}</b>\n` +
      `👤 <i>${state.author}</i>\n` +
      `📚 ${state.selectedGenres?.join(', ')}\n\n` +
      `📝 ${state.description}${tagsText}${formatsText}${physicalStatus}\n\n` +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      'Все вірно?';

    await ctx.reply(preview, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Опублікувати', callback_data: 'confirm_book' },
            { text: '❌ Скасувати', callback_data: 'cancel_book' },
          ],
          [
            { text: '✏️ Назва', callback_data: 'edit_title' },
            { text: '✏️ Автор', callback_data: 'edit_author' },
          ],
          [{ text: '✏️ Опис', callback_data: 'edit_description' }],
        ],
      },
    });
  } catch (error) {
    logger.error('Error showing book preview:', error as Error);
    await ctx.reply('❌ Помилка при показі попереднього перегляду');
  }
}

// Обробка завантаження файлів
export async function handleFileUpload(
  ctx: BotContext,
  uploadCallback: () => Promise<void>
): Promise<boolean> {
  try {
    await uploadCallback();
    logger.info('File upload successful', { userId: ctx.from?.id });
    return true;
  } catch (error) {
    logger.error('File upload failed', error as Error, { userId: ctx.from?.id });
    return false;
  }
}
