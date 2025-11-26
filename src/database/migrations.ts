/**
 * Database Migrations
 * All application migrations defined here
 */

import { IMigration } from './Migration';
import { Database, DatabaseWrapper } from './dbWrapper';

/**
 * MIGRATION 001 - Create core tables
 * Initial schema with users, books, reviews, etc.
 */
const migration001_CreateCoreTables: IMigration = {
  version: '001_20251114_create_core_tables',
  name: 'Create core tables',

  up: async (db: Database | DatabaseWrapper) => {
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
        favorite_genres TEXT,
        content_types TEXT,
        is_completed_onboarding INTEGER DEFAULT 0,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        promo_type TEXT DEFAULT 'yakaboo_unlimited',
        is_active INTEGER DEFAULT 1,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS used_promo_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        promo_code_id INTEGER NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
        UNIQUE(user_id, promo_code_id)
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

      -- Listening progress table for audio books
      CREATE TABLE IF NOT EXISTS listening_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_id INTEGER,
        chapter_id INTEGER,
        position INTEGER DEFAULT 0,
        total_listened INTEGER DEFAULT 0,
        last_listened_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE(user_id, book_id, chapter_id)
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
      CREATE INDEX IF NOT EXISTS idx_listening_progress_user_id ON listening_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_listening_progress_book_id ON listening_progress(book_id);
      CREATE INDEX IF NOT EXISTS idx_listening_progress_user_id_book_id ON listening_progress(user_id, book_id);
      CREATE INDEX IF NOT EXISTS idx_listening_progress_last_listened ON listening_progress(last_listened_at DESC);
    `;

    await (db as any).run(sql);
  },

  down: async (db: Database | DatabaseWrapper) => {
    const sql = `
      DROP TABLE IF EXISTS listening_progress;
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

    await (db as any).run(sql);
  },
};

/**
 * MIGRATION 009 - Add FTS5 search (books_fts) with sync triggers
 */
const migration009_AddFTS5Search: IMigration = {
  version: '009_20251119_add_fts5_search',
  name: 'Add FTS5 search virtual table and triggers',

  up: async (db: Database | DatabaseWrapper) => {
    // Create FTS5 table and triggers. If FTS5 is not available, SQL will fail; we catch and log.
    const sql = `
      CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
        title, author, description,
        content='books', content_rowid='id'
      );

      CREATE TRIGGER IF NOT EXISTS books_ai AFTER INSERT ON books BEGIN
        INSERT INTO books_fts(rowid, title, author, description)
        VALUES (new.id, new.title, new.author, new.description);
      END;

      CREATE TRIGGER IF NOT EXISTS books_ad AFTER DELETE ON books BEGIN
        INSERT INTO books_fts(books_fts, rowid, title, author, description)
        VALUES('delete', old.id, old.title, old.author, old.description);
      END;

      CREATE TRIGGER IF NOT EXISTS books_au AFTER UPDATE ON books BEGIN
        INSERT INTO books_fts(books_fts, rowid, title, author, description)
        VALUES('delete', old.id, old.title, old.author, old.description);
        INSERT INTO books_fts(rowid, title, author, description)
        VALUES (new.id, new.title, new.author, new.description);
      END;
    `;

    try {
      await (db as any).run(sql);

      // Backfill existing data
      const backfill = `
        INSERT INTO books_fts(rowid, title, author, description)
        SELECT id, title, author, description FROM books
        WHERE title IS NOT NULL AND author IS NOT NULL;
      `;
      await (db as any).run(backfill);
    } catch (error) {
      // Likely FTS5 not available in SQLite build; continue without throwing
      console.warn('FTS5 setup failed or not available:', (error as any)?.message);
    }
  },

  down: async (db: Database | DatabaseWrapper) => {
    try {
      await (db as any).run('DROP TABLE IF EXISTS books_fts');
    } catch {
      // ignore
    }
  },
};

/**
 * MIGRATION 010 - Optionally seed demo books if none exist
 */
const migration010_20251119_seed_demo_books: IMigration = {
  version: '010_20251119_seed_demo_books',
  name: 'Seed demo books if empty',

  up: async (db: Database | DatabaseWrapper) => {
    try {
      const row = await (db as any).get('SELECT COUNT(*) as count FROM books');
      const count = (row?.count as number) || 0;
      if (count > 0) return;

      const demoSql = `
        INSERT INTO books (title, author, description, genre, rating, is_published)
        VALUES
          ('Кобзар', 'Тарас Шевченко', 'Збірка поезій, класика української літератури.', 'Класика', 4.8, 1),
          ('Тіні забутих предків', 'Михайло Коцюбинський', 'Поетична повість про кохання і Карпати.', 'Історична', 4.6, 1),
          ('Місто', 'Валер''ян Підмогильний', 'Роман про життя у великому місті та пошук себе.', 'Роман', 4.5, 1),
          ('Захар Беркут', 'Іван Франко', 'Історична повість про боротьбу з ордами.', 'Історична', 4.7, 1),
          ('Фантастичні оповідання', 'Різні', 'Добірка сучасної української фантастики.', 'Фантастика', 4.2, 1);
      `;
      await (db as any).run(demoSql);
    } catch (error) {
      console.warn('Demo seed failed:', (error as any)?.message);
    }
  },

  down: async (_db: Database | DatabaseWrapper) => {
    // No-op rollback for seed
  },
};

