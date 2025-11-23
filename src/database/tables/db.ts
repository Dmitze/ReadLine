/**
 * Database Connection
 * REFACTOR-009: Split models.ts - DB connection and initialization
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { TIMEOUTS } from '../../constants/timeouts';

declare var process: {
  env: {
    DB_PATH?: string;
    NODE_ENV?: string;
    JEST_WORKER_ID?: string;
  };
  exit(code?: number): never;
};

// Initialize database
const dbPath = process.env.DB_PATH || './database/library.db';

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info('Created database directory', { path: dbDir });
}

export const db = new sqlite3.Database(dbPath);

// Configure SQLite PRAGMA
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

db.exec(
  `
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = ${TIMEOUTS.DATABASE_BUSY};
  PRAGMA journal_mode = WAL;
`,
  (err) => {
    if (err) {
      if (!isTestEnv) {
        logger.error('Error configuring SQLite PRAGMA', err);
      }
    } else {
      if (!isTestEnv) {
        logger.info('SQLite PRAGMA configured', {
          foreign_keys: 'ON',
          busy_timeout: TIMEOUTS.DATABASE_BUSY,
          journal_mode: 'WAL',
        });
      }

      // Integrity check: fail fast if DB is corrupted
      // Skip in test environment to avoid killing test process and async logging issues
      if (!isTestEnv) {
        try {
          db.get('PRAGMA integrity_check;', (checkErr: any, row: any) => {
            if (checkErr) {
              logger.error('Integrity check failed to execute', { error: String(checkErr?.message || checkErr) });
              logger.error('Database may be corrupted. Please recover from backup or run: node scripts/repair-database.js');

              // ✅ Graceful shutdown замість process.exit
              const gracefulShutdown = async () => {
                try {
                  // Закрити всі з'єднання з БД
                  await new Promise<void>((resolve) => {
                    db.close((err) => {
                      if (err) logger.error('Error closing database during integrity check failure', err);
                      resolve();
                    });
                  });

                  // Дати час на завершення операцій
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  process.exit(1);
                } catch (error) {
                  logger.error('Error during graceful shutdown after integrity check failure', error);
                  process.exit(1);
                }
              };

              gracefulShutdown();
              return;
            }
            const result = (row && (row.integrity_check || row[Object.keys(row)[0]])) as string | undefined;
            if (!result || String(result).toLowerCase() !== 'ok') {
              logger.error('Database integrity check failed', {
                error: 'sqlite_corrupt',
                integrityResult: result,
                dbPath: dbPath,
              });
              logger.error('The database file appears to be corrupted.');
              logger.error('Recovery options:');
              logger.error('  1. Restore from backup: Check database/backup_*.db files');
              logger.error('  2. Run repair script: node scripts/repair-database.js');
              logger.error('  3. If database is empty, delete it and let the app recreate it');

              // ✅ Graceful shutdown замість process.exit
              const gracefulShutdown = async () => {
                try {
                  // Закрити всі з'єднання з БД
                  await new Promise<void>((resolve) => {
                    db.close((err) => {
                      if (err) logger.error('Error closing database during integrity check failure', err);
                      resolve();
                    });
                  });

                  // Дати час на завершення операцій
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  process.exit(1);
                } catch (error) {
                  logger.error('Error during graceful shutdown after integrity check failure', error);
                  process.exit(1);
                }
              };

              gracefulShutdown();
            }
          });
        } catch (e) {
          logger.warn('Integrity check could not be performed', {
            error: e instanceof Error ? e.message : String(e)
          });
        }
      }
    }
  }
);

/**
 * Initialize database tables
 */
export const initDatabase = (): Promise<void> => {
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
          user_id INTEGER,
          is_used BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          used_at DATETIME
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
    ];

    db.serialize(() => {
      db.run(createBooksTable);
      db.run(createAdminsTable);
      db.run(createReviewsTable);
      db.run(createSavedBooksTable);
      db.run(createFeedbackTable);
      db.run(createUserStatsTable);
      db.run(createPromoCodesTable);
      db.run(createBookRatingStatsTable);
      db.run(createAudioProgressTable);
      db.run(createPodcastsTable);
      db.run(createPodcastReviewsTable);
      db.run(createPodcastListensTable);
      db.run(createBookRequestsTable);

      // Ініціалізуємо систему фізичних книг
      import('./physicalBooks').then(({ initPhysicalBooksSystem }) => {
        initPhysicalBooksSystem().catch((err) => {
          logger.error('Error initializing physical books system', err);
        });
      });

      alterBooksTableQueries.forEach((query) => {
        db.run(query, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            logger.warn('ALTER TABLE warning', { error: err.message });
          }
        });
      });

      // Створюємо індекси для підкастів
      db.run('CREATE INDEX IF NOT EXISTS idx_podcasts_theme ON podcasts(theme)');
      db.run('CREATE INDEX IF NOT EXISTS idx_podcasts_rating ON podcasts(rating)');
      db.run('CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at)');
      db.run('CREATE INDEX IF NOT EXISTS idx_podcasts_available ON podcasts(is_available)');
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_podcast_reviews_podcast ON podcast_reviews(podcast_id)'
      );
      db.run('CREATE INDEX IF NOT EXISTS idx_podcast_reviews_user ON podcast_reviews(user_id)');
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_podcast_reviews_published ON podcast_reviews(is_published)'
      );
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_podcast_listens_podcast ON podcast_listens(podcast_id)'
      );
      db.run('CREATE INDEX IF NOT EXISTS idx_podcast_listens_user ON podcast_listens(user_id)');

      // Створюємо індекси для book_requests
      db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_user ON book_requests(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_status ON book_requests(status)');
      db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_priority ON book_requests(priority)');
      db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_due_date ON book_requests(due_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_book_requests_created_at ON book_requests(created_at)');

      db.get('SELECT COUNT(*) as count FROM books', (err, row: any) => {
        if (err) {
          logger.error('Error checking books count', err);
          reject(err);
        } else {
          logger.info('Database initialized successfully', { booksCount: row.count });
          resolve();
        }
      });
    });
  });
};
