/**
 * Database Migrations
 * All application migrations defined here
 */

import { IMigration } from './Migration';
import { Database } from './dbWrapper';

/**
 * MIGRATION 001 - Create core tables
 * Initial schema with users, books, reviews, etc.
 */
const migration001_CreateCoreTables: IMigration = {
  version: '001_20251114_create_core_tables',
  name: 'Create core tables',

  up: async (db: Database) => {
    const sql = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        email TEXT,
        language_code TEXT DEFAULT 'uk',
        is_admin INTEGER DEFAULT 0,
        is_blocked INTEGER DEFAULT 0,
        preferences TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Books table
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        description TEXT,
        genre TEXT,
        year INTEGER,
        isbn TEXT,
        pages INTEGER,
        rating REAL DEFAULT 0,
        cover_url TEXT,
        file_url TEXT,
        is_published INTEGER DEFAULT 1,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Reviews table
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        is_published INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Saved books table
      CREATE TABLE IF NOT EXISTS saved_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE(user_id, book_id)
      );

      -- Audio books table
      CREATE TABLE IF NOT EXISTS audio_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        audio_url TEXT NOT NULL,
        duration_seconds INTEGER,
        narrator TEXT,
        language TEXT DEFAULT 'uk',
        is_published INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );

      -- Tags table
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Book tags junction table
      CREATE TABLE IF NOT EXISTS book_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(book_id, tag_id)
      );

      -- Promo codes table
      CREATE TABLE IF NOT EXISTS promo_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        discount_percent INTEGER,
        discount_amount INTEGER,
        max_uses INTEGER,
        uses_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Feedback table
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT,
        message TEXT NOT NULL,
        rating INTEGER,
        is_read INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 0,
        reply TEXT,
        replied_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
      CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
      CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
      CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_books_user_id ON saved_books(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_books_book_id ON saved_books(book_id);
      CREATE INDEX IF NOT EXISTS idx_audio_books_book_id ON audio_books(book_id);
      CREATE INDEX IF NOT EXISTS idx_book_tags_book_id ON book_tags(book_id);
      CREATE INDEX IF NOT EXISTS idx_book_tags_tag_id ON book_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
    `;

    await db.run(sql);
  },

  down: async (db: Database) => {
    const sql = `
      DROP TABLE IF EXISTS book_tags;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS audio_books;
      DROP TABLE IF EXISTS saved_books;
      DROP TABLE IF EXISTS feedback;
      DROP TABLE IF EXISTS promo_codes;
      DROP TABLE IF EXISTS reviews;
      DROP TABLE IF EXISTS books;
      DROP TABLE IF EXISTS users;
    `;

    await db.run(sql);
  },
};

/**
 * MIGRATION 002 - Add user activity tracking
 */
const migration002_AddActivityTracking: IMigration = {
  version: '002_20251114_add_activity_tracking',
  name: 'Add user activity tracking',

  up: async (db: Database) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS user_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        action_data TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON user_activity(action_type);
      CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
    `;

    await db.run(sql);
  },

  down: async (db: Database) => {
    await db.run('DROP TABLE IF EXISTS user_activity');
  },
};

/**
 * MIGRATION 003 - Add search history table
 */
const migration003_AddSearchHistory: IMigration = {
  version: '003_20251114_add_search_history',
  name: 'Add search history tracking',

  up: async (db: Database) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        query TEXT NOT NULL,
        results_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
      CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);
    `;

    await db.run(sql);
  },

  down: async (db: Database) => {
    await db.run('DROP TABLE IF EXISTS search_history');
  },
};

/**
 * MIGRATION 004 - Add notifications table
 */
const migration004_AddNotifications: IMigration = {
  version: '004_20251114_add_notifications',
  name: 'Add notifications system',

  up: async (db: Database) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT,
        is_read INTEGER DEFAULT 0,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `;

    await db.run(sql);
  },

  down: async (db: Database) => {
    await db.run('DROP TABLE IF EXISTS notifications');
  },
};

/**
 * MIGRATION 005 - Add statistics table
 */
const migration005_AddStatistics: IMigration = {
  version: '005_20251114_add_statistics',
  name: 'Add statistics tracking',

  up: async (db: Database) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        metric_value INTEGER NOT NULL,
        metric_date DATE NOT NULL,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metric_name, metric_date)
      );

      CREATE INDEX IF NOT EXISTS idx_statistics_metric_name ON statistics(metric_name);
      CREATE INDEX IF NOT EXISTS idx_statistics_metric_date ON statistics(metric_date);
    `;

    await db.run(sql);
  },

  down: async (db: Database) => {
    await db.run('DROP TABLE IF EXISTS statistics');
  },
};

/**
 * MIGRATION 006 - Add soft delete support
 */
const migration006_AddSoftDeleteSupport: IMigration = {
  version: '006_20251114_add_soft_delete_support',
  name: 'Add soft delete support',

  up: async (db: Database) => {
    const sql = `
      ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
      ALTER TABLE books ADD COLUMN deleted_at TIMESTAMP;
      ALTER TABLE reviews ADD COLUMN deleted_at TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_books_deleted_at ON books(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at);
    `;

    try {
      await db.run(sql);
    } catch (error) {
      // Columns might already exist in some cases
      console.warn('Soft delete columns might already exist');
    }
  },

  down: async (db: Database) => {
    // SQLite doesn't support DROP COLUMN easily, so we skip rollback
    console.warn('Rollback not supported for soft delete migration');
  },
};

/**
 * MIGRATION 007 - Add extended book information (ratings distribution, age group, content warnings)
 */
const migration007_AddExtendedBookInfo: IMigration = {
  version: '007_20251115_add_extended_book_info',
  name: 'Add extended book information',

  up: async (db: Database) => {
    const sql = `
      -- Add new columns to books table
      ALTER TABLE books ADD COLUMN recommended_age INTEGER DEFAULT 0;
      ALTER TABLE books ADD COLUMN content_warnings TEXT;

      -- Create table for rating distribution (for caching stats)
      CREATE TABLE IF NOT EXISTS book_rating_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL UNIQUE,
        rating_1_count INTEGER DEFAULT 0,
        rating_2_count INTEGER DEFAULT 0,
        rating_3_count INTEGER DEFAULT 0,
        rating_4_count INTEGER DEFAULT 0,
        rating_5_count INTEGER DEFAULT 0,
        readers_count INTEGER DEFAULT 0,
        popular_quotes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_books_recommended_age ON books(recommended_age);
      CREATE INDEX IF NOT EXISTS idx_books_content_warnings ON books(content_warnings);
      CREATE INDEX IF NOT EXISTS idx_book_rating_stats_book_id ON book_rating_stats(book_id);
      CREATE INDEX IF NOT EXISTS idx_book_rating_stats_updated_at ON book_rating_stats(updated_at);
    `;

    try {
      await db.run(sql);
    } catch (error) {
      // Columns might already exist in some cases
      console.warn('Extended book info columns might already exist');
    }
  },

  down: async (db: Database) => {
    // SQLite doesn't support DROP COLUMN easily, so we skip rollback
    console.warn('Rollback not supported for extended book info migration');
  },
};

// Export all migrations
export const allMigrations: IMigration[] = [
  migration001_CreateCoreTables,
  migration002_AddActivityTracking,
  migration003_AddSearchHistory,
  migration004_AddNotifications,
  migration005_AddStatistics,
  migration006_AddSoftDeleteSupport,
  migration007_AddExtendedBookInfo,
];
