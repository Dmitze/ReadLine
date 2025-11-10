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
  REQUEST: '📋',
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
  // REQUEST_BOOK видалено
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
  DEFAULT_BOOK_COVER: 'default_book_cover',
} as const;

// Команди
export const COMMANDS = {
  START: 'start',
  HELP: 'help',
  ADMIN: 'admin',
  CANCEL: 'cancel',
} as const;

// Callback actions
export const ACTIONS = {
  // VIEW_REQUESTS, APPROVE, REJECT, ORDER видалені
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
