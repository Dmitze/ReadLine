"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIONS = exports.AI_MESSAGES = exports.COMMANDS = exports.TIME_OF_DAY = exports.VALIDATION = exports.CONFIG = exports.SCENES = exports.FILE_TYPES = exports.STATUS = exports.UX = exports.EMOJI = exports.SUCCESS = exports.ERRORS = exports.BUTTONS = void 0;
exports.BUTTONS = {
    CATALOG: '📖 Каталог',
    SEARCH: '🔍 Пошук',
    CATALOG_OLD: '📖 Перегляд каталогу',
    TOP_BOOKS: '🏆 Топ книги',
    NEW_BOOKS: '🆕 Новинки',
    MY_LIBRARY: '💾 Моя бібліотека',
    PROFILE: '👤 Профіль',
    PROFILE_OLD: '👤 Мій профіль',
    HELP: 'ℹ️ Допомога',
    AI_ASSISTANT: '🤖 AI Помічник',
    SETTINGS: '⚙️ Налаштування',
    PROMO: '🎁 Отримати промокод',
    YAKABOO: '🌐 Yakaboo',
    FEEDBACK: "📞 Зворотний зв'язок",
    REQUEST_PHYSICAL_BOOK: '📚 Замовити фізичну книгу',
    HOME: '🏠 На головну',
    BACK: '⬅️ Назад',
    QUICK_SEARCH: '⚡ Швидкий пошук',
    MY_FAVORITES: '⭐ Мої улюблені',
    RANDOM_BOOK: '🎲 Випадкова книга',
};
exports.ERRORS = {
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
};
exports.SUCCESS = {
    BOOK_SAVED: '❤️ Збережено!',
    BOOK_UNSAVED: '💔 Видалено зі збережених',
    FEEDBACK_SENT: '✅ Повідомлення надіслано!',
    REVIEW_SUBMITTED: '✅ Дякуємо за відгук!',
    FILE_SENT: '📥 Файл надіслано вам у приватні повідомлення',
};
exports.EMOJI = {
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
};
exports.UX = {
    welcomeBack: (nameSafe) => `<b>Warrior's Library</b>\n` +
        `З поверненням, <b>${nameSafe}</b>.\n\n` +
        `<i>Головне — у кнопках нижче. Швидкі команди — меню Telegram (☰ /).</i>`,
    errorGlobalHtml: `<b>Не вдалося обробити запит</b>\n\n` +
        `• /start — оновити сесію\n` +
        `• Спробуйте ще раз за хвилину\n` +
        `• Якщо повторюється — напишіть адміністратору`,
    navHomeTitle: '🏠 На головній',
    navHomeBody: 'Оберіть дію в меню нижче.',
    navBackTitle: 'Назад',
    navBackBody: 'Повернулись на крок назад.',
    cancelStep: 'Скасовано. Далі — оберіть дію в меню знизу.',
    helpHubHtml: `<b>Warrior's Library</b> · довідка\n\n` + `Короткі відповіді, без зайвого. Оберіть тему:`,
    yakabooTeaserHtml: `<b>Yakaboo</b> · книжкова платформа України\n\n` +
        `75 000+ електронних і паперових книг. Сайт і застосунки для читання.`,
    listOpenCardHint: 'Торкніться рядка — відкриється картка з файлами та відгуками.',
    topListTitle: 'Топ за рейтингом',
    newListTitle: 'Новинки',
    savedListTitle: 'Моя бібліотека',
    emptyTop: '📭 Поки немає оцінених книг.\n\nСтаньте першим — відкрийте будь-яку книгу та поставте ⭐.',
    emptyNew: '📭 Новинок ще немає. Загляньте в Каталог або натисніть «Топ книги».',
    emptyLibraryHtml: `<b>Тут поки порожньо</b>\n\n` +
        `У картці книги натисніть «Зберегти» — і вона з’явиться тут (до 20 книг).`,
    searchEmptyHtml: (querySafe) => `<b>Нічого не знайдено</b>\n\n` +
        `Запит: «${querySafe}»\n\n` +
        `Спробуйте інше слово, автора або жанр. Мінімум 2 символи в запиті.`,
};
exports.STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
};
exports.FILE_TYPES = {
    PHYSICAL: 'physical',
    LINK: 'link',
    FILE: 'file',
};
exports.SCENES = {
    ADD_BOOK: 'ADD_BOOK_SCENE',
    SEARCH: 'SEARCH_SCENE',
    PROFILE: 'PROFILE_SCENE',
    RATE_BOOK: 'RATE_BOOK_SCENE',
    FEEDBACK: 'FEEDBACK_SCENE',
    AI: 'AI_SCENE',
};
exports.CONFIG = {
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
};
exports.VALIDATION = {
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
};
exports.TIME_OF_DAY = {
    MORNING_START: 6,
    AFTERNOON_START: 12,
    EVENING_START: 18,
    NIGHT_START: 22,
};
exports.COMMANDS = {
    START: 'start',
    HELP: 'help',
    ADMIN: 'admin',
    CANCEL: 'cancel',
};
__exportStar(require("./timeouts"), exports);
__exportStar(require("./limits"), exports);
exports.AI_MESSAGES = {
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
};
exports.ACTIONS = {
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
};
//# sourceMappingURL=index.js.map