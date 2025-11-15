import { Book } from '../database/models';

// Format book caption for display with beautiful emojis
// ✅ ОПТИМІЗОВАНО: можна передати теги щоб уникнути додаткового запиту
export const formatBookCaption = async (book: Book, tags?: Array<{name: string}>): Promise<string> => {
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
  
  // Красивий заголовок
  let caption = `━━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `📖 <b>${safeTitle}</b>\n`;
  if (book.id) {
    caption += `🆔 ID: <code>${book.id}</code>\n`;
  }
  caption += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Автор
  caption += `👤 <b>Автор:</b> ${safeAuthor}\n`;
  
  // Жанр
  const genreEmoji = getGenreEmoji(book.genre);
  caption += `${genreEmoji} <b>Жанр:</b> ${safeGenre}\n`;
  
  // Теги - використовуємо передані або завантажуємо
  if (tags) {
    if (tags.length > 0) {
      const tagNames = tags.map(t => `#${escapeHtml(t.name.replace(/\s+/g, '_'))}`).join(' ');
      caption += `🏷️ <b>Теги:</b> ${tagNames}\n`;
    }
  } else if (book.id) {
    try {
      const { getBookTags } = await import('../database/tagFunctions');
      const loadedTags = await getBookTags(book.id);
      if (loadedTags && loadedTags.length > 0) {
        const tagNames = loadedTags.map(t => `#${escapeHtml(t.name.replace(/\s+/g, '_'))}`).join(' ');
        caption += `🏷️ <b>Теги:</b> ${tagNames}\n`;
      }
    } catch (error) {
      const { logger } = await import('./logger');
      logger.error('Error loading tags in formatBookCaption', error instanceof Error ? error : new Error(String(error)));
    }
  }
  caption += `\n`;
  
  // Рейтинг з зірками
  if (book.rating && book.rating > 0) {
    const fullStars = Math.floor(book.rating);
    const halfStar = book.rating % 1 >= 0.5 ? '⭐' : '';
    const stars = '⭐'.repeat(fullStars) + halfStar;
    const emptyStars = '☆'.repeat(5 - Math.ceil(book.rating));
    caption += `${stars}${emptyStars} <b>${book.rating.toFixed(1)}/5</b>`;
    if (book.reviews_count && book.reviews_count > 0) {
      caption += ` 💬 ${book.reviews_count} ${getReviewsWord(book.reviews_count)}`;
    }
    caption += `\n\n`;
  }
  
  // ✅ НОВЕ: Розширена інформація про книгу (розподіл рейтингів, вікові обмеження, варнінги)
  if (book.id) {
    try {
      const { getBookDetailedStats } = await import('../database/models');
      const stats = await getBookDetailedStats(book.id);
      
      // Розподіл рейтингів
      if (stats && stats.rating_distribution && stats.rating_distribution.percentages) {
        const { percentages } = stats.rating_distribution;
        caption += `📊 <b>Розподіл оцінок:</b>\n`;
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
        const warnings = Array.isArray(stats.content_warnings) ? stats.content_warnings : 
                        (typeof stats.content_warnings === 'string' ? JSON.parse(stats.content_warnings) : []);
        if (warnings.length > 0) {
          caption += `⚠️ <b>Варнінги:</b> ${warnings.map((w: string) => getWarningLabel(w)).join(', ')}\n`;
        }
      }
      
      caption += `\n`;
    } catch (error) {
      const { logger } = await import('./logger');
      logger.error('Error loading extended book info in formatBookCaption', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  // Опис
  caption += `📝 <b>Опис:</b>\n${safeDescription}\n\n`;
  
  // Розділювач
  caption += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Доступні формати з красивими іконками
  const availableFormats: string[] = [];
  
  // Перевіряємо файл книги (PDF/EPUB)
  if ((book as any).pdf_file_id || (book.file_url && book.file_type === 'file')) {
    availableFormats.push('📄 PDF');
  }
  
  // Перевіряємо аудіо
  if ((book as any).audio_file_id) {
    let audioText = '🎧 Аудіо';
    if ((book as any).audio_duration) {
      const hours = Math.floor((book as any).audio_duration / 3600);
      const minutes = Math.floor(((book as any).audio_duration % 3600) / 60);
      if (hours > 0) {
        audioText += ` ⏱️ ${hours}г ${minutes}хв`;
      } else {
        audioText += ` ⏱️ ${minutes}хв`;
      }
    }
    availableFormats.push(audioText);
  }
  
  // Перевіряємо онлайн-посилання
  if ((book as any).online_link || (book as any).external_link || (book.file_url && book.file_type === 'link')) {
    availableFormats.push('🌐 Онлайн');
  }
  
  if (availableFormats.length > 0) {
    caption += `📦 <b>Доступні формати:</b>\n`;
    availableFormats.forEach(format => {
      caption += `   ${format}\n`;
    });
    caption += `\n`;
  }
  
  // Диктор для аудіокниг
  if ((book as any).narrator) {
    const safeNarrator = escapeHtml((book as any).narrator);
    caption += `🎙️ <b>Читає:</b> ${safeNarrator}\n\n`;
  }
  
  // Статистика
  if (book.downloads_count && book.downloads_count > 0) {
    caption += `📊 <b>Популярність:</b> ${book.downloads_count} ${getDownloadsWord(book.downloads_count)}\n`;
  }
  
  // Статус з кольоровим індикатором
  caption += `\n${book.is_available ? '🟢 <b>Доступна</b>' : '🔴 <b>Недоступна</b>'}`;
  
  return caption;
};

// Емодзі для жанрів
function getGenreEmoji(genre: string): string {
  const genreMap: { [key: string]: string } = {
    'Фантастика': '🚀',
    'Детектив': '🔍',
    'Роман': '💕',
    'Історична': '📜',
    'Пригоди': '🗺️',
    'Фентезі': '🐉',
    'Наукова': '🔬',
    'Біографія': '👤',
    'Поезія': '✨',
    'Класика': '📚',
    'Трилер': '😱',
    'Містика': '🔮',
    'Драма': '🎭',
    'Комедія': '😄',
    'Філософія': '🤔'
  };
  
  return genreMap[genre] || '📖';
}

// ✅ НОВЕ: Отримати мітку вікового обмеження
function getAgeLabel(age: number): string {
  const ageMap: { [key: number]: string } = {
    0: '✅ Для всіх',
    6: '🟢 6+',
    12: '🟡 12+',
    16: '🟠 16+',
    18: '🔴 18+'
  };
  return ageMap[age] || 'Невідомо';
}

// ✅ НОВЕ: Отримати мітку для варнінгу вмісту
function getWarningLabel(warning: string): string {
  const warningMap: { [key: string]: string } = {
    'violence': 'Насильство',
    'explicit_content': 'Експліцитний контент',
    'sexual_scenes': 'Сексуальні сцени',
    'mature_themes': 'Дорослі теми',
    'strong_language': 'Грубе мовлення',
    'psychological_horror': 'Психологічний жах',
    'substance_abuse': 'Зловживання',
    'child_abuse': 'Насильство над дітьми',
    'discrimination': 'Дискримінація',
    'self_harm': 'Самозалік'
  };
  return warningMap[warning] || warning;
}

// Правильне відмінювання слова "відгук"
function getReviewsWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'відгук';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'відгуки';
  return 'відгуків';
}

// Правильне відмінювання слова "завантаження"
function getDownloadsWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'завантаження';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'завантаження';
  return 'завантажень';
}

export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// ✅ НОВЕ: Отримати ID як текст для вставки в caption
export const getBookIdText = (bookId?: number): string => {
  if (!bookId) return '';
  return `\n🆔 ID: <code>${bookId}</code>`;
};

/**
 *
 Animated loading messages
 */
export async function showLoadingAnimation(ctx: any, message: string): Promise<number> {
  const loadingMsg = await ctx.reply(`⏳ ${message}...`);
  return loadingMsg.message_id;
}

export async function updateLoadingMessage(ctx: any, messageId: number, newText: string, emoji: string = '✅'): Promise<void> {
  try {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      messageId,
      undefined,
      `${emoji} ${newText}`
    );
  } catch (error) {
    // Ignore edit errors
  }
}

/**
 * Progress indicator
 */
export function createProgressBar(current: number, total: number): string {
  const filled = Math.round((current / total) * 5);
  const empty = 5 - filled;
  return '⬤'.repeat(filled) + '○'.repeat(empty);
}

export function formatStepProgress(currentStep: number, totalSteps: number, stepName: string): string {
  const progress = createProgressBar(currentStep, totalSteps);
  return `📍 Крок ${currentStep} з ${totalSteps} ${progress}\n\n${stepName}`;
}
