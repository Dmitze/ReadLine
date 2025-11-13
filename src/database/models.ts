import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Environment variables are initialized in index.ts (entry point)

declare var process : {
  env: {
    DB_PATH?: string
  }
};

// Define interfaces for our data structures
export interface Book {
  id?: number;
  title: string;
  author: string;
  genre: string;
  description: string;
  photo_file_id: string;
  file_url?: string; // Файл книги (PDF, EPUB, тощо)
  audio_file_id?: string; // Аудіофайл
  online_link?: string; // Онлайн посилання
  file_type?: string; // 'physical' | 'link' | 'file' | 'audio'
  file_name?: string; // Назва файлу для завантаження
  rating?: number; // Середній рейтинг 0-5
  reviews_count?: number; // Кількість відгуків
  downloads_count?: number; // Кількість завантажень
  is_available?: boolean;
  created_at?: string;
}

export interface Admin {
  id?: number;
  user_id: number;
  username?: string;
  created_at?: string;
}

export interface AdminStats {
  totalBooks: number;
}

export interface Review {
  id?: number;
  book_id: number;
  user_id: number;
  user_name?: string;
  rating: number; // 1-5
  comment?: string;
  is_published?: boolean;
  created_at?: string;
}

export interface SavedBook {
  id?: number;
  user_id: number;
  book_id: number;
  created_at?: string;
}

export interface FeedbackMessage {
  id?: number;
  user_id: number;
  user_name?: string;
  user_username?: string;
  message: string;
  status?: string; // 'pending' | 'read' | 'replied'
  admin_reply?: string;
  created_at?: string;
  read_at?: string;
}

export interface AudioChapter {
  id?: number;
  book_id: number;
  chapter_number: number;
  title: string;
  file_id: string;
  duration: number;
  created_at?: string;
}

export interface ListeningProgress {
  id?: number;
  user_id: number;
  book_id: number;
  chapter_id?: number;
  position: number;
  total_listened: number;
  last_listened_at?: string;
  created_at?: string;
}

// Initialize database
const dbPath = process.env.DB_PATH || './database/library.db';

// Створення директорії для БД якщо не існує (синхронно)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info('Created database directory', { path: dbDir });
}

export const db = new sqlite3.Database(dbPath);

