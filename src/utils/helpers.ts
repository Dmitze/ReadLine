import { Book } from '../database/models';
import { getBookTags } from '../database/tagFunctions';

// Format book caption for display with beautiful emojis
export const formatBookCaption = async (book: Book): Promise<string> => {
  // Заголовок з рамкою
  let caption = `╔═══════════════════════╗\n`;
  caption += `📖 *${book.title}*\n`;
  caption += `╚═══════════════════════╝\n\n`;
  
  // Автор з емодзі
  caption += `✍️ *Автор:* ${book.author}\n`;
  
  // Жанр з кольоровим емодзі
  const genreEmoji = getGenreEmoji(book.genre);
  caption += `${genreEmoji} *Жанр:* ${book.genre}\n`;
  
  // Теги
  if (book.id) {
    try {
      const tags = await getBookTags(book.id);
      if (tags.length > 0) {
        const tagNames = tags.map(t => `#${t.name.replace(/\s+/g, '_')}`).join(' ');
        caption += `🏷️ *Теги:* ${tagNames}\n`;
      }
    } catch (error) {
      // Ігноруємо помилки з тегами
    }
  }
  caption += `\n`;
  
  // Рейтинг з зірками
  if (book.rating && book.rating > 0) {
    const fullStars = Math.floor(book.rating);
    const halfStar = book.rating % 1 >= 0.5 ? '⭐' : '';
    const stars = '⭐'.repeat(fullStars) + halfStar;
    const emptyStars = '☆'.repeat(5 - Math.ceil(book.rating));
    caption += `${stars}${emptyStars} *${book.rating.toFixed(1)}/5*`;
    if (book.reviews_count && book.reviews_count > 0) {
      caption += ` 💬 ${book.reviews_count} ${getReviewsWord(book.reviews_count)}`;
    }
    caption += `\n\n`;
  }
  
  // Опис
  caption += `📝 *Опис:*\n${book.description}\n\n`;
  
  // Розділювач
  caption += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Доступні формати з красивими іконками
  const availableFormats: string[] = [];
  
  if ((book as any).pdf_file_id || (book.file_type === 'file' && book.file_url)) {
    availableFormats.push('📄 PDF');
  }
  
  if ((book as any).external_link || (book.file_type === 'link' && book.file_url)) {
    availableFormats.push('🌐 Онлайн');
  }
  
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
  
  if (availableFormats.length > 0) {
    caption += `📦 *Доступні формати:*\n`;
    availableFormats.forEach(format => {
      caption += `   ${format}\n`;
    });
    caption += `\n`;
  }
  
  // Диктор для аудіокниг
  if ((book as any).narrator) {
    caption += `🎙️ *Читає:* ${(book as any).narrator}\n\n`;
  }
  
  // Статистика
  if (book.downloads_count && book.downloads_count > 0) {
    caption += `📊 *Популярність:* ${book.downloads_count} ${getDownloadsWord(book.downloads_count)}\n`;
  }
  
  // Статус з кольоровим індикатором
  caption += `\n${book.is_available ? '🟢 *Доступна*' : '🔴 *Недоступна*'}`;
  
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

// Format request info for admin
export const formatRequestInfo = (request: any, book: Book): string => {
  let info = `📋 Заявка #${request.id}\n`;
  info += `📖 Книга: ${book.title}\n`;
  info += `👤 ПІБ: ${request.full_name}\n`;
  info += `🎯 Підрозділ: ${request.unit}\n`;
  info += `📞 Телефон: ${request.phone}\n`;
  info += `📅 Дата: ${request.created_at}`;
  
  return info;
};

export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
