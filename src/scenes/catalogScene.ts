import { Scenes, Markup } from 'telegraf';
import { 
  getGenres, 
  getBooksByGenre, 
  getTopBooks, 
  getNewestBooks, 
  isBookSaved 
} from '../database/models';
import { 
  getBooksSortedByTitle, 
  getBooksWithAudio, 
  getMostDownloadedBooks 
} from '../database/catalogFunctions';
import { getAllTags, searchBooksByTag } from '../database/tagFunctions';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { formatBookCaption } from '../utils/helpers';

const catalogScene = new Scenes.BaseScene<BotContext>('CATALOG_SCENE');

// Кількість книг на сторінці
const ITEMS_PER_PAGE = 5;

/**
 * Головне меню каталогу (Вибір між Книгами та Підкастами)
 */
async function showMainCatalogMenu(ctx: BotContext) {
  const message = '📚 <b>КАТАЛОГ</b>\n\nОберіть розділ:';
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📖 Книги', 'catalog_books_menu'),
      Markup.button.callback('🎙️ Підкасти', 'catalog_podcasts_menu'),
    ],
    [Markup.button.callback('⬅️ Назад до меню', 'catalog_back')],
  ]).reply_markup;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
  } else {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

/**
 * Меню вибору типу перегляду книг
 */
async function showBooksCatalogMenu(ctx: BotContext) {
  const message = '📚 <b>КАТАЛОГ КНИГ</b>\n\nОберіть спосіб перегляду:';
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📖 За жанрами', 'catalog_genres'),
      Markup.button.callback('⭐ За рейтингом', 'catalog_rating'),
    ],
    [
      Markup.button.callback('🆕 Новинки', 'catalog_new'),
      Markup.button.callback('🔤 За алфавітом', 'catalog_alpha'),
    ],
    [
      Markup.button.callback('🎧 З аудіо', 'catalog_audio'),
      Markup.button.callback('📥 За завантаженнями', 'catalog_downloads'),
    ],
    [
      Markup.button.callback('🏷️ За тегами', 'catalog_tags'),
      Markup.button.callback('🔍 Пошук', 'catalog_search'),
    ],
    [Markup.button.callback('⬅️ Назад', 'catalog_main_menu')],
  ]).reply_markup;

  await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
}

catalogScene.enter(async (ctx) => {
  await showMainCatalogMenu(ctx);
});

// Повернення до головного вибору (Книги/Підкасти)
catalogScene.action('catalog_main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await showMainCatalogMenu(ctx);
});

// Вибір Книг
catalogScene.action('catalog_books_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await showBooksCatalogMenu(ctx);
});

// Вибір Підкастів
catalogScene.action('catalog_podcasts_menu', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  try {
    const { getPodcasts } = await import('../database/models');
    const podcasts = await getPodcasts();
    
    if (!podcasts || podcasts.length === 0) {
      await ctx.reply('🎙️ У розділі підкастів поки що порожньо.');
      return;
    }

    await ctx.reply(`🎙️ <b>ДОСТУПНІ ПІДКАСТИ</b> (${podcasts.length}):`, { parse_mode: 'HTML' });

    for (const podcast of podcasts.slice(0, 5)) {
      const { formatPodcastCaption } = await import('../utils/helpers');
      const caption = await formatPodcastCaption(podcast);
      // Припускаємо, що для підкастів є своя клавіатура або використовуємо базову
      await ctx.reply(caption, { parse_mode: 'HTML' });
    }
    
    await ctx.reply('🔍 Бажаєте повернутися до вибору розділу?', {
      reply_markup: Markup.inlineKeyboard([
        [{ text: '⬅️ До головного каталогу', callback_data: 'catalog_main_menu' }]
      ]).reply_markup
    });
  } catch (error) {
    logger.error('Error in podcasts menu', error as any);
    await ctx.reply('❌ Помилка завантаження підкастів.');
  }
});

// --- РОЗДІЛИ КНИГ ---

// 1. За алфавітом
catalogScene.action('catalog_alpha', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const books = await getBooksSortedByTitle(20, 0); // Беремо перші 20 для списку
    if (books.length === 0) {
      await ctx.reply('📭 Книг не знайдено.');
      return;
    }

    let message = '🔤 <b>КНИГИ ЗА АЛФАВІТОМ</b>\n\n';
    const keyboard = books.map(book => [
      Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`)
    ]);
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
    });
  } catch (error) {
    logger.error('Error in catalog_alpha', error as any);
    await ctx.reply('❌ Помилка завантаження алфавітного покажчика.');
  }
});

// 2. За рейтингом
catalogScene.action('catalog_rating', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const books = await getTopBooks(10);
    let message = '⭐ <b>ТОП КНИГИ ЗА РЕЙТИНГОМ</b>\n\n';
    const keyboard = books.map(book => [
      Markup.button.callback(`⭐ ${book.rating?.toFixed(1) || '0'} | ${book.title}`, `view_book_${book.id}`)
    ]);
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
    });
  } catch (error) {
    logger.error('Error in catalog_rating', error as any);
  }
});

// 3. Новинки
catalogScene.action('catalog_new', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const books = await getNewestBooks(10);
    let message = '🆕 <b>ОСТАННІ НОВИНКИ</b>\n\n';
    const keyboard = books.map(book => [
      Markup.button.callback(`🆕 ${book.title}`, `view_book_${book.id}`)
    ]);
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
    });
  } catch (error) {
    logger.error('Error in catalog_new', error as any);
  }
});

// 4. З аудіо
catalogScene.action('catalog_audio', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const books = await getBooksWithAudio();
    let message = '🎧 <b>АУДІОКНИГИ</b>\n\n';
    const keyboard = books.slice(0, 15).map(book => [
      Markup.button.callback(`🎧 ${book.title}`, `view_book_${book.id}`)
    ]);
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
    });
  } catch (error) {
    logger.error('Error in catalog_audio', error as any);
  }
});

// 5. За завантаженнями
catalogScene.action('catalog_downloads', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const books = await getMostDownloadedBooks(10);
    let message = '📥 <b>НАЙПОПУЛЯРНІШІ (ЗАВАНТАЖЕННЯ)</b>\n\n';
    const keyboard = books.map(book => [
      Markup.button.callback(`📥 ${book.downloads_count || 0} | ${book.title}`, `view_book_${book.id}`)
    ]);
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
    });
  } catch (error) {
    logger.error('Error in catalog_downloads', error as any);
  }
});

// 6. За тегами
catalogScene.action('catalog_tags', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const tags = await getAllTags();
    let message = '🏷️ <b>ПОШУК ЗА ТЕГАМИ</b>\n\nОберіть тег:';
    const buttons = tags.slice(0, 20).map(tag => 
      Markup.button.callback(`#${tag.name}`, `catalog_tag_${tag.id}`)
    );
    
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
    });
  } catch (error) {
    logger.error('Error in catalog_tags', error as any);
  }
});