// ✅ ВИПРАВЛЕНО #13: async initialization з proper error handling
export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Create books table
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

    // Create admins table
    const createAdminsTable = `
      CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create reviews table
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

    // Create saved_books table (user's personal library)
    const createSavedBooksTable = `
      CREATE TABLE IF NOT EXISTS saved_books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          book_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, book_id),
          FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `;

    // Create feedback_messages table
    const createFeedbackMessagesTable = `
      CREATE TABLE IF NOT EXISTS feedback_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          user_name TEXT,
          user_username TEXT,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          admin_reply TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          read_at DATETIME
      );
    `;

    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          favorite_genres TEXT,
          keyboard_type TEXT DEFAULT 'mobile',
          has_completed_onboarding BOOLEAN DEFAULT 0,
          last_notification_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // ✅ ВИПРАВЛЕНО #8: таблиця для історії AI підборів
    const createAiSelectionsTable = `
      CREATE TABLE IF NOT EXISTS ai_selections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          book_id INTEGER NOT NULL,
          selection_type TEXT NOT NULL,
          interest TEXT,
          length TEXT,
          mood TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (user_id),
          FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `;

    db.serialize(() => {
      db.run(createBooksTable, (err) => {
        if (err) {
          reject(new Error(`Failed to create books table: ${err.message}`));
          return;
        }
      });
      
      db.run(createAdminsTable, (err) => {
        if (err) {
          reject(new Error(`Failed to create admins table: ${err.message}`));
          return;
        }
      });
      
      db.run(createReviewsTable, (err) => {
        if (err) {
          reject(new Error(`Failed to create reviews table: ${err.message}`));
          return;
        }
      });
      
      db.run(createSavedBooksTable, (err) => {
        if (err) {
          reject(new Error(`Failed to create saved_books table: ${err.message}`));
          return;
        }
      });
      
      db.run(createFeedbackMessagesTable, (err) => {
        if (err) {
          reject(new Error(`Failed to create feedback_messages table: ${err.message}`));
          return;
        }
      });
      
      db.run(createUsersTable, (err) => {
        if (err) {
          reject(new Error(`Failed to create users table: ${err.message}`));
          return;
        }
        
        // Створюємо таблицю AI selections
        db.run(createAiSelectionsTable, (err) => {
          if (err) {
            console.warn(`Warning: Failed to create ai_selections table: ${err.message}`);
          }
        });
        
        // ✅ ВИПРАВЛЕНО #32: додаємо індекси для оптимізації запитів
        const indexes = [
          // Індекси для books
          'CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre)',
          'CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating DESC)',
          'CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC)',
          'CREATE INDEX IF NOT EXISTS idx_books_available ON books(is_available)',
          'CREATE INDEX IF NOT EXISTS idx_books_genre_rating ON books(genre, rating DESC)',
          
          // Індекси для reviews
          'CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id)',
          'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(is_published)',
          
          // Індекси для saved_books
          'CREATE INDEX IF NOT EXISTS idx_saved_books_user_id ON saved_books(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_saved_books_book_id ON saved_books(book_id)',
          'CREATE INDEX IF NOT EXISTS idx_saved_books_user_book ON saved_books(user_id, book_id)',
          
          // Індекси для users
          'CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(has_completed_onboarding)',
          
          // Індекси для feedback
          'CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_messages(status)',
          'CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback_messages(user_id)',
          
          // ✅ ВИПРАВЛЕНО #8: індекси для ai_selections
          'CREATE INDEX IF NOT EXISTS idx_ai_selections_user_id ON ai_selections(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_ai_selections_book_id ON ai_selections(book_id)',
          'CREATE INDEX IF NOT EXISTS idx_ai_selections_type ON ai_selections(selection_type)'
        ];
        
        let indexCount = 0;
        const createNextIndex = () => {
          if (indexCount >= indexes.length) {
            resolve();
            return;
          }
          
          db.run(indexes[indexCount], (indexErr) => {
            if (indexErr) {
              console.warn(`Warning: Failed to create index: ${indexErr.message}`);
            }
            indexCount++;
            createNextIndex();
          });
        };
        
        createNextIndex();
      });
    });
  });
};

// Book functions
export const addBook = (bookData: Omit<Book, 'id' | 'is_available' | 'created_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const { 
      title, 
      author, 
      genre, 
      description, 
      photo_file_id, 
      file_url, 
      audio_file_id,
      online_link,
      file_type = 'physical',
      file_name 
    } = bookData;
    
    const query = `
      INSERT INTO books (
        title, author, genre, description, photo_file_id, 
        file_url, audio_file_id, online_link, 
        file_type, file_name, is_available
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    db.run(
      query, 
      [
        title, author, genre, description, photo_file_id,
        file_url || null, audio_file_id || null, online_link || null,
        file_type, file_name
      ], 
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

export const getBooksByGenre = (genre: string): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM books WHERE genre = ?`;
    db.all(query, [genre], (err, rows: Book[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const getAllBooks = (): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM books`;
    db.all(query, [], (err, rows: Book[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Get all available books (for AI search and recommendations)
export const getAllAvailableBooks = (): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM books WHERE (is_available = 1 OR is_available IS NULL)`;
    db.all(query, [], (err, rows: Book[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const getBookById = (id: number): Promise<Book | undefined> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM books WHERE id = ?`;
    db.get(query, [id], (err, row: Book) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const getGenres = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT DISTINCT genre FROM books`;
    db.all(query, [], (err, rows: { genre: string }[]) => {
      if (err) reject(err);
      else resolve(rows.map(row => row.genre));
    });
  });
};

// Admin functions
export const addAdmin = (userId: number, username?: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!userId) {
      reject(new Error('User ID is required'));
      return;
    }
    
    const query = `INSERT OR IGNORE INTO admins (user_id, username) VALUES (?, ?)`;
    db.run(query, [userId, username], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

export const isAdmin = (userId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM admins WHERE user_id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
};

export const getAllAdmins = (): Promise<Admin[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM admins', [], (err, rows: Admin[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Stats functions
export const getAdminStats = (): Promise<AdminStats> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM books) as totalBooks
    `;
    db.get(query, [], (err, row: AdminStats) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Pagination functions
// ✅ ВИПРАВЛЕНО #20: proper error handling в pagination
export const getBooksByGenreWithPagination = (
  genre: string,
  limit: number = 5,
  offset: number = 0
): Promise<{ books: Book[], total: number }> => {
  return new Promise((resolve, reject) => {
    // Спочатку отримуємо загальну кількість
    db.get(
      'SELECT COUNT(*) as total FROM books WHERE genre = ?',
      [genre],
      (err, countRow: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Перевіряємо що countRow існує
        if (!countRow) {
          resolve({ books: [], total: 0 });
          return;
        }
        
        // Потім отримуємо книги з пагінацією
        db.all(
          'SELECT * FROM books WHERE genre = ? LIMIT ? OFFSET ?',
          [genre, limit, offset],
          (err, books: Book[]) => {
            if (err) {
              reject(err);
              return;
            }
            resolve({ books: books || [], total: countRow.total || 0 });
          }
        );
      }
    );
  });
};

// ✅ ВИПРАВЛЕНО #20: proper error handling в pagination
export const getBooksWithPagination = (
  limit: number = 5,
  offset: number = 0
): Promise<{ books: Book[], total: number }> => {
  return new Promise((resolve, reject) => {
    // Спочатку отримуємо загальну кількість
    db.get('SELECT COUNT(*) as total FROM books', [], (err, countRow: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Перевіряємо що countRow існує
      if (!countRow) {
        resolve({ books: [], total: 0 });
        return;
      }
      
      // Потім отримуємо книги з пагінацією
      db.all(
        'SELECT * FROM books LIMIT ? OFFSET ?',
        [limit, offset],
        (err, books: Book[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ books: books || [], total: countRow.total || 0 });
        }
      );
    });
  });
};

// Search books using SQL (much faster than JS filtering)
export const searchBooks = (
  searchTerm: string,
  limit: number = 10
): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const pattern = `%${searchTerm}%`;
    const query = `
      SELECT * FROM books 
      WHERE LOWER(title) LIKE LOWER(?) 
         OR LOWER(author) LIKE LOWER(?)
         OR LOWER(genre) LIKE LOWER(?)
      LIMIT ?
    `;
    
    db.all(query, [pattern, pattern, pattern, limit], (err, rows: Book[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Update book (for admin editing)
export const updateBook = (
  bookId: number, 
  updates: Partial<Omit<Book, 'id' | 'created_at'>>
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const query = `UPDATE books SET ${fields} WHERE id = ?`;
    
    db.run(query, [...values, bookId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

// Delete book
export const deleteBook = (bookId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM books WHERE id = ?', [bookId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

// Increment downloads count
export const incrementDownloads = (bookId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE books SET downloads_count = downloads_count + 1 WHERE id = ?',
      [bookId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Review functions
export const addReview = (reviewData: Omit<Review, 'id' | 'created_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const { book_id, user_id, user_name, rating, comment, is_published = false } = reviewData;
    const query = `
      INSERT INTO reviews (book_id, user_id, user_name, rating, comment, is_published)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [book_id, user_id, user_name, rating, comment, is_published ? 1 : 0], function(err) {
      if (err) reject(err);
      else {
        // Оновлюємо рейтинг книги
        updateBookRating(book_id);
        resolve(this.lastID);
      }
    });
  });
};

export const getBookReviews = (bookId: number): Promise<Review[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM reviews WHERE book_id = ? AND is_published = 1 ORDER BY created_at DESC',
      [bookId],
      (err, rows: Review[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const getPendingReviews = (): Promise<Review[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM reviews WHERE is_published = 0 ORDER BY created_at DESC',
      [],
      (err, rows: Review[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const publishReview = (reviewId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE reviews SET is_published = 1 WHERE id = ?',
      [reviewId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

export const deleteReview = (reviewId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Отримуємо book_id перед видаленням
    db.get('SELECT book_id FROM reviews WHERE id = ?', [reviewId], (err, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.run('DELETE FROM reviews WHERE id = ?', [reviewId], function(err) {
        if (err) reject(err);
        else {
          // Оновлюємо рейтинг книги
          if (row && row.book_id) updateBookRating(row.book_id);
          resolve(this.changes);
        }
      });
    });
  });
};

// Update book rating based on reviews
const updateBookRating = (bookId: number): void => {
  db.get(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE book_id = ? AND is_published = 1',
    [bookId],
    (err, row: any) => {
      if (!err && row) {
        db.run(
          'UPDATE books SET rating = ?, reviews_count = ? WHERE id = ?',
          [row.avg_rating || 0, row.count, bookId]
        );
      }
    }
  );
};

// SavedBooks functions
export const saveBook = (userId: number, bookId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO saved_books (user_id, book_id) VALUES (?, ?)',
      [userId, bookId],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

export const unsaveBook = (userId: number, bookId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM saved_books WHERE user_id = ? AND book_id = ?',
      [userId, bookId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

export const getSavedBooks = (userId: number): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT b.* FROM books b
      INNER JOIN saved_books sb ON b.id = sb.book_id
      WHERE sb.user_id = ?
      ORDER BY sb.created_at DESC
    `;
    
    db.all(query, [userId], (err, rows: Book[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const isBookSaved = (userId: number, bookId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT 1 FROM saved_books WHERE user_id = ? AND book_id = ?',
      [userId, bookId],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
};

// ✅ ВИПРАВЛЕНО #26: batch версія для уникнення N+1 query
export const areBooksaved = (userId: number, bookIds: number[]): Promise<Set<number>> => {
  return new Promise((resolve, reject) => {
    if (bookIds.length === 0) {
      resolve(new Set());
      return;
    }
    
    const placeholders = bookIds.map(() => '?').join(',');
    db.all(
      `SELECT book_id FROM saved_books WHERE user_id = ? AND book_id IN (${placeholders})`,
      [userId, ...bookIds],
      (err, rows: Array<{ book_id: number }>) => {
        if (err) reject(err);
        else resolve(new Set(rows.map(r => r.book_id)));
      }
    );
  });
};

// Get top rated books
export const getTopBooks = (limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM books WHERE rating > 0 ORDER BY rating DESC, reviews_count DESC LIMIT ?',
      [limit],
      (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

// Get most downloaded books
export const getMostDownloadedBooks = (limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM books WHERE downloads_count > 0 ORDER BY downloads_count DESC LIMIT ?',
      [limit],
      (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

// Get newest books
export const getNewestBooks = (limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM books ORDER BY created_at DESC LIMIT ?',
      [limit],
      (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

// Feedback Messages functions
export const addFeedbackMessage = (feedbackData: Omit<FeedbackMessage, 'id' | 'status' | 'created_at' | 'read_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const { user_id, user_name, user_username, message } = feedbackData;
    const query = `
      INSERT INTO feedback_messages (user_id, user_name, user_username, message)
      VALUES (?, ?, ?, ?)
    `;
    db.run(query, [user_id, user_name, user_username, message], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

export const getPendingFeedbackMessages = (): Promise<FeedbackMessage[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM feedback_messages WHERE status = ? ORDER BY created_at DESC',
      ['pending'],
      (err, rows: FeedbackMessage[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const getAllFeedbackMessages = (): Promise<FeedbackMessage[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM feedback_messages ORDER BY created_at DESC',
      [],
      (err, rows: FeedbackMessage[]) => {
        if (err) reject(err);

        else resolve(rows);
      }
    );
  });
};

export const markFeedbackAsRead = (feedbackId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE feedback_messages SET read_at = CURRENT_TIMESTAMP WHERE id = ?',
      [feedbackId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

export const updateFeedbackStatus = (feedbackId: number, status: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE feedback_messages SET status = ?, read_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, feedbackId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

export const addAdminReply = (feedbackId: number, reply: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE feedback_messages SET admin_reply = ?, status = ? WHERE id = ?',
      [reply, 'replied', feedbackId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Initialize database on module load
initDatabase();
