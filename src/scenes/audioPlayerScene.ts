import { Scenes, Markup } from 'telegraf';
import { getBookById } from '../database/models';
import { 
  getBookChapters, 
  getListeningProgress, 
  saveListeningProgress,
  getChapterById
} from '../database/audioFunctions';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';

/**
 * Audio Player Scene - програвач аудіокниг
 * Підтримує відтворення аудіо, навігацію по главах, збереження прогресу
 */

const audioPlayerScene = new Scenes.BaseScene<BotContext>('AUDIO_PLAYER_SCENE');

// Вхід в сцену
audioPlayerScene.enter(async (ctx) => {
  try {
    const bookId = (ctx.scene as any).state?.bookId;
    
    if (!bookId) {
      await ctx.reply('❌ Помилка: не вказано ID книги');
      return ctx.scene.leave();
    }
    
    const book = await getBookById(bookId);
    
    if (!book) {
      await ctx.reply('❌ Книга не знайдена');
      return ctx.scene.leave();
    }
    
    if (!(book as any).audio_file_id) {
      await ctx.reply('❌ Ця книга не має аудіоверсії');
      return ctx.scene.leave();
    }
    
    // Перевіряємо чи є глави
    const chapters = await getBookChapters(bookId);
    const userId = ctx.from?.id;
    
    if (!userId) {
      await ctx.reply('❌ Не вдалося ідентифікувати користувача');
      return ctx.scene.leave();
    }
    
    // Отримуємо прогрес прослуховування
    const progress = await getListeningProgress(userId, bookId);
    
    if (chapters.length > 0) {
      // Книга має глави - показуємо список
      await showChaptersList(ctx, book, chapters, progress);
    } else {
      // Книга без глав - відправляємо одразу
      await playAudioBook(ctx, book, progress);
    }
    
  } catch (error) {
    logger.error('Error in audio player scene', error as Error, { userId: ctx.from?.id });
    await ctx.reply('❌ Виникла помилка при завантаженні аудіокниги');
    return ctx.scene.leave();
  }
});

