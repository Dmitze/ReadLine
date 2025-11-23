import { BotContext, WizardState } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { MemoryCache } from '../../cache/MemoryCache';
import { RateLimiter } from '../../middleware/RateLimiter';
import { LIMITS } from '../../constants/limits';

// Прогрес бар для кроків
export function getProgress(step: number): string {
  const totalSteps = LIMITS.ADD_BOOK_STEPS_TOTAL; // 8 кроків: назва, автор, жанр, опис, фото, тип, теги, фізична наявність, підтвердження
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

// ✅ Кешовані теги з TTL
const tagsCache = new MemoryCache(5 * 60 * 1000); // 5 хвилин TTL

// ✅ Rate limiter для завантаження файлів
const fileUploadLimiter = new RateLimiter({
  windowMs: 60000, // 1 хвилина
  maxRequests: 5, // 5 файлів на хвилину
  keyGenerator: (ctx) => `file_upload:${ctx.from?.id || 'unknown'}`,
});

export async function getCachedTags(): Promise<Array<{ id: number; name: string }>> {
  return tagsCache.getOrSet('all_tags', async () => {
    const { getAllTags } = await import('../../database/tagFunctions');
    return await getAllTags();
  });
}

// ✅ Функція для інвалідації кеша тегів
export function invalidateTagsCache(): void {
  tagsCache.delete('all_tags');
  logger.debug('Tags cache invalidated');
}

// Показати вибір формату (без прогрес бару, бо це не окремий крок)
export async function showFormatSelection(ctx: BotContext, _state: WizardState) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return;
  }

  await ctx.reply('📎 Оберіть тип книги:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📄 Файл (PDF, EPUB, FB2)', callback_data: `type_file_${userId}` },
          { text: '🎧 Аудіокнига', callback_data: `type_audio_${userId}` },
        ],
        [
          { text: '🌐 Онлайн посилання', callback_data: `type_link_${userId}` },
          { text: '📚 Тільки фізична', callback_data: `type_physical_${userId}` },
        ],
      ],
    },
  });
}

// Перейти до тегів
export async function proceedToTags(ctx: BotContext) {
  const tags = await getCachedTags();
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply('❌ Не вдалося ідентифікувати користувача');
    return;
  }

  const keyboard = tags.map((tag) => [
    {
      text: tag.name,
      callback_data: `tag_${tag.id}_${userId}`,
    },
  ]);

  keyboard.push([{ text: '✅ Далі', callback_data: `preview_skip_tags_${userId}` }]);

  await ctx.reply(`${getProgress(8)}\n🏷️ Додайте теги до книги (опціонально):`, {
    reply_markup: { inline_keyboard: keyboard },
  });
}

// Показати попередній перегляд книги
export async function showBookPreview(ctx: BotContext, state: WizardState) {
  const { getAllTags } = await import('../../database/tagFunctions');
  const { escapeHtml } = await import('../../utils/helpers');

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return;
  }

  try {
    const tags = await getAllTags();
    const selectedTags = state.selectedTags || [];
    const tagNames = tags
      .filter((t) => selectedTags.includes(t.id))
      .map((t) => `#${escapeHtml(t.name)}`)  // ✅ Екрануємо HTML
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

    // ✅ Екрануємо всі user input від XSS
    const safeTitle = escapeHtml(state.title || 'Невідома назва');
    const safeAuthor = escapeHtml(state.author || 'Невідомий автор');
    const safeGenres = state.selectedGenres?.map(g => escapeHtml(g)).join(', ') || 'Невідомий жанр';
    const safeDescription = escapeHtml(state.description || 'Без опису');

    const preview =
      `${getProgress(8)}\n\n` +
      '📖 <b>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</b>\n\n' +
      `<b>${safeTitle}</b>\n` +
      `👤 <i>${safeAuthor}</i>\n` +
      `📚 ${safeGenres}\n\n` +
      `📝 ${safeDescription}${tagsText}${formatsText}${physicalStatus}\n\n` +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      'Все вірно?';

    await ctx.reply(preview, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Опублікувати', callback_data: `confirm_book_${userId}` },
            { text: '❌ Скасувати', callback_data: `cancel_book_${userId}` },
          ],
          [
            { text: '✏️ Назва', callback_data: `edit_title_${userId}` },
            { text: '✏️ Автор', callback_data: `edit_author_${userId}` },
          ],
          [{ text: '✏️ Опис', callback_data: `edit_description_${userId}` }],
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
  // ✅ Перевірка rate limiting для завантаження файлів
  const { allowed } = await fileUploadLimiter.check(ctx);
  if (!allowed) {
    await ctx.reply('❌ Занадто багато завантажень файлів. Зачекайте хвилину та спробуйте ще раз.');
    logger.warn('File upload rate limited', { userId: ctx.from?.id });
    return false;
  }

  try {
    await uploadCallback();
    logger.info('File upload successful', { userId: ctx.from?.id });
    return true;
  } catch (error) {
    logger.error('File upload failed', error as Error, { userId: ctx.from?.id });
    return false;
  }
}