/**
 * MIGRATION 002 - Add user activity tracking
 */
const migration002_AddActivityTracking: IMigration = {
  version: '002_20251114_add_activity_tracking',
  name: 'Add user activity tracking',

  up: async (db: Database | DatabaseWrapper) => {
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

    await (db as any).run(sql);
  },

  down: async (db: Database | DatabaseWrapper) => {
    await (db as any).run('DROP TABLE IF EXISTS user_activity');
  },
};

/**
 * MIGRATION 003 - Add search history table
 */
const migration003_AddSearchHistory: IMigration = {
  version: '003_20251114_add_search_history',
  name: 'Add search history tracking',

  up: async (db: Database | DatabaseWrapper) => {
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

    await (db as any).run(sql);
  },

  down: async (db: Database | DatabaseWrapper) => {
    await (db as any).run('DROP TABLE IF EXISTS search_history');
  },
};

/**
 * MIGRATION 004 - Add notifications table
 */
const migration004_AddNotifications: IMigration = {
  version: '004_20251114_add_notifications',
  name: 'Add notifications system',

  up: async (db: Database | DatabaseWrapper) => {
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

    await (db as any).run(sql);
  },

  down: async (db: Database | DatabaseWrapper) => {
    await (db as any).run('DROP TABLE IF EXISTS notifications');
  },
};

/**
 * MIGRATION 005 - Add statistics table
 */
const migration005_AddStatistics: IMigration = {
  version: '005_20251114_add_statistics',
  name: 'Add statistics tracking',

  up: async (db: Database | DatabaseWrapper) => {
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

    await (db as any).run(sql);
  },

  down: async (db: Database | DatabaseWrapper) => {
    await (db as any).run('DROP TABLE IF EXISTS statistics');
  },
};

/**
 * MIGRATION 006 - Add soft delete support
 */
const migration006_AddSoftDeleteSupport: IMigration = {
  version: '006_20251114_add_soft_delete_support',
  name: 'Add soft delete support',

  up: async (db: Database | DatabaseWrapper) => {
    const sql = `
      ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
      ALTER TABLE books ADD COLUMN deleted_at TIMESTAMP;
      ALTER TABLE reviews ADD COLUMN deleted_at TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_books_deleted_at ON books(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at);
    `;

    try {
      await (db as any).run(sql);
    } catch (error) {
      // Columns might already exist in some cases
      console.warn('Soft delete columns might already exist');
    }
  },

  down: async (db: Database | DatabaseWrapper) => {
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

  up: async (db: Database | DatabaseWrapper) => {
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
      await (db as any).run(sql);
    } catch (error) {
      // Columns might already exist in some cases
      console.warn('Extended book info columns might already exist');
    }
  },

  down: async (db: Database | DatabaseWrapper) => {
    // SQLite doesn't support DROP COLUMN easily, so we skip rollback
    console.warn('Rollback not supported for extended book info migration');
  },
};

/**
 * MIGRATION 008 - Add EPUB support
 */
const migration008_AddEpubSupport: IMigration = {
  version: '008_20251116_add_epub_support',
  name: 'Add EPUB support',

  up: async (db: Database | DatabaseWrapper) => {
    const sql = `
      -- Add EPUB file support to books table
      ALTER TABLE books ADD COLUMN epub_file_id TEXT;
      ALTER TABLE books ADD COLUMN epub_url TEXT;

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_books_epub_file_id ON books(epub_file_id);
    `;

    try {
      await (db as any).run(sql);
    } catch (error) {
      // Columns might already exist
      console.warn('EPUB columns might already exist');
    }
  },

  down: async (db: Database | DatabaseWrapper) => {
    // SQLite doesn't support DROP COLUMN легко
    console.warn('Rollback not supported for EPUB support migration');
  },
};

/**
 * MIGRATION 011 - Add performance indexes
 */
