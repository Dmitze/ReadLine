/**
 * Константи для бота - усі тексти в одному місці
 */

// Кнопки головного меню
export const BUTTONS = {
  CATALOG: '📖 Каталог',
  CATALOG_OLD: '📖 Перегляд каталогу',
  TOP_BOOKS: '🏆 Топ книги',
  NEW_BOOKS: '🆕 Новинки',
  MY_LIBRARY: '💾 Моя бібліотека',
  PROFILE: '👤 Профіль',
  PROFILE_OLD: '👤 Мій профіль',
  HELP: 'ℹ️ Допомога',
  AI_ASSISTANT: '🤖 AI Помічник',
  FEEDBACK: '📞 Зворотній зв\'язок',
  BACK: '⬅️ Назад',
  HOME: '🏠 На головну',
  // Швидкі дії
  QUICK_SEARCH: '⚡ Швидкий пошук',
  MY_FAVORITES: '⭐ Мої улюблені',
  RANDOM_BOOK: '🎲 Випадкова книга',
} as const;

// Повідомлення помилок
export const ERRORS = {
  GENERIC: '❌ Виникла помилка. Спробуйте ще раз.',
  NO_GENRES: '❌ Виникла помилка при отриманні жанрів.',
  NO_BOOKS: '❌ Виникла помилка при отриманні книг.',
  NO_TOP_BOOKS: '❌ Виникла помилка при отриманні топ книг.',
  NO_NEW_BOOKS: '❌ Виникла помилка при отриманні новинок.',
  NO_SAVED_BOOKS: '❌ Виникла помилка при отриманні збережених книг.',
  NO_ADMIN_ACCESS: '❌ У вас немає доступу до адмін-панелі.',
  BOT_TOKEN_MISSING: '❌ ПОМИЛКА: BOT_TOKEN не знайдено в змінних оточення!',
  AI_NOT_AVAILABLE: '❌ AI-помічник недоступний',
  AI_ERROR: '❌ Помилка AI',
  FEEDBACK_ERROR: '❌ Виникла помилка при відправці повідомлення.',
  SAVE_ERROR: '❌ Помилка при збереженні',
  DOWNLOAD_ERROR: '❌ Помилка при завантаженні',
  REVIEW_ERROR: '❌ Помилка при отриманні відгуків',
  USER_NOT_FOUND: '❌ Користувача не знайдено',
  RATE_LIMIT: '⚠️ Занадто багато запитів',
} as const;

// Успішні повідомлення
export const SUCCESS = {
  BOOK_SAVED: '❤️ Збережено!',
  BOOK_UNSAVED: '💔 Видалено зі збережених',
  FEEDBACK_SENT: '✅ Повідомлення надіслано!',
  REVIEW_SUBMITTED: '✅ Дякуємо за відгук!',
  FILE_SENT: '📥 Файл надіслано вам у приватні повідомлення',
} as const;

// Емодзі
export const EMOJI = {
  BOOK: '📖',
  SEARCH: '🔍',
  STAR: '⭐',
  NEW: '🆕',
  SAVE: '💾',
  PROFILE: '👤',
  HELP: 'ℹ️',
  AI: '🤖',
  PHONE: '📞',
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  LOADING: '🤔',
  TROPHY: '🏆',
  BELL: '🔔',
} as const;

// Статуси
export const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Типи файлів
export const FILE_TYPES = {
  PHYSICAL: 'physical',
  LINK: 'link',
  FILE: 'file',
} as const;

// Сцени
export const SCENES = {
  ADD_BOOK: 'ADD_BOOK_SCENE',
  SEARCH: 'SEARCH_SCENE',
  PROFILE: 'PROFILE_SCENE',
  RATE_BOOK: 'RATE_BOOK_SCENE',
  FEEDBACK: 'FEEDBACK_SCENE',
  AI: 'AI_SCENE',
} as const;