// Обробка тегу
catalogScene.action(/^catalog_tag_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const tagId = parseInt(ctx.match[1], 10);
    const tags = await getAllTags();
    const tag = tags.find(t => t.id === tagId);
    
    if (!tag) return;

    const books = await searchBooksByTag(tag.name);
    await ctx.reply(`🏷️ Книги з тегом <b>#${tag.name}</b>:`, { parse_mode: 'HTML' });
    
    for (const book of books.slice(0, 5)) {
      const caption = await formatBookCaption(book);
      const isSaved = ctx.from?.id ? await isBookSaved(ctx.from.id, book.id!) : false;
      await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: getEnhancedBookKeyboard(book, isSaved) });
    }
  } catch (error) {
    logger.error('Error in tag action', error as any);
  }
});

// --- ІНШІ ОБРОБНИКИ ---

catalogScene.action('catalog_genres', async (ctx) => {
  await ctx.answerCbQuery();
  await showGenreMenu(ctx);
});

async function showGenreMenu(ctx: BotContext) {
  try {
    const genres = await getGenres();
    
    if (genres.length === 0) {
      await ctx.reply('📭 У каталозі поки що немає книг.');
      return showBooksCatalogMenu(ctx);
    }

    const processedGenres = genres
      .flatMap((genre: string) => genre.split('\n').map((g: string) => g.trim()))
      .filter((genre: string) => genre.length > 0)
      .filter((genre: string, index: number, self: string[]) => self.indexOf(genre) === index);

    const buttons = processedGenres.map((genre, index) => 
      Markup.button.callback(genre, `genre_idx_${index}`)
    );

    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await ctx.editMessageText('📖 <b>КАТАЛОГ ЗА ЖАНРАМИ</b>\n\nОберіть жанр:', {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
    });
  } catch (error) {
    logger.error('Error in showGenreMenu', error as any);
  }
}

// Обробка вибору жанру за індексом
catalogScene.action(/^genre_idx_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const index = parseInt(ctx.match[1], 10);
    const genresData = await getGenres();
    
    // Повторюємо ту саму логіку обробки жанрів, що і в showGenreMenu
    const processedGenres = genresData
      .flatMap((genre: string) => genre.split('\n').map((g: string) => g.trim()))
      .filter((genre: string) => genre.length > 0)
      .filter((genre: string, index: number, self: string[]) => self.indexOf(genre) === index);

    const fullGenre = processedGenres[index];
    if (!fullGenre) {
      await ctx.reply('❌ Жанр не знайдено.');
      return;
    }

    const books = await getBooksByGenre(fullGenre);
    if (books.length === 0) {
      await ctx.reply(`😔 У жанрі "${fullGenre}" поки немає книг.`);
      return;
    }

    await ctx.reply(`📚 Книги у жанрі <b>${fullGenre}</b> (${books.length}):`, { parse_mode: 'HTML' });

    for (const book of books.slice(0, ITEMS_PER_PAGE)) {
      const caption = await formatBookCaption(book);
      const isSaved = ctx.from?.id ? await isBookSaved(ctx.from.id, book.id!) : false;
      await ctx.reply(caption, { 
        parse_mode: 'HTML', 
        reply_markup: getEnhancedBookKeyboard(book, isSaved) 
      });
    }

    if (books.length > ITEMS_PER_PAGE) {
      await ctx.reply(`📚 Показано ${ITEMS_PER_PAGE} з ${books.length}.`);
    }

    await ctx.reply('🔍 Бажаєте переглянути інший жанр?', {
      reply_markup: Markup.inlineKeyboard([
        [{ text: '📚 До списку жанрів', callback_data: 'catalog_genres' }],
        [{ text: '🏠 До головного каталогу', callback_data: 'catalog_main_menu' }],
      ]).reply_markup,
    });
  } catch (error) {
    logger.error('Error in genre selection', error as any);
    await ctx.reply('❌ Помилка при завантаженні книг.');
  }
});

catalogScene.action('catalog_search', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('SEARCH_SCENE', { fromCatalog: true });
});

catalogScene.action('catalog_back', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('🏠 Повернувся до головного меню:', {
    reply_markup: getMainMenuKeyboard(),
  });
});

export default catalogScene;