const migration011_AddPerformanceIndexes: IMigration = {
  version: '011_20251123_add_performance_indexes',
  name: 'Add performance indexes for frequently queried fields',

  up: async (db: Database | DatabaseWrapper) => {
    const sql = `
      -- ✅ Додаткові індекси для покращення продуктивності
      CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
      CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating);
      CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);
      CREATE INDEX IF NOT EXISTS idx_books_is_available ON books(is_available);
      CREATE INDEX IF NOT EXISTS idx_books_rating_desc ON books(rating DESC);
      CREATE INDEX IF NOT EXISTS idx_books_downloads_count ON books(downloads_count);
      CREATE INDEX IF NOT EXISTS idx_books_views_count ON books(views_count);

      -- Індекси для користувачів
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

      -- Індекси для відгуків
      CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
      CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
      CREATE INDEX IF NOT EXISTS idx_reviews_is_published ON reviews(is_published);

      -- Індекси для збережених книг
      CREATE INDEX IF NOT EXISTS idx_saved_books_saved_at ON saved_books(saved_at);

      -- Індекси для тегів
      CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

      -- Композитні індекси для складних запитів
      CREATE INDEX IF NOT EXISTS idx_books_genre_rating ON books(genre, rating DESC);
      CREATE INDEX IF NOT EXISTS idx_books_available_rating ON books(is_available, rating DESC);
      CREATE INDEX IF NOT EXISTS idx_reviews_book_rating ON reviews(book_id, rating);
    `;

    await (db as any).run(sql);
  },

  down: async (db: Database | DatabaseWrapper) => {
    // Видаляємо індекси (якщо існують)
    const dropSql = `
      DROP INDEX IF EXISTS idx_books_author;
      DROP INDEX IF EXISTS idx_books_rating;
      DROP INDEX IF EXISTS idx_books_created_at;
      DROP INDEX IF EXISTS idx_books_is_available;
      DROP INDEX IF EXISTS idx_books_rating_desc;
      DROP INDEX IF EXISTS idx_books_downloads_count;
      DROP INDEX IF EXISTS idx_books_views_count;
      DROP INDEX IF EXISTS idx_users_created_at;
      DROP INDEX IF EXISTS idx_users_updated_at;
      DROP INDEX IF EXISTS idx_reviews_rating;
      DROP INDEX IF EXISTS idx_reviews_created_at;
      DROP INDEX IF EXISTS idx_reviews_is_published;
      DROP INDEX IF EXISTS idx_saved_books_saved_at;
      DROP INDEX IF EXISTS idx_tags_name;
      DROP INDEX IF EXISTS idx_books_genre_rating;
      DROP INDEX IF EXISTS idx_books_available_rating;
      DROP INDEX IF EXISTS idx_reviews_book_rating;
    `;

    try {
      await (db as any).run(dropSql);
    } catch (error) {
      console.warn('Error dropping performance indexes:', (error as any)?.message);
    }
  },
};

/**
 * MIGRATION 012 - Add user_id, last_active_at, and has_completed_onboarding columns
 */
const migration012_AddUserColumns: IMigration = {
  version: '012_20251124_add_user_columns',
  name: 'Add user_id, last_active_at, and has_completed_onboarding columns to users table',

  up: async (db: Database | DatabaseWrapper) => {
    const wrapper = db instanceof DatabaseWrapper ? db : new DatabaseWrapper(db);
    
    // Check existing columns using PRAGMA
    const tableInfo = await wrapper.all<{ name: string; type: string }>(
      "PRAGMA table_info(users)"
    );
    const columnNames = tableInfo.map(col => col.name.toLowerCase());

    // Helper function to run SQL
    const runSQL = async (sql: string): Promise<void> => {
      if (db instanceof DatabaseWrapper) {
        await db.run(sql);
      } else {
        await new Promise<void>((resolve, reject) => {
          (db as any).run(sql, (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    };

    // Add user_id column if it doesn't exist
    // If telegram_id exists, copy its values to user_id
    if (!columnNames.includes('user_id')) {
      if (columnNames.includes('telegram_id')) {
        // Copy telegram_id to user_id
        await runSQL(`ALTER TABLE users ADD COLUMN user_id INTEGER;`);
        await runSQL(`UPDATE users SET user_id = telegram_id WHERE user_id IS NULL;`);
        // Make user_id unique and not null
        await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id_temp ON users(user_id);`);
      } else {
        // Just add the column
        await runSQL(`ALTER TABLE users ADD COLUMN user_id INTEGER UNIQUE;`);
      }
      // Create index
      await runSQL(`CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);`);
    }

    // Add last_active_at column if it doesn't exist
    if (!columnNames.includes('last_active_at')) {
      await runSQL(`ALTER TABLE users ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP;`);
    }

    // Add has_completed_onboarding column if it doesn't exist
    // If is_completed_onboarding exists, copy its values
    if (!columnNames.includes('has_completed_onboarding')) {
      if (columnNames.includes('is_completed_onboarding')) {
        // Copy is_completed_onboarding to has_completed_onboarding
        await runSQL(`ALTER TABLE users ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT 0;`);
        await runSQL(`UPDATE users SET has_completed_onboarding = is_completed_onboarding WHERE has_completed_onboarding IS NULL;`);
      } else {
        // Just add the column
        await runSQL(`ALTER TABLE users ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT 0;`);
      }
    }
  },

  down: async (db: Database | DatabaseWrapper) => {
    // SQLite doesn't support DROP COLUMN easily, so we skip rollback
    console.warn('Rollback not supported for user columns migration');
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
  migration008_AddEpubSupport,
  // Added in this session: FTS5 support and optional demo seed
  migration009_AddFTS5Search,
  // migration010_20251119_seed_demo_books, // DISABLED - clean presentation
  // Added performance indexes
  migration011_AddPerformanceIndexes,
  // Add user_id, last_active_at, and has_completed_onboarding columns
  migration012_AddUserColumns,
];
