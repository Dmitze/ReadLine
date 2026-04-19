import { Markup } from 'telegraf';
import { Book } from '../database/models';
import { Context } from 'telegraf';
import { BUTTONS } from '../constants';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const detectDeviceType = (ctx: Context): DeviceType => {
  const botCtx = ctx as any;
  const savedDeviceType = botCtx?.session?.deviceType || botCtx?.state?.deviceType;

  if (savedDeviceType && ['mobile', 'tablet', 'desktop'].includes(savedDeviceType)) {
    return savedDeviceType as DeviceType;
  }

  return 'mobile';
};

export const getKeyboardConfig = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'mobile':
      return {
        buttonsPerRow: 2,
        useInline: false,
        showQuickActions: true,
        buttonSize: 'large',
      };
    case 'tablet':
      return {
        buttonsPerRow: 3,
        useInline: false,
        showQuickActions: true,
        buttonSize: 'medium',
      };
    case 'desktop':
      return {
        buttonsPerRow: 4,
        useInline: true,
        showQuickActions: true,
        buttonSize: 'small',
      };
    default:
      return {
        buttonsPerRow: 2,
        useInline: false,
        showQuickActions: true,
        buttonSize: 'large',
      };
  }
};

export const getAdaptiveMainMenuKeyboard = (_ctx: Context, _withQuickActions: boolean = true) => {
  const deviceType = detectDeviceType(_ctx);
  const config = getKeyboardConfig(deviceType);

  const allButtons = [
    BUTTONS.CATALOG,
    BUTTONS.SEARCH,
    BUTTONS.TOP_BOOKS,
    BUTTONS.NEW_BOOKS,
    BUTTONS.MY_LIBRARY,
    BUTTONS.PROFILE,
    BUTTONS.AI_ASSISTANT,
    BUTTONS.PROMO,
    BUTTONS.SETTINGS,
    BUTTONS.HELP,
    BUTTONS.FEEDBACK,
    BUTTONS.YAKABOO,
  ];

  const buttons: string[][] = [];
  for (let i = 0; i < allButtons.length; i += config.buttonsPerRow) {
    buttons.push(allButtons.slice(i, i + config.buttonsPerRow));
  }

  if (config.useInline) {
    const inlineButtons = buttons.map((row) =>
      row.map((text) => Markup.button.callback(text, `menu_${text.replace(/[^\w]/g, '_')}`))
    );
    return Markup.inlineKeyboard(inlineButtons).reply_markup;
  }

  return Markup.keyboard(buttons).resize().oneTime().reply_markup;
};

export const getMainMenuKeyboard = () => {
  const buttons = [
    [BUTTONS.CATALOG, BUTTONS.SEARCH],
    [BUTTONS.TOP_BOOKS, BUTTONS.NEW_BOOKS],
    [BUTTONS.MY_LIBRARY, BUTTONS.AI_ASSISTANT],
    [BUTTONS.PROFILE, BUTTONS.SETTINGS],
    [BUTTONS.PROMO, BUTTONS.FEEDBACK],
    [BUTTONS.HELP, BUTTONS.YAKABOO],
  ];

  return Markup.keyboard(buttons).resize().oneTime().reply_markup;
};

export const getAdaptiveGenreKeyboard = (ctx: Context, genres: string[]) => {
  const deviceType = detectDeviceType(ctx);
  const config = getKeyboardConfig(deviceType);

  const buttons: string[][] = [];
  for (let i = 0; i < genres.length; i += config.buttonsPerRow) {
    buttons.push(genres.slice(i, i + config.buttonsPerRow));
  }

  if (config.useInline) {
    const inlineButtons = buttons.map((row) =>
      row.map((text) => Markup.button.callback(text, `genre_${text.replace(/[^\w]/g, '_')}`))
    );
    return Markup.inlineKeyboard(inlineButtons).reply_markup;
  }

  return Markup.keyboard(buttons).resize().reply_markup;
};

export const getGenreKeyboard = (genres: string[]) => {
  const keyboard = genres.map((genre, index) => [Markup.button.callback(genre, `genre_${index}`)]);

  keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books')]);

  return Markup.inlineKeyboard(keyboard).reply_markup;
};

