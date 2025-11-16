// Main user keyboards
import { Markup } from 'telegraf';
import { Book } from '../database/models';
import { Context } from 'telegraf';

// ============================================
// АДАПТИВНІ КЛАВІАТУРИ (Завдання 30)
// ============================================

// Типи пристроїв
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// Визначення типу пристрою на основі контексту
export const detectDeviceType = (ctx: Context): DeviceType => {
  // За замовчуванням - мобільний (найпоширеніший варіант)
  // Динамічний імпорт уникає циклічних залежностей
  // Користувачі можуть налаштувати з меню /settings
  return 'mobile';
};

// Отримати налаштування клавіатури для типу пристрою
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

// Адаптивне головне меню (Завдання 30)
export const getAdaptiveMainMenuKeyboard = (ctx: Context, withQuickActions: boolean = true) => {
  const deviceType = detectDeviceType(ctx);
  const config = getKeyboardConfig(deviceType);

  // Всі доступні кнопки
  const allButtons = [
    '📖 Каталог',
    '🏆 Топ книги',
    '🆕 Новинки',
    '💾 Моя бібліотека',
    '👤 Профіль',
    '🤖 AI Помічник',
    '🎁 Отримати промокод',
    'ℹ️ Допомога',
    "📞 Зворотній зв'язок",
  ];

  // Розбиваємо кнопки на рядки відповідно до типу пристрою
  const buttons: string[][] = [];
  for (let i = 0; i < allButtons.length; i += config.buttonsPerRow) {
    buttons.push(allButtons.slice(i, i + config.buttonsPerRow));
  }

  // Для десктопів використовуємо inline клавіатуру
  if (config.useInline) {
    const inlineButtons = buttons.map((row) =>
      row.map((text) => Markup.button.callback(text, `menu_${text.replace(/[^\w]/g, '_')}`))
    );
    return Markup.inlineKeyboard(inlineButtons).reply_markup;
  }

  // Для мобільних та планшетів - звичайна клавіатура
  return Markup.keyboard(buttons).resize().oneTime().reply_markup;
};

// Стара версія для зворотної сумісності
export const getMainMenuKeyboard = () => {
  const buttons = [
    ['📖 Каталог', '🏆 Топ книги'],
    ['🆕 Новинки', '💾 Моя бібліотека'],
    ['👤 Профіль', '🤖 AI Помічник'],
    ['🎁 Отримати промокод', '📚 Замовити фізичну книгу'],
    ['ℹ️ Допомога', "📞 Зворотній зв'язок"],
  ];

  return Markup.keyboard(buttons).resize().oneTime().reply_markup;
};

// Адаптивна клавіатура жанрів (Завдання 30)
export const getAdaptiveGenreKeyboard = (ctx: Context, genres: string[]) => {
  const deviceType = detectDeviceType(ctx);
  const config = getKeyboardConfig(deviceType);

  // Розбиваємо жанри на рядки
  const buttons: string[][] = [];
  for (let i = 0; i < genres.length; i += config.buttonsPerRow) {
    buttons.push(genres.slice(i, i + config.buttonsPerRow));
  }

  // Персистентне меню завжди доступне

  // Для десктопів - inline клавіатура
  if (config.useInline) {
    const inlineButtons = buttons.map((row) =>
      row.map((text) => Markup.button.callback(text, `genre_${text.replace(/[^\w]/g, '_')}`))
    );
    return Markup.inlineKeyboard(inlineButtons).reply_markup;
  }

  return Markup.keyboard(buttons).resize().reply_markup;
};

// Стара версія для зворотної сумісності
export const getGenreKeyboard = (genres: string[]) => {
  const keyboard = genres.map((genre) => [
    Markup.button.callback(genre, `genre_${genre}`)
  ]);
  
  keyboard.push([Markup.button.callback('⬅️ Назад', 'catalog_books')]);

  return Markup.inlineKeyboard(keyboard).reply_markup;
};