// Конфігурація
export const CONFIG = {
  PAGINATION_LIMIT: 5,
  MAX_TOP_BOOKS: 10,
  MAX_NEW_BOOKS: 10,
  MAX_SEARCH_RESULTS: 10,
  MAX_REVIEWS_SHOWN: 5,
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_LENGTH: 100,
  DEFAULT_BOOK_COVER: 'default_book_cover',
  MAX_FILE_SIZE_MB: 50,
  BOOKS_PER_PAGE: 5,
  AI_TIMEOUT_MS: 25000,
  AI_MAX_BOOKS: 1000,
  NOTIFICATION_DELAY_MS: 1000,
  BATCH_SIZE: 10,
  BATCH_DELAY_MS: 2000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  OPERATION_TIMEOUT_MS: 30000,
  MAX_SAVED_BOOKS_DISPLAY: 20,
  MAX_ANALYTICS_SIZE: 500,
  ANALYTICS_CLEANUP_THRESHOLD: 0.2,
} as const;

// Validation limits
export const VALIDATION = {
  TITLE_MIN: 2,
  TITLE_MAX: 200,
  AUTHOR_MIN: 2,
  AUTHOR_MAX: 100,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 1000,
  COMMENT_MAX: 500,
  TAG_MIN: 2,
  TAG_MAX: 50,
  RATING_MIN: 1,
  RATING_MAX: 5,
  MESSAGE_MAX: 4000,
} as const;

// ✅ ВИПРАВЛЕНО #42: константи для часу доби
export const TIME_OF_DAY = {
  MORNING_START: 6,
  AFTERNOON_START: 12,
  EVENING_START: 18,
  NIGHT_START: 22,
} as const;

// Команди
export const COMMANDS = {
  START: 'start',
  HELP: 'help',
  ADMIN: 'admin',
  CANCEL: 'cancel',
} as const;

// ✅ REFACTOR-011: Export additional constants
export * from './timeouts';
export * from './limits';

// ✅ ВИПРАВЛЕНО #10: AI повідомлення винесені в константи
export const AI_MESSAGES = {
  FALLBACK_RECOMMENDATIONS: [
    'Рекомендую почати з класичної української літератури: "Кобзар" Тараса Шевченка або "Лісова пісня" Лесі Українки.',
    'Залежить від вашого настрою! Для відпочинку - романтика, для пригод - фантастика, для роздумів - філософія.',
    'Серед українських авторів рекомендую: Тарас Шевченко, Леся Українка, Іван Франко, Михайло Коцюбинський.',
    'Цікаве питання! Спробуйте переглянути наш каталог книг або скористайтеся пошуком за жанрами.',
  ],
  SUMMARIES: [
    'Захоплююча історія, яка не залишить вас байдужими.',
    'Чудова книга з неочікуваними поворотами сюжету.',
    'Майстерно написана робота автора.',
    'Книга, яка змінить ваше уявлення про жанр.',
    'Неперевершений твір, який поєднує в собі найкращі традиції жанру.',
  ],
  RECOMMENDATION_REASONS: {
    FAVORITE_GENRE: 'Рекомендую, оскільки вам подобається жанр',
    HIGH_RATING: 'Високий рейтинг - читачі в захваті!',
    POPULAR: 'Популярна книга - завантажили багато разів',
    INTERESTING: 'Цікава книга від талановитого автора',
  },
} as const;

// Callback actions
export const ACTIONS = {
  ADD_BOOK: 'add_book',
  ADMIN_STATS: 'admin_stats',
  MODERATE_REVIEWS: 'moderate_reviews',
  SAVE_PREFIX: 'save_',
  DOWNLOAD_PREFIX: 'download_',
  REVIEWS_PREFIX: 'reviews_',
  SIMILAR_PREFIX: 'similar_',
  RATE_PREFIX: 'rate_',
  PUBLISH_REVIEW_PREFIX: 'publish_review_',
  DELETE_REVIEW_PREFIX: 'delete_review_',
  VIEW_FEEDBACK: 'view_feedback',
  MARK_FEEDBACK_READ_PREFIX: 'mark_feedback_read_',
} as const;
