import { Scenes, Markup } from 'telegraf';
import { getGenres, getBooksByGenreWithPagination } from '../database/models';
import {
  getBooksSortedByTitle,
  getBooksWithAudioWithPagination,
  getMostDownloadedBooksWithPagination,
  getNewestBooksWithPagination,
  getTopBooksWithPagination,
} from '../database/catalogFunctions';
import { getAllTags, searchBooksByTagWithPagination } from '../database/tagFunctions';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { escapeHtml } from '../utils/helpers';
import { Book } from '../database/tables/types';
import { getAllPodcastsWithPagination, Podcast } from '../database/tables/podcasts';

const catalogScene = new Scenes.BaseScene<BotContext>('CATALOG_SCENE');

const PAGE_SIZE = 8;

export type CatalogListType =
  | 'alpha'
  | 'rating'
  | 'new'
  | 'audio'
  | 'downloads'
  | 'genre'
  | 'tag'
  | 'podcasts';

export interface CatalogState {
  type: CatalogListType;
  page: number;
  genre?: string;
  tagId?: number;
  tagName?: string;

  lastTotalPages?: number;
}

type BookFetchFn = (limit: number, offset: number) => Promise<{ books: Book[]; total: number }>;

function getCatalogState(ctx: BotContext): CatalogState {
  const raw = ctx.scene?.state as Partial<CatalogState> | undefined;
  return {
    type: raw?.type ?? 'alpha',
    page: typeof raw?.page === 'number' && raw.page >= 0 ? raw.page : 0,
    genre: raw?.genre,
    tagId: raw?.tagId,
    tagName: raw?.tagName,
    lastTotalPages: raw?.lastTotalPages,
  };
}

function mergeCatalogState(ctx: BotContext, patch: Partial<CatalogState>): void {
  if (!ctx.scene) return;
  const cur = getCatalogState(ctx);
  ctx.scene.state = { ...cur, ...patch } as CatalogState;
}

function replaceCatalogState(ctx: BotContext, next: CatalogState): void {
  if (!ctx.scene) return;
  ctx.scene.state = { ...next };
}

function bookListLine(book: Book): string {
  const rating =
    book.rating != null && !Number.isNaN(Number(book.rating))
      ? `⭐${Number(book.rating).toFixed(1)}`
      : '⭐—';
  return `📖 ${escapeHtml(book.title)} — ${escapeHtml(book.author || '')} (${rating})`;
}

function bookButtonLabel(book: Book): string {
  const maxLen = 48;
  const t = book.title.length > maxLen ? `${book.title.slice(0, maxLen - 1)}…` : book.title;
  return `📖 ${t}`;
}

async function sendCatalogScreen(
  ctx: BotContext,
  text: string,
  replyMarkup: ReturnType<typeof Markup.inlineKeyboard>['reply_markup']
): Promise<void> {
  try {
    if (ctx.callbackQuery?.message) {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    }
  } catch (error) {
    logger.error(
      'Error in sendCatalogScreen',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }
}

async function renderBookList(
  ctx: BotContext,
  titleHtml: string,
  fetchFn: BookFetchFn,
  backCallbackData: string
): Promise<void> {
  try {
    const state = getCatalogState(ctx);
    let page = state.page;
    let offset = page * PAGE_SIZE;
    let { books, total } = await fetchFn(PAGE_SIZE, offset);

    const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;

    if (totalPages > 0 && page >= totalPages) {
      mergeCatalogState(ctx, { page: totalPages - 1 });
      page = totalPages - 1;
      offset = page * PAGE_SIZE;
      ({ books, total } = await fetchFn(PAGE_SIZE, offset));
    }

    if (books.length === 0 || total === 0) {
      mergeCatalogState(ctx, { lastTotalPages: 0 });
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 До меню каталогу', backCallbackData)],
      ]).reply_markup;
      await sendCatalogScreen(ctx, `${titleHtml}\n\n📭 Книг не знайдено.`, keyboard);
      return;
    }

    const lines = books.map((b) => bookListLine(b)).join('\n');
    const body = `${titleHtml}\n\n${lines}`;

    const keyboardRows: ReturnType<typeof Markup.button.callback>[][] = books.map((book) => [
      Markup.button.callback(bookButtonLabel(book), `view_book_${book.id}`),
    ]);

    const navRow: ReturnType<typeof Markup.button.callback>[] = [];
    if (page > 0) {
      navRow.push(Markup.button.callback('⬅️ Назад', 'catalog_prev_page'));
    }
    navRow.push(Markup.button.callback(`📄 ${page + 1} / ${totalPages}`, 'catalog_page_info'));
    if (page < totalPages - 1) {
      navRow.push(Markup.button.callback('Вперед ➡️', 'catalog_next_page'));
    }
    keyboardRows.push(navRow);

    keyboardRows.push([Markup.button.callback('🔙 До меню каталогу', backCallbackData)]);

    mergeCatalogState(ctx, { lastTotalPages: totalPages });

    await sendCatalogScreen(ctx, body, Markup.inlineKeyboard(keyboardRows).reply_markup);
  } catch (error) {
    logger.error(
      'Error in renderBookList',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply('❌ Помилка завантаження списку.');
  }
}