// Показати список глав
async function showChaptersList(ctx: BotContext, book: any, chapters: any[], progress: any) {
  const currentChapter = progress?.chapter_id || chapters[0]?.id;
  
  let text = `🎧 *${book.title}*\n`;
  text += `👤 ${book.author}\n`;
  if ((book as any).narrator) {
    text += `🎙️ Читає: ${(book as any).narrator}\n`;
  }
  text += `\n📚 Оберіть главу:\n\n`;
  
  const keyboard: any[][] = [];
  
  for (const chapter of chapters) {
    const isCurrentChapter = chapter.id === currentChapter;
    const emoji = isCurrentChapter ? '▶️' : '📖';
    const duration = formatDuration(chapter.duration);
    
    keyboard.push([{
      text: `${emoji} ${chapter.chapter_number}. ${chapter.title} (${duration})`,
      callback_data: `play_chapter_${chapter.id}`
    }]);
  }
  
  keyboard.push([{ text: '⬅️ Назад', callback_data: 'back_to_book' }]);
  
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

// Відтворити аудіокнигу (без глав)
async function playAudioBook(ctx: BotContext, book: any, progress: any) {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  let caption = `🎧 *${book.title}*\n`;
  caption += `👤 ${book.author}\n`;
  if ((book as any).narrator) {
    caption += `🎙️ Читає: ${(book as any).narrator}\n`;
  }
  
  // Показуємо тривалість аудіо
  if ((book as any).audio_duration) {
    caption += `⏱️ Тривалість: ${formatDuration((book as any).audio_duration)}\n`;
  }
  
  if (progress) {
    const progressPercent = Math.round((progress.position / (book as any).audio_duration) * 100);
    caption += `\n📊 Прогрес: ${progressPercent}%\n`;
    caption += `⏱️ Прослухано: ${formatDuration(progress.total_listened)}\n`;
  }
  
  caption += `\n✅ Аудіокнига надіслана!`;
  caption += `\n\n💡 *Підказка:* Telegram автоматично стримить аудіо - ви можете слухати онлайн без повного завантаження!`;
  
  try {
    // Показуємо індикатор завантаження
    const loadingMsg = await ctx.reply('⏳ Завантаження аудіокниги...\n\n📡 Telegram стримить файл - ви зможете слухати одразу!');
    
    // Відправляємо аудіо
    await ctx.telegram.sendAudio(userId, (book as any).audio_file_id, {
      caption,
      parse_mode: 'Markdown',
      title: book.title,
      performer: book.author
    });
    
    // Видаляємо повідомлення про завантаження
    try {
      await ctx.telegram.deleteMessage(userId, loadingMsg.message_id);
    } catch {
      // Ігноруємо помилку видалення
    }
    
    // Зберігаємо що користувач почав слухати
    await saveListeningProgress({
      user_id: userId,
      book_id: book.id!,
      position: progress?.position || 0,
      total_listened: 0 // Буде оновлено коли користувач закінчить
    });
    
    await ctx.reply(
      '🎧 *Приємного прослуховування!*\n\n' +
      '💡 Ви можете:\n' +
      '• Слухати онлайн (streaming)\n' +
      '• Завантажити для офлайн прослуховування\n' +
      '• Перемотувати на будь-яку позицію\n' +
      '• Продовжити з місця зупинки',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Показати прогрес', callback_data: `progress_${book.id}` }],
            [{ text: '🔖 Зберегти позицію', callback_data: `save_position_${book.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'back_to_book' }]
          ]
        }
      }
    );
    
  } catch (error) {
    logger.error('Error sending audio', error as Error, { userId, bookId: book.id });
    await ctx.reply(
      '❌ *Помилка при відправці аудіофайлу*\n\n' +
      'Можливі причини:\n' +
      '• Файл занадто великий\n' +
      '• Проблеми з мережею\n' +
      '• Файл недоступний\n\n' +
      'Спробуйте пізніше або зверніться до адміністратора.',
      { parse_mode: 'Markdown' }
    );
  }
}

// Відтворити главу
audioPlayerScene.action(/play_chapter_(\d+)/, async (ctx) => {
  try {
    const chapterId = parseInt(ctx.match[1]);
    const chapter = await getChapterById(chapterId);
    
    if (!chapter) {
      await ctx.answerCbQuery('❌ Глава не знайдена');
      return;
    }
    
    const book = await getBookById(chapter.book_id);
    if (!book) {
      await ctx.answerCbQuery('❌ Книга не знайдена');
      return;
    }
    
    const userId = ctx.from?.id;
    if (!userId) return;
    
    let caption = `🎧 *${book.title}*\n`;
    caption += `📖 Глава ${chapter.chapter_number}: ${chapter.title}\n`;
    caption += `👤 ${book.author}\n`;
    if ((book as any).narrator) {
      caption += `🎙️ Читає: ${(book as any).narrator}\n`;
    }
    caption += `⏱️ Тривалість: ${formatDuration(chapter.duration)}\n`;
    caption += `\n✅ Глава надіслана!`;
    caption += `\n\n💡 Telegram стримить аудіо - слухайте онлайн!`;
    
    // Показуємо індикатор завантаження
    const loadingMsg = await ctx.reply('⏳ Завантаження глави...');
    
    await ctx.telegram.sendAudio(userId, chapter.file_id, {
      caption,
      parse_mode: 'Markdown',
      title: `${book.title} - Глава ${chapter.chapter_number}`,
      performer: book.author
    });
    
    // Видаляємо повідомлення про завантаження
    try {
      await ctx.telegram.deleteMessage(userId, loadingMsg.message_id);
    } catch {
      // Ігноруємо помилку видалення
    }
    
    // Зберігаємо прогрес
    await saveListeningProgress({
      user_id: userId,
      book_id: book.id!,
      chapter_id: chapter.id,
      position: 0,
      total_listened: 0
    });
    
    await ctx.answerCbQuery('✅ Глава надіслана');
    
    // Показуємо кнопки навігації
    const chapters = await getBookChapters(book.id!);
    const currentIndex = chapters.findIndex(ch => ch.id === chapter.id);
    const keyboard: any[][] = [];
    
    if (currentIndex > 0) {
      keyboard.push([{
        text: '⏮️ Попередня глава',
        callback_data: `play_chapter_${chapters[currentIndex - 1].id}`
      }]);
    }
    
    if (currentIndex < chapters.length - 1) {
      keyboard.push([{
        text: '⏭️ Наступна глава',
        callback_data: `play_chapter_${chapters[currentIndex + 1].id}`
      }]);
    }
    
    keyboard.push([
      { text: '📚 Всі глави', callback_data: `chapters_list_${book.id}` },
      { text: '⬅️ Назад', callback_data: 'back_to_book' }
    ]);
    
    await ctx.reply('🎧 Приємного прослуховування!', {
      reply_markup: { inline_keyboard: keyboard }
    });
    
  } catch (error) {
    logger.error('Error playing chapter', error as Error, { userId: ctx.from?.id });
    await ctx.answerCbQuery('❌ Помилка при відтворенні глави');
  }
});

// Показати список глав
audioPlayerScene.action(/chapters_list_(\d+)/, async (ctx) => {
  try {
    const bookId = parseInt(ctx.match[1]);
    const book = await getBookById(bookId);
    
    if (!book) {
      await ctx.answerCbQuery('❌ Книга не знайдена');
      return;
    }
    
    const chapters = await getBookChapters(bookId);
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const progress = await getListeningProgress(userId, bookId);
    
    await ctx.answerCbQuery();
    await showChaptersList(ctx, book, chapters, progress);
    
  } catch (error) {
    logger.error('Error showing chapters list', error as Error, { userId: ctx.from?.id });
    await ctx.answerCbQuery('❌ Помилка');
  }
});

// Показати прогрес
audioPlayerScene.action(/progress_(\d+)/, async (ctx) => {
  try {
    const bookId = parseInt(ctx.match[1]);
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const progress = await getListeningProgress(userId, bookId);
    const book = await getBookById(bookId);
    
    if (!book) {
      await ctx.answerCbQuery('❌ Книга не знайдена');
      return;
    }
    
    if (!progress) {
      await ctx.answerCbQuery('📊 Ви ще не слухали цю книгу', { show_alert: true });
      return;
    }
    
    const totalDuration = (book as any).audio_duration || 0;
    const progressPercent = totalDuration > 0 
      ? Math.round((progress.position / totalDuration) * 100) 
      : 0;
    
    let text = `📊 *Прогрес прослуховування*\n\n`;
    text += `📖 ${book.title}\n`;
    text += `📈 Прогрес: ${progressPercent}%\n`;
    text += `⏱️ Прослухано: ${formatDuration(progress.total_listened)}\n`;
    text += `📅 Останнє прослуховування: ${new Date(progress.last_listened_at!).toLocaleDateString('uk-UA')}`;
    
    await ctx.answerCbQuery();
    await ctx.reply(text, { parse_mode: 'Markdown' });
    
  } catch (error) {
    logger.error('Error showing progress', error as Error, { userId: ctx.from?.id });
    await ctx.answerCbQuery('❌ Помилка');
  }
});

// Зберегти позицію
audioPlayerScene.action(/save_position_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery('💡 Позиція автоматично зберігається при прослуховуванні', { show_alert: true });
});

// Повернутися до книги
audioPlayerScene.action('back_to_book', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.leave();
  await ctx.reply('✅ Повернулися до книги');
});

// Вихід з сцени
audioPlayerScene.command('cancel', async (ctx) => {
  await ctx.reply('❌ Відтворення скасовано');
  return ctx.scene.leave();
});

// Утиліта для форматування тривалості
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}г ${minutes}хв`;
  } else if (minutes > 0) {
    return `${minutes}хв ${secs}с`;
  } else {
    return `${secs}с`;
  }
}

export default audioPlayerScene;