export const getAdaptiveBookKeyboard = (ctx: Context, book: Book, isSaved: boolean = false) => {
  const deviceType = detectDeviceType(ctx);
  const config = getKeyboardConfig(deviceType);

  const keyboard: any[][] = [];

  const formatButtons: any[] = [];

  if ((book as any).pdf_file_id || (book.file_type === 'file' && book.file_url)) {
    const format = (book as any).file_format || 'файл';
    const buttonText = deviceType === 'mobile' ? `📥 ${format}` : '📥 Завантажити файл';
    formatButtons.push(Markup.button.callback(buttonText, `download_pdf_${book.id}`));
  }

  if ((book as any).external_link) {
    const buttonText = deviceType === 'mobile' ? '🌐 Онлайн' : '🌐 Читати онлайн';
    formatButtons.push(Markup.button.url(buttonText, (book as any).external_link));
  } else if (book.file_type === 'link' && book.file_url) {
    const buttonText = deviceType === 'mobile' ? '🌐 Онлайн' : '🌐 Читати онлайн';
    formatButtons.push(Markup.button.url(buttonText, book.file_url));
  }

  if (book.file_type === 'audio' || (book as any).audio_file_id) {
    const buttonText = deviceType === 'mobile' ? '🎧 Аудіо' : '🎧 Слухати';
    formatButtons.push(Markup.button.callback(buttonText, `download_audio_${book.id}`));
  } else if ((book as any).audio_external_link) {
    const buttonText = deviceType === 'mobile' ? '🎧 Аудіо' : '🎧 Слухати онлайн';
    formatButtons.push(Markup.button.url(buttonText, (book as any).audio_external_link));
  }

  if (formatButtons.length > 0) {
    const buttonsPerRow = deviceType === 'mobile' ? 2 : deviceType === 'tablet' ? 3 : 4;
    for (let i = 0; i < formatButtons.length; i += buttonsPerRow) {
      keyboard.push(formatButtons.slice(i, i + buttonsPerRow));
    }
  }

  const actionButtons: any[] = [];

  if (isSaved) {
    const buttonText = deviceType === 'mobile' ? '❤️' : '❤️ Збережено';
    actionButtons.push(Markup.button.callback(buttonText, `save_${book.id}`));
  } else {
    const buttonText = deviceType === 'mobile' ? '💾' : '💾 Зберегти';
    actionButtons.push(Markup.button.callback(buttonText, `save_${book.id}`));
  }

  if (book.rating && book.rating > 0) {
    const buttonText =
      deviceType === 'mobile'
        ? `⭐ ${book.rating.toFixed(1)}`
        : `⭐ ${book.rating.toFixed(1)} Оцінити`;
    actionButtons.push(Markup.button.callback(buttonText, `rate_${book.id}`));
  } else {
    const buttonText = deviceType === 'mobile' ? '⭐' : '⭐ Оцінити';
    actionButtons.push(Markup.button.callback(buttonText, `rate_${book.id}`));
  }

  const buttonText1 = deviceType === 'mobile' ? '📊' : '📊 Відгуки';
  const buttonText2 = deviceType === 'mobile' ? '🔍' : '🔍 Схожі';
  actionButtons.push(Markup.button.callback(buttonText1, `reviews_${book.id}`));
  actionButtons.push(Markup.button.callback(buttonText2, `similar_${book.id}`));

  const actionsPerRow = deviceType === 'mobile' ? 2 : deviceType === 'tablet' ? 3 : 4;
  for (let i = 0; i < actionButtons.length; i += actionsPerRow) {
    keyboard.push(actionButtons.slice(i, i + actionsPerRow));
  }

  return Markup.inlineKeyboard(keyboard).reply_markup;
};

export const getEnhancedBookKeyboard = (book: Book, isSaved: boolean = false) => {
  const keyboard: any[][] = [];

  if ((book as any).is_physically_available) {
    keyboard.push([Markup.button.callback('📋 Замовити книгу', `order_book_${book.id}`)]);
  }

  const formatRow: any[] = [];

  if (book.file_url || (book as any).pdf_file_id) {
    formatRow.push(Markup.button.callback('📥 Завантажити файл', `download_pdf_${book.id}`));
  }

  if ((book as any).audio_file_id) {
    formatRow.push(Markup.button.callback('🎧 Слухати', `download_audio_${book.id}`));
  } else if ((book as any).audio_external_link) {
    formatRow.push(Markup.button.url('🎧 Слухати онлайн', (book as any).audio_external_link));
  }

  if ((book as any).online_link) {
    formatRow.push(Markup.button.url('🌐 Читати онлайн', (book as any).online_link));
  } else if ((book as any).external_link) {
    formatRow.push(Markup.button.url('🌐 Читати онлайн', (book as any).external_link));
  }

  if (formatRow.length > 0) {
    if (formatRow.length <= 2) {
      keyboard.push(formatRow);
    } else {
      keyboard.push(formatRow.slice(0, 2));
      keyboard.push(formatRow.slice(2));
    }
  }

  const actionRow = [];

  if (isSaved) {
    actionRow.push(Markup.button.callback('❤️ Збережено', `save_${book.id}`));
  } else {
    actionRow.push(Markup.button.callback('💾 Зберегти', `save_${book.id}`));
  }

  if (book.rating && book.rating > 0) {
    actionRow.push(
      Markup.button.callback(`⭐ ${book.rating.toFixed(1)} Оцінити`, `rate_${book.id}`)
    );
  } else {
    actionRow.push(Markup.button.callback('⭐ Оцінити', `rate_${book.id}`));
  }

  keyboard.push(actionRow);

  keyboard.push([
    Markup.button.callback('📊 Відгуки', `reviews_${book.id}`),
    Markup.button.callback('🔍 Схожі книги', `similar_${book.id}`),
  ]);

  return Markup.inlineKeyboard(keyboard).reply_markup;
};

export const getBackKeyboard = () => {
  return Markup.removeKeyboard().reply_markup;
};
