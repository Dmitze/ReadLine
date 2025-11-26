export declare const BUTTONS: {
    readonly CATALOG: "📖 Каталог";
    readonly CATALOG_OLD: "📖 Перегляд каталогу";
    readonly TOP_BOOKS: "🏆 Топ книги";
    readonly NEW_BOOKS: "🆕 Новинки";
    readonly MY_LIBRARY: "💾 Моя бібліотека";
    readonly PROFILE: "👤 Профіль";
    readonly PROFILE_OLD: "👤 Мій профіль";
    readonly HELP: "ℹ️ Допомога";
    readonly AI_ASSISTANT: "🤖 AI Помічник";
    readonly FEEDBACK: "📞 Зворотній зв'язок";
    readonly REQUEST_PHYSICAL_BOOK: "📚 Замовити фізичну книгу";
    readonly BACK: "⬅️ Назад";
    readonly HOME: "🏠 На головну";
    readonly QUICK_SEARCH: "⚡ Швидкий пошук";
    readonly MY_FAVORITES: "⭐ Мої улюблені";
    readonly RANDOM_BOOK: "🎲 Випадкова книга";
};
export declare const ERRORS: {
    readonly GENERIC: "❌ Виникла помилка. Спробуйте ще раз.";
    readonly NO_GENRES: "❌ Виникла помилка при отриманні жанрів.";
    readonly NO_BOOKS: "❌ Виникла помилка при отриманні книг.";
    readonly NO_TOP_BOOKS: "❌ Виникла помилка при отриманні топ книг.";
    readonly NO_NEW_BOOKS: "❌ Виникла помилка при отриманні новинок.";
    readonly NO_SAVED_BOOKS: "❌ Виникла помилка при отриманні збережених книг.";
    readonly NO_ADMIN_ACCESS: "❌ У вас немає доступу до адмін-панелі.";
    readonly BOT_TOKEN_MISSING: "❌ ПОМИЛКА: BOT_TOKEN не знайдено в змінних оточення!";
    readonly AI_NOT_AVAILABLE: "❌ AI-помічник недоступний";
    readonly AI_ERROR: "❌ Помилка AI";
    readonly FEEDBACK_ERROR: "❌ Виникла помилка при відправці повідомлення.";
    readonly SAVE_ERROR: "❌ Помилка при збереженні";
    readonly DOWNLOAD_ERROR: "❌ Помилка при завантаженні";
    readonly REVIEW_ERROR: "❌ Помилка при отриманні відгуків";
    readonly USER_NOT_FOUND: "❌ Користувача не знайдено";
    readonly RATE_LIMIT: "⚠️ Занадто багато запитів";
};
export declare const SUCCESS: {
    readonly BOOK_SAVED: "❤️ Збережено!";
    readonly BOOK_UNSAVED: "💔 Видалено зі збережених";
    readonly FEEDBACK_SENT: "✅ Повідомлення надіслано!";
    readonly REVIEW_SUBMITTED: "✅ Дякуємо за відгук!";
    readonly FILE_SENT: "📥 Файл надіслано вам у приватні повідомлення";
};
export declare const EMOJI: {
    readonly BOOK: "📖";
    readonly SEARCH: "🔍";
    readonly STAR: "⭐";
    readonly NEW: "🆕";
    readonly SAVE: "💾";
    readonly PROFILE: "👤";
    readonly HELP: "ℹ️";
    readonly AI: "🤖";
    readonly PHONE: "📞";
    readonly SUCCESS: "✅";
    readonly ERROR: "❌";
    readonly WARNING: "⚠️";
    readonly LOADING: "🤔";
    readonly TROPHY: "🏆";
    readonly BELL: "🔔";
};
export declare const STATUS: {
    readonly PENDING: "pending";
    readonly APPROVED: "approved";
    readonly REJECTED: "rejected";
};
export declare const FILE_TYPES: {
    readonly PHYSICAL: "physical";
    readonly LINK: "link";
    readonly FILE: "file";
};
export declare const SCENES: {
    readonly ADD_BOOK: "ADD_BOOK_SCENE";
    readonly SEARCH: "SEARCH_SCENE";
    readonly PROFILE: "PROFILE_SCENE";
    readonly RATE_BOOK: "RATE_BOOK_SCENE";
    readonly FEEDBACK: "FEEDBACK_SCENE";
    readonly AI: "AI_SCENE";
};
export declare const CONFIG: {
    readonly PAGINATION_LIMIT: 5;
    readonly MAX_TOP_BOOKS: 10;
    readonly MAX_NEW_BOOKS: 10;
    readonly MAX_SEARCH_RESULTS: 10;
    readonly MAX_REVIEWS_SHOWN: 5;
    readonly MIN_SEARCH_LENGTH: 2;
    readonly MAX_SEARCH_LENGTH: 100;
    readonly DEFAULT_BOOK_COVER: "default_book_cover";
    readonly MAX_FILE_SIZE_MB: 50;
    readonly BOOKS_PER_PAGE: 5;
    readonly AI_TIMEOUT_MS: 25000;
    readonly AI_MAX_BOOKS: 1000;
    readonly NOTIFICATION_DELAY_MS: 1000;
    readonly BATCH_SIZE: 10;
    readonly BATCH_DELAY_MS: 2000;
    readonly RETRY_ATTEMPTS: 3;
    readonly RETRY_DELAY_MS: 1000;
    readonly OPERATION_TIMEOUT_MS: 30000;
    readonly MAX_SAVED_BOOKS_DISPLAY: 20;
    readonly MAX_ANALYTICS_SIZE: 500;
    readonly ANALYTICS_CLEANUP_THRESHOLD: 0.2;
};
export declare const VALIDATION: {
    readonly TITLE_MIN: 2;
    readonly TITLE_MAX: 200;
    readonly AUTHOR_MIN: 2;
    readonly AUTHOR_MAX: 100;
    readonly DESCRIPTION_MIN: 10;
    readonly DESCRIPTION_MAX: 1000;
    readonly COMMENT_MAX: 500;
    readonly TAG_MIN: 2;
    readonly TAG_MAX: 50;
    readonly RATING_MIN: 1;
    readonly RATING_MAX: 5;
    readonly MESSAGE_MAX: 4000;
};
export declare const TIME_OF_DAY: {
    readonly MORNING_START: 6;
    readonly AFTERNOON_START: 12;
    readonly EVENING_START: 18;
    readonly NIGHT_START: 22;
};
export declare const COMMANDS: {
    readonly START: "start";
    readonly HELP: "help";
    readonly ADMIN: "admin";
    readonly CANCEL: "cancel";
};
export * from './timeouts';
export * from './limits';
export declare const AI_MESSAGES: {
    readonly FALLBACK_RECOMMENDATIONS: readonly ["Рекомендую почати з класичної української літератури: \"Кобзар\" Тараса Шевченка або \"Лісова пісня\" Лесі Українки.", "Залежить від вашого настрою! Для відпочинку - романтика, для пригод - фантастика, для роздумів - філософія.", "Серед українських авторів рекомендую: Тарас Шевченко, Леся Українка, Іван Франко, Михайло Коцюбинський.", "Цікаве питання! Спробуйте переглянути наш каталог книг або скористайтеся пошуком за жанрами."];
    readonly SUMMARIES: readonly ["Захоплююча історія, яка не залишить вас байдужими.", "Чудова книга з неочікуваними поворотами сюжету.", "Майстерно написана робота автора.", "Книга, яка змінить ваше уявлення про жанр.", "Неперевершений твір, який поєднує в собі найкращі традиції жанру."];
    readonly RECOMMENDATION_REASONS: {
        readonly FAVORITE_GENRE: "Рекомендую, оскільки вам подобається жанр";
        readonly HIGH_RATING: "Високий рейтинг - читачі в захваті!";
        readonly POPULAR: "Популярна книга - завантажили багато разів";
        readonly INTERESTING: "Цікава книга від талановитого автора";
    };
};
export declare const ACTIONS: {
    readonly ADD_BOOK: "add_book";
    readonly ADMIN_STATS: "admin_stats";
    readonly MODERATE_REVIEWS: "moderate_reviews";
    readonly SAVE_PREFIX: "save_";
    readonly DOWNLOAD_PREFIX: "download_";
    readonly REVIEWS_PREFIX: "reviews_";
    readonly SIMILAR_PREFIX: "similar_";
    readonly RATE_PREFIX: "rate_";
    readonly PUBLISH_REVIEW_PREFIX: "publish_review_";
    readonly DELETE_REVIEW_PREFIX: "delete_review_";
    readonly VIEW_FEEDBACK: "view_feedback";
    readonly MARK_FEEDBACK_READ_PREFIX: "mark_feedback_read_";
};
//# sourceMappingURL=index.d.ts.map