function podcastListLine(p: Podcast): string {
  const rating =
    p.rating != null && !Number.isNaN(Number(p.rating))
      ? `⭐${Number(p.rating).toFixed(1)}`
      : '⭐—';
  return `🎙️ ${escapeHtml(p.theme)} (${rating})`;
}

function podcastButtonLabel(p: Podcast): string {
  const maxLen = 48;
  const t = p.theme.length > maxLen ? `${p.theme.slice(0, maxLen - 1)}…` : p.theme;
  return `🎙️ ${t}`;
}

async function renderPodcastList(ctx: BotContext, backCallbackData: string): Promise<void> {
  try {
    const state = getCatalogState(ctx);
    let page = state.page;
    let offset = page * PAGE_SIZE;
    let { podcasts, total } = await getAllPodcastsWithPagination(PAGE_SIZE, offset);

    const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;

    if (totalPages > 0 && page >= totalPages) {
      mergeCatalogState(ctx, { page: totalPages - 1 });
      page = totalPages - 1;
      offset = page * PAGE_SIZE;
      ({ podcasts, total } = await getAllPodcastsWithPagination(PAGE_SIZE, offset));
    }

    if (!podcasts.length || total === 0) {
      mergeCatalogState(ctx, { lastTotalPages: 0 });
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 До меню каталогу', backCallbackData)],
      ]).reply_markup;
      await sendCatalogScreen(
        ctx,
        '🎙️ <b>ПІДКАСТИ</b>\n\n📭 У розділі підкастів поки що порожньо.',
        keyboard
      );
      return;
    }

    const titleHtml = `🎙️ <b>ПІДКАСТИ</b>\n<i>Всього: ${total}</i>`;
    const lines = podcasts.map((p) => podcastListLine(p)).join('\n');
    const body = `${titleHtml}\n\n${lines}`;

    const keyboardRows: ReturnType<typeof Markup.button.callback>[][] = podcasts.map((p) => [
      Markup.button.callback(podcastButtonLabel(p), `view_podcast_${p.id}`),
    ]);

    const navRow: ReturnType<typeof Markup.button.callback>[] = [];
    if (page > 0) {
      navRow.push(Markup.button.callback('⬅️ Назад', 'catalog_prev_page'));
    }
    navRow.push(Markup.button.callback(`📄 ${page + 1} / ${totalPages}`, 'catalog_page_info'));
    if (page < totalPages - 1) {
      navRow.push(Markup.button.callback('Вперед ➡️', 'catalog_next_page'));
    }
    keyboardRows.push(navRow);

    keyboardRows.push([Markup.button.callback('🔙 До меню каталогу', backCallbackData)]);

    mergeCatalogState(ctx, { lastTotalPages: totalPages });

    await sendCatalogScreen(ctx, body, Markup.inlineKeyboard(keyboardRows).reply_markup);
  } catch (error) {
    logger.error(
      'Error in renderPodcastList',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply('❌ Помилка завантаження підкастів.');
  }
}