// Адаптивна клавіатура для книги (Завдання 30)
export const getAdaptiveBookKeyboard = (ctx: Context, book: Book, isSaved: boolean = false) => {
  const deviceType = detectDeviceType(ctx);
  const config = getKeyboardConfig(deviceType);

  const keyboard: any[][] = [];

  // Збираємо всі доступні формати
  const formatButtons: any[] = [];

  // Файл книги (PDF, EPUB, MOBI, FB2 тощо)
  if ((book as any).pdf_file_id || (book.file_type === 'file' && book.file_url)) {
    const format = (book as any).file_format || 'PDF';
    const buttonText = deviceType === 'mobile' ? `📥 ${format}` : `📥 Завантажити (${format})`;
    formatButtons.push(Markup.button.callback(buttonText, `download_pdf_${book.id}`));
  }

  // Онлайн посилання
  if ((book as any).external_link) {
    const buttonText = deviceType === 'mobile' ? '🌐 Онлайн' : '🌐 Читати онлайн';
    formatButtons.push(Markup.button.url(buttonText, (book as any).external_link));
  } else if (book.file_type === 'link' && book.file_url) {
    const buttonText = deviceType === 'mobile' ? '🌐 Онлайн' : '🌐 Читати онлайн';
    formatButtons.push(Markup.button.url(buttonText, book.file_url));
  }

  // Аудіокнига - перевіряємо file_type
  if (book.file_type === 'audio' || (book as any).audio_file_id) {
    const buttonText = deviceType === 'mobile' ? '🎧 Аудіо' : '🎧 Слухати';
    formatButtons.push(Markup.button.callback(buttonText, `download_audio_${book.id}`));
  } else if ((book as any).audio_external_link) {
    const buttonText = deviceType === 'mobile' ? '🎧 Аудіо' : '🎧 Слухати онлайн';
    formatButtons.push(Markup.button.url(buttonText, (book as any).audio_external_link));
  }

  // Розбиваємо формати на рядки залежно від пристрою
  if (formatButtons.length > 0) {
    const buttonsPerRow = deviceType === 'mobile' ? 2 : deviceType === 'tablet' ? 3 : 4;
    for (let i = 0; i < formatButtons.length; i += buttonsPerRow) {
      keyboard.push(formatButtons.slice(i, i + buttonsPerRow));
    }
  }

  // Дії з книгою
  const actionButtons: any[] = [];

  // Кнопка збереження
  if (isSaved) {
    const buttonText = deviceType === 'mobile' ? '❤️' : '❤️ Збережено';
    actionButtons.push(Markup.button.callback(buttonText, `save_${book.id}`));
  } else {
    const buttonText = deviceType === 'mobile' ? '💾' : '💾 Зберегти';
    actionButtons.push(Markup.button.callback(buttonText, `save_${book.id}`));
  }

  // Кнопка оцінки
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

  // Додаткові дії
  const buttonText1 = deviceType === 'mobile' ? '📊' : '📊 Відгуки';
  const buttonText2 = deviceType === 'mobile' ? '🔍' : '🔍 Схожі';
  actionButtons.push(Markup.button.callback(buttonText1, `reviews_${book.id}`));
  actionButtons.push(Markup.button.callback(buttonText2, `similar_${book.id}`));

  // Розбиваємо дії на рядки
  const actionsPerRow = deviceType === 'mobile' ? 2 : deviceType === 'tablet' ? 3 : 4;
  for (let i = 0; i < actionButtons.length; i += actionsPerRow) {
    keyboard.push(actionButtons.slice(i, i + actionsPerRow));
  }

  return Markup.inlineKeyboard(keyboard).reply_markup;
};

// Enhanced book interaction keyboard with all features (multi-format support)
// Стара версія для зворотної сумісності
export const getEnhancedBookKeyboard = (book: Book, isSaved: boolean = false) => {
  const keyboard: any[][] = [];

  // Перший рядок - доступні формати (динамічно)
  const formatRow: any[] = [];

  // Файл книги (PDF, EPUB, MOBI, FB2 тощо)
  // Перевіряємо чи є file_url (нове поле) або pdf_file_id (старе поле)
  if (book.file_url || (book as any).pdf_file_id) {
    // Визначаємо формат файлу
    const format = (book as any).file_format || 'PDF';
    const buttonText = `📥 Завантажити (${format})`;
    formatRow.push(Markup.button.callback(buttonText, `download_pdf_${book.id}`));
  }

  // Аудіокнига - перевіряємо audio_file_id (нове поле)
  if ((book as any).audio_file_id) {
    formatRow.push(Markup.button.callback('🎧 Слухати', `download_audio_${book.id}`));
  } else if ((book as any).audio_external_link) {
    // Для великих аудіофайлів (> 50 МБ) - посилання
    formatRow.push(Markup.button.url('🎧 Слухати онлайн', (book as any).audio_external_link));
  }

  // Онлайн посилання - перевіряємо online_link (нове поле)
  if ((book as any).online_link) {
    formatRow.push(Markup.button.url('🌐 Читати онлайн', (book as any).online_link));
  } else if ((book as any).external_link) {
    // Старе поле для зворотної сумісності
    formatRow.push(Markup.button.url('🌐 Читати онлайн', (book as any).external_link));
  }

  // Додаємо формати по 2 в рядок для кращого вигляду
  if (formatRow.length > 0) {
    if (formatRow.length <= 2) {
      keyboard.push(formatRow);
    } else {
      keyboard.push(formatRow.slice(0, 2));
      keyboard.push(formatRow.slice(2));
    }
  }

  // Другий рядок - оцінка та збереження з красивими іконками
  const actionRow = [];

  // Кнопка збереження з динамічним текстом
  if (isSaved) {
    actionRow.push(Markup.button.callback('❤️ Збережено', `save_${book.id}`));
  } else {
    actionRow.push(Markup.button.callback('💾 Зберегти', `save_${book.id}`));
  }

  // Кнопка оцінки
  if (book.rating && book.rating > 0) {
    actionRow.push(
      Markup.button.callback(`⭐ ${book.rating.toFixed(1)} Оцінити`, `rate_${book.id}`)
    );
  } else {
    actionRow.push(Markup.button.callback('⭐ Оцінити', `rate_${book.id}`));
  }

  keyboard.push(actionRow);

  // Третій рядок - додаткові дії
  keyboard.push([
    Markup.button.callback('📊 Відгуки', `reviews_${book.id}`),
    Markup.button.callback('🔍 Схожі книги', `similar_${book.id}`),
  ]);

  // Персистентне меню завжди доступне - немає потреби в кнопці "Назад"

  return Markup.inlineKeyboard(keyboard).reply_markup;
};

export const getBackKeyboard = () => {
  // Персистентне меню завжди доступне
  return Markup.removeKeyboard().reply_markup;
};
