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
    DB_PATH?: string
  }
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
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = ${TIMEOUTS.DATABASE_BUSY};
  PRAGMA journal_mode = WAL;
`, (err) => {
  if (err) {
    logger.error('Error configuring SQLite PRAGMA', err);
  } else {
    logger.info('SQLite PRAGMA configured', {
      foreign_keys: 'ON',
      busy_timeout: TIMEOUTS.DATABASE_BUSY,
      journal_mode: 'WAL'
    });
  }
});

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

    const alterBooksTableQueries = [
      'ALTER TABLE books ADD COLUMN pdf_file_id TEXT;',
      'ALTER TABLE books ADD COLUMN audio_file_id TEXT;',
      'ALTER TABLE books ADD COLUMN audio_duration INTEGER;',
      'ALTER TABLE books ADD COLUMN audio_external_link TEXT;',
      'ALTER TABLE books ADD COLUMN narrator TEXT;',
      'ALTER TABLE books ADD COLUMN online_link TEXT;',
      'ALTER TABLE books ADD COLUMN external_link TEXT;',
      'ALTER TABLE books ADD COLUMN recommended_age INTEGER;',
      'ALTER TABLE books ADD COLUMN content_warnings TEXT;'
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

      alterBooksTableQueries.forEach(query => {
        db.run(query, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            logger.warn('ALTER TABLE warning', { error: err.message });
          }
        });
      });

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