async function refreshListFromState(ctx: BotContext): Promise<void> {
  const s = getCatalogState(ctx);
  switch (s.type) {
    case 'alpha':
      return renderBookList(
        ctx,
        '🔤 <b>КНИГИ ЗА АЛФАВІТОМ</b>',
        (l, o) => getBooksSortedByTitle(l, o),
        'catalog_books_menu'
      );
    case 'rating':
      return renderBookList(
        ctx,
        '⭐ <b>КНИГИ ЗА РЕЙТИНГОМ</b>',
        (l, o) => getTopBooksWithPagination(l, o),
        'catalog_books_menu'
      );
    case 'new':
      return renderBookList(
        ctx,
        '🆕 <b>НОВИНКИ</b>',
        (l, o) => getNewestBooksWithPagination(l, o),
        'catalog_books_menu'
      );
    case 'audio':
      return renderBookList(
        ctx,
        '🎧 <b>КНИГИ З АУДІО</b>',
        (l, o) => getBooksWithAudioWithPagination(l, o),
        'catalog_books_menu'
      );
    case 'downloads':
      return renderBookList(
        ctx,
        '📥 <b>ЗАВАНТАЖЕННЯ</b>',
        (l, o) => getMostDownloadedBooksWithPagination(l, o),
        'catalog_books_menu'
      );
    case 'genre': {
      const genre = s.genre;
      if (!genre) {
        await ctx.reply('❌ Жанр не вибрано.');
        return;
      }
      return renderBookList(
        ctx,
        `📚 <b>ЖАНР:</b> ${escapeHtml(genre)}`,
        (_l, o) => getBooksByGenreWithPagination(genre, Math.floor(o / PAGE_SIZE) + 1, PAGE_SIZE),
        'catalog_genres'
      );
    }
    case 'tag': {
      const tagName = s.tagName;
      if (!tagName) {
        await ctx.reply('❌ Тег не вибрано.');
        return;
      }
      return renderBookList(
        ctx,
        `🏷️ <b>ТЕГ:</b> #${escapeHtml(tagName)}`,
        (l, o) => searchBooksByTagWithPagination(tagName, l, o),
        'catalog_tags'
      );
    }
    case 'podcasts':
      return renderPodcastList(ctx, 'catalog_podcasts_menu');
    default:
      await ctx.reply('❌ Невідомий режим каталогу.');
  }
}

async function showMainCatalogMenu(ctx: BotContext) {
  const message = '📚 <b>КАТАЛОГ</b>\n\nОберіть розділ:';
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📖 Книги', 'catalog_books_menu'),
      Markup.button.callback('🎙️ Підкасти', 'catalog_podcasts_menu'),
    ],
    [Markup.button.callback('⬅️ Назад до меню', 'catalog_back')],
  ]).reply_markup;

  await sendCatalogScreen(ctx, message, keyboard);
}

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

  await sendCatalogScreen(ctx, message, keyboard);
}

function processGenresList(genres: string[]): string[] {
  return genres
    .flatMap((genre) => genre.split('\n').map((g) => g.trim()))
    .filter((genre) => genre.length > 0)
    .filter((genre, index, self) => self.indexOf(genre) === index);
}

async function showGenreMenu(ctx: BotContext) {
  try {
    const genres = await getGenres();

    if (genres.length === 0) {
      await sendCatalogScreen(
        ctx,
        '📭 У каталозі поки що немає книг.',
        Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]])
          .reply_markup
      );
      return;
    }

    const processedGenres = processGenresList(genres);
    const buttons = processedGenres.map((genre, index) =>
      Markup.button.callback(genre, `genre_idx_${index}`)
    );

    const keyboard: ReturnType<typeof Markup.button.callback>[][] = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await sendCatalogScreen(
      ctx,
      '📖 <b>КАТАЛОГ ЗА ЖАНРАМИ</b>\n\nОберіть жанр:',
      Markup.inlineKeyboard(keyboard).reply_markup
    );
  } catch (error) {
    logger.error(
      'Error in showGenreMenu',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply('❌ Помилка завантаження жанрів.');
  }
}

catalogScene.enter(async (ctx) => {
  await showMainCatalogMenu(ctx);
});

catalogScene.action('catalog_main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await showMainCatalogMenu(ctx);
});

catalogScene.action('catalog_books_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await showBooksCatalogMenu(ctx);
});

