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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../../utils/logger");
const timeouts_1 = require("../../constants/timeouts");
const dbPath = process.env.DB_PATH || './database/library.db';
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
    logger_1.logger.info('Created database directory', { path: dbDir });
}
exports.db = new sqlite3_1.default.Database(dbPath);
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
exports.db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = ${timeouts_1.TIMEOUTS.DATABASE_BUSY};
  PRAGMA journal_mode = WAL;
`, (err) => {
    if (err) {
        if (!isTestEnv) {
            logger_1.logger.error('Error configuring SQLite PRAGMA', err);
        }
    }
    else {
        if (!isTestEnv) {
            logger_1.logger.info('SQLite PRAGMA configured', {
                foreign_keys: 'ON',
                busy_timeout: timeouts_1.TIMEOUTS.DATABASE_BUSY,
                journal_mode: 'WAL',
            });
        }
        if (!isTestEnv) {
            try {
                exports.db.get('PRAGMA integrity_check;', (checkErr, row) => {
                    if (checkErr) {
                        logger_1.logger.error('Integrity check failed to execute', {
                            error: String(checkErr?.message || checkErr),
                        });
                        logger_1.logger.error('Database may be corrupted. Please recover from backup or run: node scripts/repair-database.js');
                        const gracefulShutdown = async () => {
                            try {
                                await new Promise((resolve) => {
                                    exports.db.close((err) => {
                                        if (err)
                                            logger_1.logger.error('Error closing database during integrity check failure', err);
                                        resolve();
                                    });
                                });
                                await new Promise((resolve) => setTimeout(resolve, 1000));
                                process.exit(1);
                            }
                            catch (error) {
                                logger_1.logger.error('Error during graceful shutdown after integrity check failure', error);
                                process.exit(1);
                            }
                        };
                        gracefulShutdown();
                        return;
                    }
                    const result = (row && (row.integrity_check || row[Object.keys(row)[0]]));
                    if (!result || String(result).toLowerCase() !== 'ok') {
                        logger_1.logger.error('Database integrity check failed', {
                            error: 'sqlite_corrupt',
                            integrityResult: result,
                            dbPath: dbPath,
                        });
                        logger_1.logger.error('The database file appears to be corrupted.');
                        logger_1.logger.error('Recovery options:');
                        logger_1.logger.error('  1. Restore from backup: Check database/backup_*.db files');
                        logger_1.logger.error('  2. Run repair script: node scripts/repair-database.js');
                        logger_1.logger.error('  3. If database is empty, delete it and let the app recreate it');
                        const gracefulShutdown = async () => {
                            try {
                                await new Promise((resolve) => {
                                    exports.db.close((err) => {
                                        if (err)
                                            logger_1.logger.error('Error closing database during integrity check failure', err);
                                        resolve();
                                    });
                                });
                                await new Promise((resolve) => setTimeout(resolve, 1000));
                                process.exit(1);
                            }
                            catch (error) {
                                logger_1.logger.error('Error during graceful shutdown after integrity check failure', error);
                                process.exit(1);
                            }
                        };
                        gracefulShutdown();
                    }
                });
            }
            catch (e) {
                logger_1.logger.warn('Integrity check could not be performed', {
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }
    }
});
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        const createBooksTable = `
      CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          genre TEXT NOT NULL,
          description TEXT,
          photo_file_id TEXT NOT NULL,
          file_url TEXT,
          file_type TEXT DEFAULT 'physical',
          file_name TEXT,
          rating REAL DEFAULT 0,
          reviews_count INTEGER DEFAULT 0,
          downloads_count INTEGER DEFAULT 0,
          is_available BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
        const createAdminsTable = `
      CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
        const createReviewsTable = `
      CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          user_name TEXT,
          rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
          comment TEXT,
          is_published BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `;
        const createSavedBooksTable = `
      CREATE TABLE IF NOT EXISTS saved_books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          book_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES books (id),
          UNIQUE(user_id, book_id)
      );
    `;
        const createFeedbackTable = `
      CREATE TABLE IF NOT EXISTS feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          admin_reply TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          read_at DATETIME
      );
    `;
        const createUserStatsTable = `
      CREATE TABLE IF NOT EXISTS user_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          books_read INTEGER DEFAULT 0,
          reviews_written INTEGER DEFAULT 0,
          favorite_genre TEXT,
          last_active DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
        const createPromoCodesTable = `
      CREATE TABLE IF NOT EXISTS promo_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          description TEXT,
          promo_type TEXT DEFAULT 'yakaboo_unlimited',
          is_active INTEGER DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
        const createUsedPromoCodesTable = `
      CREATE TABLE IF NOT EXISTS used_promo_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          promo_code_id INTEGER NOT NULL,
          used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
          UNIQUE(user_id, promo_code_id)
      );
    `;
        const createBookRatingStatsTable = `
      CREATE TABLE IF NOT EXISTS book_rating_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER UNIQUE NOT NULL,
          rating_1_count INTEGER DEFAULT 0,
          rating_2_count INTEGER DEFAULT 0,
          rating_3_count INTEGER DEFAULT 0,
          rating_4_count INTEGER DEFAULT 0,
          rating_5_count INTEGER DEFAULT 0,
          readers_count INTEGER DEFAULT 0,
          popular_quotes TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `;
        const createAudioProgressTable = `
      CREATE TABLE IF NOT EXISTS audio_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          book_id INTEGER NOT NULL,
          chapter_id INTEGER,
          position INTEGER DEFAULT 0,
          total_listened INTEGER DEFAULT 0,
          last_listened_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES books (id),
          UNIQUE(user_id, book_id, chapter_id)
      );
    `;
        const createPodcastsTable = `
      CREATE TABLE IF NOT EXISTS podcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theme TEXT NOT NULL,
        description TEXT NOT NULL,
        file_type TEXT NOT NULL CHECK(file_type IN ('audio', 'link', 'archive')),
        file_url TEXT,
        file_id TEXT,
        file_name TEXT,
        file_size INTEGER,
        duration INTEGER,
        cover_photo_id TEXT,
        rating REAL DEFAULT 0,
        listens_count INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
        const createPodcastReviewsTable = `
      CREATE TABLE IF NOT EXISTS podcast_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        podcast_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        is_published BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE,
        UNIQUE(podcast_id, user_id)
      );
    `;
        const createPodcastListensTable = `
      CREATE TABLE IF NOT EXISTS podcast_listens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        podcast_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        listened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE
      );
    `;
        const createBookRequestsTable = `
      CREATE TABLE IF NOT EXISTS book_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_title TEXT NOT NULL,
        book_author TEXT NOT NULL,
        book_genre TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'issued', 'returned', 'overdue')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        comment TEXT,
        admin_comment TEXT,
        issued_at DATETIME,
        due_date DATETIME,
        returned_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES admins(id)
      );
    `;
        const createTagsTable = `
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
        const createBookTagsTable = `
      CREATE TABLE IF NOT EXISTS book_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
        UNIQUE(book_id, tag_id)
      );
    `;
        const createBookOrdersTable = `
      CREATE TABLE IF NOT EXISTS book_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        callsign TEXT NOT NULL,
        unit TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
      );
    `;
        const alterBooksTableQueries = [
            'ALTER TABLE books ADD COLUMN pdf_file_id TEXT;',
            'ALTER TABLE books ADD COLUMN audio_file_id TEXT;',
            'ALTER TABLE books ADD COLUMN audio_duration INTEGER;',
            'ALTER TABLE books ADD COLUMN audio_external_link TEXT;',
            'ALTER TABLE books ADD COLUMN narrator TEXT;',
            'ALTER TABLE books ADD COLUMN online_link TEXT;',
            'ALTER TABLE books ADD COLUMN external_link TEXT;',
            'ALTER TABLE books ADD COLUMN recommended_age INTEGER;',
            'ALTER TABLE books ADD COLUMN content_warnings TEXT;',
            'ALTER TABLE books ADD COLUMN isbn TEXT;',
            "ALTER TABLE books ADD COLUMN language TEXT DEFAULT 'Українська';",
            'ALTER TABLE books ADD COLUMN is_physically_available INTEGER DEFAULT 0;',
            'ALTER TABLE books ADD COLUMN epub_file_id TEXT;',
            'ALTER TABLE books ADD COLUMN epub_url TEXT;',
        ];
        const alterPromoCodesTableQueries = [
            'ALTER TABLE promo_codes ADD COLUMN description TEXT;',
            "ALTER TABLE promo_codes ADD COLUMN promo_type TEXT DEFAULT 'yakaboo_unlimited';",
            'ALTER TABLE promo_codes ADD COLUMN is_active INTEGER DEFAULT 1;',
            'ALTER TABLE promo_codes ADD COLUMN created_by INTEGER;',
        ];
        exports.db.serialize(() => {
            exports.db.run(createBooksTable);
            exports.db.run(createAdminsTable);
            exports.db.run(createReviewsTable);
            exports.db.run(createSavedBooksTable);
            exports.db.run(createFeedbackTable);
            exports.db.run(createUserStatsTable);
            exports.db.run(createPromoCodesTable);
            exports.db.run(createUsedPromoCodesTable);
            exports.db.run(createBookRatingStatsTable);
            exports.db.run(createAudioProgressTable);
            exports.db.run(createPodcastsTable);
            exports.db.run(createPodcastReviewsTable);
            exports.db.run(createPodcastListensTable);
            exports.db.run(createBookRequestsTable);
            exports.db.run(createTagsTable);
            exports.db.run(createBookTagsTable);
            exports.db.run(createBookOrdersTable);
            Promise.resolve().then(() => __importStar(require('./physicalBooks'))).then(({ initPhysicalBooksSystem }) => {
                initPhysicalBooksSystem().catch((err) => {
                    logger_1.logger.error('Error initializing physical books system', err);
                });
            });
            alterBooksTableQueries.forEach((query) => {
                exports.db.run(query, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        logger_1.logger.warn('ALTER TABLE warning', { error: err.message });
                    }
                });
            });
            alterPromoCodesTableQueries.forEach((query) => {
                exports.db.run(query, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        logger_1.logger.warn('ALTER TABLE promo_codes warning', { error: err.message });
                    }
                });
            });
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcasts_theme ON podcasts(theme)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcasts_rating ON podcasts(rating)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcasts_available ON podcasts(is_available)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcast_reviews_podcast ON podcast_reviews(podcast_id)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcast_reviews_user ON podcast_reviews(user_id)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcast_reviews_published ON podcast_reviews(is_published)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcast_listens_podcast ON podcast_listens(podcast_id)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_podcast_listens_user ON podcast_listens(user_id)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_user ON book_requests(user_id)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_status ON book_requests(status)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_priority ON book_requests(priority)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_due_date ON book_requests(due_date)');
            exports.db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_created_at ON book_requests(created_at)');
            exports.db.get('SELECT COUNT(*) as count FROM books', async (err, row) => {
                if (err) {
                    logger_1.logger.error('Error checking books count', err);
                    reject(err);
                }
                else {
                    const booksCount = row?.count || 0;
                    let seededBooksCount = 0;
                    logger_1.logger.info('Database initialized successfully', {
                        booksCount: booksCount + seededBooksCount,
                    });
                    resolve();
                }
            });
        });
    });
};
exports.initDatabase = initDatabase;
//# sourceMappingURL=db.js.map