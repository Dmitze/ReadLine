import { Book } from '../database/models';
import { BotContext } from '../types/telegraf';

/**
 * Safe parseInt function with NaN validation
 * Prevents SQL injection and logical errors from malformed input
 */
export function safeParseInt(value: string | number, defaultValue: number = 0): number {
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safe parseFloat function with NaN validation
 */
export function safeParseFloat(value: string | number, defaultValue: number = 0): number {
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Format book caption for display with beautiful emojis and detailed information
 * @param book - Book object to format
 * @param tags - Optional pre-loaded tags to avoid additional database query
 * @returns Formatted HTML caption string for Telegram message
 */
export const formatBookCaption = async (
  book: Book,
  tags?: Array<{ name: string }>
): Promise<string> => {
  // Екрануємо HTML спецсимволи та видаляємо проблемні символи
  const escapeHtml = (text: string) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Видаляємо control characters
      .replace(/�/g, ''); // Видаляємо replacement character
  };

  const safeTitle = escapeHtml(book.title);
  const safeAuthor = escapeHtml(book.author);
  const safeGenre = escapeHtml(book.genre);
  const safeDescription = escapeHtml(book.description);

  // Красивий заголовок (БЕЗ ID тут, він буде в кінці)
  let caption = '━━━━━━━━━━━━━━━━━━━━━\n';
  caption += `📖 <b>${safeTitle}</b>\n`;
  caption += '━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Автор
  caption += `👤 <b>Автор:</b> ${safeAuthor}\n`;

  // Жанр
  const genreEmoji = getGenreEmoji(book.genre);
  caption += `${genreEmoji} <b>Жанр:</b> ${safeGenre}\n`;

  // Теги - використовуємо передані або завантажуємо
  if (tags) {
    if (tags.length > 0) {
      const tagNames = tags.map((t) => `#${escapeHtml(t.name.replace(/\s+/g, '_'))}`).join(' ');
      caption += `🏷️ <b>Теги:</b> ${tagNames}\n`;
    }
  } else if (book.id) {
    try {
      const { getBookTags } = await import('../database/tagFunctions');
      const loadedTags = await getBookTags(book.id);
      if (loadedTags && loadedTags.length > 0) {
        const tagNames = loadedTags
          .map((t) => `#${escapeHtml(t.name.replace(/\s+/g, '_'))}`)
          .join(' ');
        caption += `🏷️ <b>Теги:</b> ${tagNames}\n`;
      }
    } catch (error) {
      const { logger } = await import('./logger');
      logger.error(
        'Error loading tags in formatBookCaption',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  caption += '\n';

  // Рейтинг з зірками
  if (book.rating && book.rating > 0) {
    const fullStars = Math.floor(book.rating);
    const halfStar = book.rating % 1 >= 0.5 ? '⭐' : '';
    const stars = '⭐'.repeat(fullStars) + halfStar;
    const emptyStars = '☆'.repeat(5 - Math.ceil(book.rating));
    caption += `⭐ <b>Рейтинг:</b> ${stars}${emptyStars} <b>${book.rating.toFixed(1)}/5</b>`;
    if (book.reviews_count && book.reviews_count > 0) {
      caption += ` (${book.reviews_count} ${getReviewsWord(book.reviews_count)})`;
    }
    caption += '\n\n';
  } else {
    caption += '⭐ <b>Рейтинг:</b> Ще не оцінена\n\n';
  }

  // ✅ НОВЕ: Розширена інформація про книгу (розподіл рейтингів, вікові обмеження, варнінги)
  if (book.id) {
    try {
      const { getBookDetailedStats } = await import('../database/models');
      const stats = await getBookDetailedStats(book.id);

      // Розподіл рейтингів
      if (stats && stats.rating_distribution && stats.rating_distribution.percentages) {
        const { percentages } = stats.rating_distribution;
        caption += '📊 <b>Розподіл оцінок:</b>\n';
        caption += `   5⭐ ${percentages.rating_5_percent.toFixed(0)}%  4⭐ ${percentages.rating_4_percent.toFixed(0)}%  3⭐ ${percentages.rating_3_percent.toFixed(0)}%\n`;
        caption += `   2⭐ ${percentages.rating_2_percent.toFixed(0)}%  1⭐ ${percentages.rating_1_percent.toFixed(0)}%\n\n`;
      }

      // Вікове обмеження
      if (stats && stats.recommended_age && stats.recommended_age > 0) {
        const ageLabel = getAgeLabel(stats.recommended_age);
        caption += `🔞 <b>Вік:</b> ${ageLabel}\n`;
      }

      // Тригери вмісту (варнінги)
      if (stats && stats.content_warnings && stats.content_warnings.length > 0) {
        const warnings = Array.isArray(stats.content_warnings)
          ? stats.content_warnings
          : typeof stats.content_warnings === 'string'
            ? JSON.parse(stats.content_warnings)
            : [];
        if (warnings.length > 0) {
          caption += `⚠️ <b>Варнінги:</b> ${warnings.map((w: string) => getWarningLabel(w)).join(', ')}\n`;
        }
      }

      caption += '\n';
    } catch (error) {
      const { logger } = await import('./logger');
      logger.error(
        'Error loading extended book info in formatBookCaption',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Опис
  caption += `📝 <b>Опис:</b>\n${safeDescription}\n\n`;

  // Розділювач
  caption += '━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Доступні формати з красивими іконками
  const availableFormats: string[] = [];

  // Перевіряємо файл книги (PDF/EPUB)
  if (book.pdf_file_id || (book.file_url && book.file_type === 'file')) {
    availableFormats.push('📄 PDF');
  }

  // Перевіряємо аудіо
  if (book.audio_file_id) {
    let audioText = '🎧 Аудіо';
    if (book.audio_duration) {
      const hours = Math.floor(book.audio_duration / 3600);
      const minutes = Math.floor((book.audio_duration % 3600) / 60);
      if (hours > 0) {
        audioText += ` ⏱️ ${hours}г ${minutes}хв`;
      } else {
        audioText += ` ⏱️ ${minutes}хв`;
      }
    }
    availableFormats.push(audioText);
  }

  // Перевіряємо онлайн-посилання
  if (book.online_link || book.external_link || (book.file_url && book.file_type === 'link')) {
    availableFormats.push('🌐 Онлайн');
  }

  if (availableFormats.length > 0) {
    caption += '📦 <b>Доступні формати:</b>\n';
    availableFormats.forEach((format) => {
      caption += `   ${format}\n`;
    });
    caption += '\n';
  }

  // Фізична наявність
  const physicalAvailable = (book as Book & { is_physically_available?: boolean }).is_physically_available;
  if (physicalAvailable) {
    caption += '📚 <b>ФІЗИЧНА НАЯВНІСТЬ:</b>\n';
    caption += '   ✅ Книга є в бібліотеці Галичини\n';
    caption += '   📍 Можна замовити для отримання\n\n';
  } else {
    caption += '📚 <b>ФІЗИЧНА НАЯВНІСТЬ:</b>\n';
    caption += '   ❌ Тільки електронна версія\n\n';
  }

  // Диктор для аудіокниг
  if (book.narrator) {
    const safeNarrator = escapeHtml(book.narrator);
    caption += `🎙️ <b>Читає:</b> ${safeNarrator}\n\n`;
  }

  // Статистика
  if (book.downloads_count && book.downloads_count > 0) {
    caption += `📊 <b>Популярність:</b> ${book.downloads_count} ${getDownloadsWord(book.downloads_count)}\n`;
  }

  // Статус з кольоровим індикатором
  caption += `\n${book.is_available ? '🟢 <b>Доступна</b>' : '🔴 <b>Недоступна</b>'}`;

  // ID книги в кінці (маленьким шрифтом)
  if (book.id) {
    caption += `\n\n<i>ID: ${book.id}</i>`;
  }

  return caption;
};

/**
 * Get emoji for book genre
 * @param genre - Book genre name
 * @returns Emoji string for the genre
 */
function getGenreEmoji(genre: string): string {
  const genreMap: { [key: string]: string } = {
    Фантастика: '🚀',
    Детектив: '🔍',
    Роман: '💕',
    Історична: '📜',
    Пригоди: '🗺️',
    Фентезі: '🐉',
    Наукова: '🔬',
    Біографія: '👤',
    Поезія: '✨',
    Класика: '📚',
    Трилер: '😱',
    Містика: '🔮',
    Драма: '🎭',
    Комедія: '😄',
    Філософія: '🤔',
  };

  return genreMap[genre] || '📖';
}

// ✅ НОВЕ: Отримати мітку вікового обмеження
/**
 * Get age restriction label for book
 * @param age - Minimum age for the book
 * @returns Formatted age label with emoji
 */
function getAgeLabel(age: number): string {
  const ageMap: { [key: number]: string } = {
    0: '✅ Для всіх',
    6: '🟢 6+',
    12: '🟡 12+',
    16: '🟠 16+',
    18: '🔴 18+',
  };
  return ageMap[age] || 'Невідомо';
}

// ✅ НОВЕ: Отримати мітку для варнінгу вмісту
/**
 * Get content warning label for book
 * @param warning - Warning type identifier
 * @returns Human-readable warning label
 */
function getWarningLabel(warning: string): string {
  const warningMap: { [key: string]: string } = {
    violence: 'Насильство',
    explicit_content: 'Експліцитний контент',
    sexual_scenes: 'Сексуальні сцени',
    mature_themes: 'Дорослі теми',
    strong_language: 'Грубе мовлення',
    psychological_horror: 'Психологічний жах',
    substance_abuse: 'Зловживання',
    child_abuse: 'Насильство над дітьми',
    discrimination: 'Дискримінація',
    self_harm: 'Самозалік',
  };
  return warningMap[warning] || warning;
}

// Правильне відмінювання слова "відгук"
/**
 * Get correct Ukrainian plural form for "review"
 * @param count - Number of reviews
 * @returns Correctly declined word
 */
function getReviewsWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'відгук';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
    return 'відгуки';
  return 'відгуків';
}

// Правильне відмінювання слова "завантаження"
/**
 * Get correct Ukrainian plural form for "download"
 * @param count - Number of downloads
 * @returns Correctly declined word
 */
function getDownloadsWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'завантаження';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
    return 'завантаження';
  return 'завантажень';
}

/**
 * Escape HTML special characters to prevent XSS
 * @param text - Text to escape
 * @returns HTML-safe text
 */
export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Get book ID as formatted text for caption insertion
 * @param bookId - Book ID number
 * @returns Formatted ID text or empty string if no ID
 */
export const getBookIdText = (bookId?: number): string => {
  if (!bookId) return '';
  return `\n🆔 ID: <code>${bookId}</code>`;
};

/**
 * Show animated loading message
 * @param ctx - Bot context
 * @param message - Loading message text
 * @returns Message ID for later updates
 */
export async function showLoadingAnimation(ctx: BotContext, message: string): Promise<number> {
  const loadingMsg = await ctx.reply(`⏳ ${message}...`);
  return loadingMsg.message_id;
}

/**
 * Update loading message with new text
 * @param ctx - Bot context
 * @param messageId - ID of message to update
 * @param newText - New message text
 * @param emoji - Emoji to prepend to message
 */
export async function updateLoadingMessage(
  ctx: BotContext,
  messageId: number,
  newText: string,
  emoji: string = '✅'
): Promise<void> {
  try {
    await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, `${emoji} ${newText}`);
  } catch (error) {
    // Ignore edit errors
  }
}

/**
 * Create visual progress bar string
 * @param current - Current progress value
 * @param total - Total progress value
 * @returns Progress bar string with filled/empty circles
 */
export function createProgressBar(current: number, total: number): string {
  const filled = Math.round((current / total) * 5);
  const empty = 5 - filled;
  return '⬤'.repeat(filled) + '○'.repeat(empty);
}

/**
 * Format step progress with progress bar and step name
 * @param currentStep - Current step number (1-based)
 * @param totalSteps - Total number of steps
 * @param stepName - Name/description of current step
 * @returns Formatted progress string
 */
export function formatStepProgress(
  currentStep: number,
  totalSteps: number,
  stepName: string
): string {
  const progress = createProgressBar(currentStep, totalSteps);
  return `📍 Крок ${currentStep} з ${totalSteps} ${progress}\n\n${stepName}`;
}