catalogScene.action('catalog_podcasts_menu', async (ctx) => {
  await ctx.answerCbQuery();
  replaceCatalogState(ctx, { type: 'podcasts', page: 0 });
  await refreshListFromState(ctx);
});

catalogScene.action('catalog_alpha', async (ctx) => {
  await ctx.answerCbQuery();
  replaceCatalogState(ctx, { type: 'alpha', page: 0 });
  await refreshListFromState(ctx);
});

catalogScene.action('catalog_rating', async (ctx) => {
  await ctx.answerCbQuery();
  replaceCatalogState(ctx, { type: 'rating', page: 0 });
  await refreshListFromState(ctx);
});

catalogScene.action('catalog_new', async (ctx) => {
  await ctx.answerCbQuery();
  replaceCatalogState(ctx, { type: 'new', page: 0 });
  await refreshListFromState(ctx);
});

catalogScene.action('catalog_audio', async (ctx) => {
  await ctx.answerCbQuery();
  replaceCatalogState(ctx, { type: 'audio', page: 0 });
  await refreshListFromState(ctx);
});

catalogScene.action('catalog_downloads', async (ctx) => {
  await ctx.answerCbQuery();
  replaceCatalogState(ctx, { type: 'downloads', page: 0 });
  await refreshListFromState(ctx);
});

catalogScene.action('catalog_genres', async (ctx) => {
  await ctx.answerCbQuery();
  await showGenreMenu(ctx);
});

catalogScene.action('catalog_tags', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const tags = await getAllTags();
    const message = '🏷️ <b>ПОШУК ЗА ТЕГАМИ</b>\n\nОберіть тег:';
    const buttons = tags
      .slice(0, 40)
      .map((tag) => Markup.button.callback(`#${tag.name}`, `catalog_tag_${tag.id}`));

    const keyboard: ReturnType<typeof Markup.button.callback>[][] = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books_menu')]);

    await sendCatalogScreen(ctx, message, Markup.inlineKeyboard(keyboard).reply_markup);
  } catch (error) {
    logger.error(
      'Error in catalog_tags',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply('❌ Помилка завантаження тегів.');
  }
});

catalogScene.action(/^catalog_tag_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const tagId = parseInt(ctx.match[1], 10);
  try {
    const tags = await getAllTags();
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) {
      await ctx.reply('❌ Тег не знайдено.');
      return;
    }
    replaceCatalogState(ctx, {
      type: 'tag',
      page: 0,
      tagId: tag.id,
      tagName: tag.name,
    });
    await refreshListFromState(ctx);
  } catch (error) {
    logger.error(
      'Error in catalog_tag action',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply('❌ Помилка завантаження книг за тегом.');
  }
});

catalogScene.action(/^genre_idx_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const index = parseInt(ctx.match[1], 10);
  try {
    const genresData = await getGenres();
    const processedGenres = processGenresList(genresData);
    const fullGenre = processedGenres[index];
    if (!fullGenre) {
      await ctx.reply('❌ Жанр не знайдено.');
      return;
    }

    replaceCatalogState(ctx, {
      type: 'genre',
      page: 0,
      genre: fullGenre,
    });
    await refreshListFromState(ctx);
  } catch (error) {
    logger.error(
      'Error in genre selection',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply('❌ Помилка при завантаженні книг.');
  }
});

catalogScene.action('catalog_prev_page', async (ctx) => {
  const s = getCatalogState(ctx);
  await ctx.answerCbQuery();
  if (s.page > 0) {
    mergeCatalogState(ctx, { page: s.page - 1 });
  }
  await refreshListFromState(ctx);
});

catalogScene.action('catalog_next_page', async (ctx) => {
  const s = getCatalogState(ctx);
  await ctx.answerCbQuery();
  mergeCatalogState(ctx, { page: s.page + 1 });
  await refreshListFromState(ctx);
});

catalogScene.action('catalog_page_info', async (ctx) => {
  const s = getCatalogState(ctx);
  const tp = s.lastTotalPages != null && s.lastTotalPages > 0 ? s.lastTotalPages : 1;
  await ctx.answerCbQuery(`Сторінка ${s.page + 1} з ${tp}`, { show_alert: false });
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
