"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookInfo = exports.getBookDetailedStats = exports.addAdminReply = exports.updateFeedbackStatus = exports.markFeedbackAsRead = exports.getAllFeedbackMessages = exports.getPendingFeedbackMessages = exports.addFeedbackMessage = exports.getNewestBooks = exports.getMostDownloadedBooks = exports.getTopBooks = exports.areBooksaved = exports.isBookSaved = exports.getSavedBooks = exports.unsaveBook = exports.saveBook = exports.deleteReview = exports.publishReview = exports.getPendingReviews = exports.getBookReviews = exports.addReview = exports.incrementDownloads = exports.deleteBook = exports.updateBook = exports.searchBooks = exports.getBooksWithPagination = exports.getBooksByGenreWithPagination = exports.getExtendedAdminStats = exports.getAdminStats = exports.getAllAdmins = exports.isAdmin = exports.addAdmin = exports.getGenres = exports.getBookById = exports.getAllAvailableBooks = exports.getAllBooks = exports.getBooksByGenre = exports.addBook = exports.initDatabase = exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const dbPath = process.env.DB_PATH || './database/library.db';
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
    logger_1.logger.info('Created database directory', { path: dbDir });
}
exports.db = new sqlite3_1.default.Database(dbPath);
exports.db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 3000;
  PRAGMA journal_mode = WAL;
`, (err) => {
    if (err) {
        logger_1.logger.error('Error configuring SQLite PRAGMA', err);
    }
    else {
        logger_1.logger.info('SQLite PRAGMA configured', {
            foreign_keys: 'ON',
            busy_timeout: 3000,
            journal_mode: 'WAL'
        });
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
          UNIQUE(user_id, book_id),
          FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `;
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
          notifications_enabled INTEGER DEFAULT 1,
          notification_frequency TEXT DEFAULT 'weekly',
          notification_time TEXT DEFAULT '10:00',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
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
        exports.db.serialize(() => {
            exports.db.run(createBooksTable, (err) => {
                if (err) {
                    reject(new Error(`Failed to create books table: ${err.message}`));
                    return;
                }
            });
            exports.db.run(createAdminsTable, (err) => {
                if (err) {
                    reject(new Error(`Failed to create admins table: ${err.message}`));
                    return;
                }
            });
            exports.db.run(createReviewsTable, (err) => {
                if (err) {
                    reject(new Error(`Failed to create reviews table: ${err.message}`));
                    return;
                }
            });
            exports.db.run(createSavedBooksTable, (err) => {
                if (err) {
                    reject(new Error(`Failed to create saved_books table: ${err.message}`));
                    return;
                }
            });
            exports.db.run(createFeedbackMessagesTable, (err) => {
                if (err) {
                    reject(new Error(`Failed to create feedback_messages table: ${err.message}`));
                    return;
                }
            });
            exports.db.run(createUsersTable, (err) => {
                if (err) {
                    reject(new Error(`Failed to create users table: ${err.message}`));
                    return;
                }
                exports.db.run(createAiSelectionsTable, (err) => {
                    if (err) {
                        logger_1.logger.warn('Failed to create ai_selections table', { error: err.message });
                    }
                });
                const indexes = [
                    'CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)',
                    'CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)',
                    'CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre)',
                    'CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating DESC)',
                    'CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC)',
                    'CREATE INDEX IF NOT EXISTS idx_books_available ON books(is_available)',
                    'CREATE INDEX IF NOT EXISTS idx_books_genre_rating ON books(genre, rating DESC)',
                    'CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id)',
                    'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)',
                    'CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(is_published)',
                    'CREATE INDEX IF NOT EXISTS idx_saved_books_user_id ON saved_books(user_id)',
                    'CREATE INDEX IF NOT EXISTS idx_saved_books_book_id ON saved_books(book_id)',
                    'CREATE INDEX IF NOT EXISTS idx_saved_books_user_book ON saved_books(user_id, book_id)',
                    'CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)',
                    'CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(has_completed_onboarding)',
                    'CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_messages(status)',
                    'CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback_messages(user_id)',
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
                    exports.db.run(indexes[indexCount], (indexErr) => {
                        if (indexErr) {
                            logger_1.logger.warn('Failed to create index', { error: indexErr.message });
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
exports.initDatabase = initDatabase;
const addBook = (bookData) => {
    return new Promise((resolve, reject) => {
        const { title, author, genre, description, photo_file_id, file_url, audio_file_id, online_link, file_type = 'physical', file_name } = bookData;
        const query = `
      INSERT INTO books (
        title, author, genre, description, photo_file_id, 
        file_url, audio_file_id, online_link, 
        file_type, file_name, is_available
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
        exports.db.run(query, [
            title, author, genre, description, photo_file_id,
            file_url || null, audio_file_id || null, online_link || null,
            file_type, file_name
        ], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.lastID);
        });
    });
};
exports.addBook = addBook;
const getBooksByGenre = (genre) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM books WHERE genre = ?`;
        exports.db.all(query, [genre], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getBooksByGenre = getBooksByGenre;
const getAllBooks = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM books`;
        exports.db.all(query, [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getAllBooks = getAllBooks;
const getAllAvailableBooks = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM books WHERE (is_available = 1 OR is_available IS NULL)`;
        exports.db.all(query, [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getAllAvailableBooks = getAllAvailableBooks;
const getBookById = (id) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM books WHERE id = ?`;
        exports.db.get(query, [id], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.getBookById = getBookById;
const getGenres = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT DISTINCT genre FROM books`;
        exports.db.all(query, [], (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                const allGenres = new Set();
                rows.forEach(row => {
                    if (row.genre) {
                        row.genre.split(',').forEach(genre => {
                            const trimmedGenre = genre.trim();
                            if (trimmedGenre) {
                                allGenres.add(trimmedGenre);
                            }
                        });
                    }
                });
                resolve(Array.from(allGenres).sort());
            }
        });
    });
};
exports.getGenres = getGenres;
const addAdmin = (userId, username) => {
    return new Promise((resolve, reject) => {
        if (!userId) {
            reject(new Error('User ID is required'));
            return;
        }
        const query = `INSERT OR IGNORE INTO admins (user_id, username) VALUES (?, ?)`;
        exports.db.run(query, [userId, username], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.lastID);
        });
    });
};
exports.addAdmin = addAdmin;
const isAdmin = (userId) => {
    return new Promise((resolve, reject) => {
        exports.db.get('SELECT * FROM admins WHERE user_id = ?', [userId], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(!!row);
        });
    });
};
exports.isAdmin = isAdmin;
const getAllAdmins = () => {
    return new Promise((resolve, reject) => {
        exports.db.all('SELECT * FROM admins', [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getAllAdmins = getAllAdmins;
const getAdminStats = () => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT 
        (SELECT COUNT(*) FROM books) as totalBooks
    `;
        exports.db.get(query, [], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.getAdminStats = getAdminStats;
const getExtendedAdminStats = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const basicStats = await new Promise((res, rej) => {
                exports.db.get(`SELECT 
            (SELECT COUNT(*) FROM books) as totalBooks,
            (SELECT COUNT(DISTINCT user_id) FROM saved_books) as totalUsers,
            (SELECT COUNT(*) FROM reviews) as totalReviews,
            (SELECT COUNT(*) FROM feedback_messages) as totalFeedback,
            (SELECT COUNT(*) FROM saved_books) as totalSavedBooks,
            (SELECT AVG(rating) FROM reviews) as avgRating,
            (SELECT COUNT(*) FROM reviews WHERE is_published = 0) as pendingReviews,
            (SELECT COUNT(*) FROM feedback_messages WHERE status = 'pending') as pendingFeedback
           FROM books LIMIT 1`, [], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row || {});
                });
            });
            const newUsersToday = await new Promise((res, rej) => {
                exports.db.get(`SELECT COUNT(DISTINCT user_id) as count FROM saved_books 
           WHERE DATE(created_at) = DATE('now')`, [], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row?.count || 0);
                });
            });
            const newBooksThisMonth = await new Promise((res, rej) => {
                exports.db.get(`SELECT COUNT(*) as count FROM books 
           WHERE datetime(created_at) > datetime('now', '-30 days')`, [], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row?.count || 0);
                });
            });
            const activeUsersThisMonth = await new Promise((res, rej) => {
                exports.db.get(`SELECT COUNT(DISTINCT user_id) as count FROM saved_books 
           WHERE datetime(created_at) > datetime('now', '-30 days')`, [], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row?.count || 0);
                });
            });
            const topGenres = await new Promise((res, rej) => {
                exports.db.all(`SELECT genre, COUNT(*) as count FROM books 
           GROUP BY genre ORDER BY count DESC LIMIT 5`, [], (err, rows) => {
                    if (err)
                        rej(err);
                    else
                        res(rows || []);
                });
            });
            const topRatedBooks = await new Promise((res, rej) => {
                exports.db.all(`SELECT title, author, rating FROM books 
           WHERE rating IS NOT NULL AND is_available = 1
           ORDER BY rating DESC LIMIT 5`, [], (err, rows) => {
                    if (err)
                        rej(err);
                    else
                        res(rows || []);
                });
            });
            resolve({
                totalBooks: basicStats.totalBooks || 0,
                totalUsers: basicStats.totalUsers || 0,
                totalReviews: basicStats.totalReviews || 0,
                totalFeedback: basicStats.totalFeedback || 0,
                totalSavedBooks: basicStats.totalSavedBooks || 0,
                avgRating: basicStats.avgRating ? parseFloat(basicStats.avgRating).toFixed(2) : 0,
                pendingReviews: basicStats.pendingReviews || 0,
                pendingFeedback: basicStats.pendingFeedback || 0,
                newUsersToday,
                newBooksThisMonth,
                activeUsersThisMonth,
                topGenres: topGenres.map(g => ({ genre: g.genre, count: g.count })),
                topRatedBooks: topRatedBooks.map(b => ({
                    title: b.title,
                    rating: b.rating,
                    author: b.author
                }))
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting extended admin stats', error instanceof Error ? error : new Error(String(error)));
            reject(error);
        }
    });
};
exports.getExtendedAdminStats = getExtendedAdminStats;
const getBooksByGenreWithPagination = (genre, limit = 5, offset = 0) => {
    return new Promise((resolve, reject) => {
        exports.db.get('SELECT COUNT(*) as total FROM books WHERE genre = ?', [genre], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            if (!countRow) {
                resolve({ books: [], total: 0 });
                return;
            }
            exports.db.all('SELECT * FROM books WHERE genre = ? LIMIT ? OFFSET ?', [genre, limit, offset], (err, books) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ books: books || [], total: countRow.total || 0 });
            });
        });
    });
};
exports.getBooksByGenreWithPagination = getBooksByGenreWithPagination;
const getBooksWithPagination = (limit = 5, offset = 0) => {
    return new Promise((resolve, reject) => {
        exports.db.get('SELECT COUNT(*) as total FROM books', [], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            if (!countRow) {
                resolve({ books: [], total: 0 });
                return;
            }
            exports.db.all('SELECT * FROM books LIMIT ? OFFSET ?', [limit, offset], (err, books) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ books: books || [], total: countRow.total || 0 });
            });
        });
    });
};
exports.getBooksWithPagination = getBooksWithPagination;
const searchBooks = (searchTerm, limit = 10) => {
    return new Promise((resolve, reject) => {
        const pattern = `%${searchTerm}%`;
        const query = `
      SELECT * FROM books 
      WHERE LOWER(title) LIKE LOWER(?) 
         OR LOWER(author) LIKE LOWER(?)
         OR LOWER(genre) LIKE LOWER(?)
      LIMIT ?
    `;
        exports.db.all(query, [pattern, pattern, pattern, limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.searchBooks = searchBooks;
const updateBook = (bookId, updates) => {
    return new Promise((resolve, reject) => {
        if (Object.keys(updates).length === 0) {
            resolve(0);
            return;
        }
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        const query = `UPDATE books SET ${fields} WHERE id = ?`;
        exports.db.run(query, [...values, bookId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes);
        });
    });
};
exports.updateBook = updateBook;
const deleteBook = (bookId) => {
    return new Promise((resolve, reject) => {
        exports.db.run('DELETE FROM books WHERE id = ?', [bookId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes);
        });
    });
};
exports.deleteBook = deleteBook;
const incrementDownloads = (bookId) => {
    return new Promise((resolve, reject) => {
        exports.db.run('UPDATE books SET downloads_count = downloads_count + 1 WHERE id = ?', [bookId], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.incrementDownloads = incrementDownloads;
const addReview = (reviewData) => {
    return new Promise((resolve, reject) => {
        const { book_id, user_id, user_name, rating, comment, is_published = false } = reviewData;
        const query = `
      INSERT INTO reviews (book_id, user_id, user_name, rating, comment, is_published)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        exports.db.run(query, [book_id, user_id, user_name, rating, comment, is_published ? 1 : 0], function (err) {
            if (err)
                reject(err);
            else {
                updateBookRating(book_id);
                resolve(this.lastID);
            }
        });
    });
};
exports.addReview = addReview;
const getBookReviews = (bookId) => {
    return new Promise((resolve, reject) => {
        exports.db.all('SELECT * FROM reviews WHERE book_id = ? AND is_published = 1 ORDER BY created_at DESC', [bookId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getBookReviews = getBookReviews;
const getPendingReviews = () => {
    return new Promise((resolve, reject) => {
        exports.db.all('SELECT * FROM reviews WHERE is_published = 0 ORDER BY created_at DESC', [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getPendingReviews = getPendingReviews;
const publishReview = (reviewId) => {
    return new Promise((resolve, reject) => {
        exports.db.run('UPDATE reviews SET is_published = 1 WHERE id = ?', [reviewId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes);
        });
    });
};
exports.publishReview = publishReview;
const deleteReview = (reviewId) => {
    return new Promise((resolve, reject) => {
        exports.db.get('SELECT book_id FROM reviews WHERE id = ?', [reviewId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            exports.db.run('DELETE FROM reviews WHERE id = ?', [reviewId], function (err) {
                if (err)
                    reject(err);
                else {
                    if (row && row.book_id)
                        updateBookRating(row.book_id);
                    resolve(this.changes);
                }
            });
        });
    });
};
exports.deleteReview = deleteReview;
const updateBookRating = (bookId) => {
    exports.db.get('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE book_id = ? AND is_published = 1', [bookId], (err, row) => {
        if (!err && row) {
            exports.db.run('UPDATE books SET rating = ?, reviews_count = ? WHERE id = ?', [row.avg_rating || 0, row.count, bookId]);
        }
    });
};
const saveBook = (userId, bookId) => {
    return new Promise((resolve, reject) => {
        exports.db.run('INSERT OR IGNORE INTO saved_books (user_id, book_id) VALUES (?, ?)', [userId, bookId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.lastID);
        });
    });
};
exports.saveBook = saveBook;
const unsaveBook = (userId, bookId) => {
    return new Promise((resolve, reject) => {
        exports.db.run('DELETE FROM saved_books WHERE user_id = ? AND book_id = ?', [userId, bookId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes);
        });
    });
};
exports.unsaveBook = unsaveBook;
const getSavedBooks = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT b.* FROM books b
      INNER JOIN saved_books sb ON b.id = sb.book_id
      WHERE sb.user_id = ?
      ORDER BY sb.created_at DESC
    `;
        exports.db.all(query, [userId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getSavedBooks = getSavedBooks;
const isBookSaved = (userId, bookId) => {
    return new Promise((resolve, reject) => {
        exports.db.get('SELECT 1 FROM saved_books WHERE user_id = ? AND book_id = ?', [userId, bookId], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(!!row);
        });
    });
};
exports.isBookSaved = isBookSaved;
const areBooksaved = (userId, bookIds) => {
    return new Promise((resolve, reject) => {
        if (bookIds.length === 0) {
            resolve(new Set());
            return;
        }
        const placeholders = bookIds.map(() => '?').join(',');
        exports.db.all(`SELECT book_id FROM saved_books WHERE user_id = ? AND book_id IN (${placeholders})`, [userId, ...bookIds], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(new Set(rows.map(r => r.book_id)));
        });
    });
};
exports.areBooksaved = areBooksaved;
const getTopBooks = (limit = 10) => {
    return new Promise((resolve, reject) => {
        exports.db.all('SELECT * FROM books WHERE rating > 0 ORDER BY rating DESC, reviews_count DESC LIMIT ?', [limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getTopBooks = getTopBooks;
const getMostDownloadedBooks = (limit = 10) => {
    return new Promise((resolve, reject) => {
        exports.db.all('SELECT * FROM books WHERE downloads_count > 0 ORDER BY downloads_count DESC LIMIT ?', [limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getMostDownloadedBooks = getMostDownloadedBooks;
const getNewestBooks = (limit = 10) => {
    return new Promise((resolve, reject) => {
        exports.db.all('SELECT * FROM books ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getNewestBooks = getNewestBooks;
const addFeedbackMessage = (feedbackData) => {
    return new Promise((resolve, reject) => {
        const { user_id, user_name, user_username, message } = feedbackData;
        const query = `
      INSERT INTO feedback_messages (user_id, user_name, user_username, message)
      VALUES (?, ?, ?, ?)
    `;
        exports.db.run(query, [user_id, user_name, user_username, message], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.lastID);
        });
    });
};
exports.addFeedbackMessage = addFeedbackMessage;
const getPendingFeedbackMessages = () => {
    return new Promise((resolve, reject) => {
        exports.db.all('SELECT * FROM feedback_messages WHERE status = ? ORDER BY created_at DESC', ['pending'], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getPendingFeedbackMessages = getPendingFeedbackMessages;
const getAllFeedbackMessages = () => {
    return new Promise((resolve, reject) => {
        exports.db.all('SELECT * FROM feedback_messages ORDER BY created_at DESC', [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getAllFeedbackMessages = getAllFeedbackMessages;
const markFeedbackAsRead = (feedbackId) => {
    return new Promise((resolve, reject) => {
        exports.db.run('UPDATE feedback_messages SET read_at = CURRENT_TIMESTAMP WHERE id = ?', [feedbackId], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.markFeedbackAsRead = markFeedbackAsRead;
const updateFeedbackStatus = (feedbackId, status) => {
    return new Promise((resolve, reject) => {
        exports.db.run('UPDATE feedback_messages SET status = ?, read_at = CURRENT_TIMESTAMP WHERE id = ?', [status, feedbackId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes);
        });
    });
};
exports.updateFeedbackStatus = updateFeedbackStatus;
const addAdminReply = (feedbackId, reply) => {
    return new Promise((resolve, reject) => {
        exports.db.run('UPDATE feedback_messages SET admin_reply = ?, status = ? WHERE id = ?', [reply, 'replied', feedbackId], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.addAdminReply = addAdminReply;
const getBookDetailedStats = (bookId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const book = await (0, exports.getBookById)(bookId);
            if (!book) {
                reject(new Error(`Book with id ${bookId} not found`));
                return;
            }
            const ratingDistribution = await new Promise((res, rej) => {
                exports.db.all(`SELECT rating, COUNT(*) as count FROM reviews 
           WHERE book_id = ? AND is_published = 1 
           GROUP BY rating`, [bookId], (err, rows) => {
                    if (err)
                        rej(err);
                    else {
                        const distribution = {
                            rating_1_count: 0,
                            rating_2_count: 0,
                            rating_3_count: 0,
                            rating_4_count: 0,
                            rating_5_count: 0
                        };
                        if (rows && rows.length > 0) {
                            const totalReviews = rows.reduce((sum, r) => sum + r.count, 0);
                            rows.forEach(row => {
                                const key = `rating_${row.rating}_count`;
                                distribution[key] = row.count;
                            });
                            res({ ...distribution, totalReviews });
                        }
                        else {
                            res({ ...distribution, totalReviews: 0 });
                        }
                    }
                });
            });
            const readersCount = await new Promise((res, rej) => {
                exports.db.get(`SELECT COUNT(*) as count FROM saved_books WHERE book_id = ?`, [bookId], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row?.count || 0);
                });
            });
            const popularQuotes = await new Promise((res, rej) => {
                exports.db.all(`SELECT comment FROM reviews 
           WHERE book_id = ? AND is_published = 1 AND comment IS NOT NULL 
           ORDER BY rating DESC LIMIT 5`, [bookId], (err, rows) => {
                    if (err)
                        rej(err);
                    else
                        res((rows || []).map(r => r.comment).filter(c => c && c.length > 0));
                });
            });
            const totalReviews = ratingDistribution.totalReviews;
            const ratingPercentages = {
                rating_1_percent: totalReviews > 0 ? ((ratingDistribution.rating_1_count / totalReviews) * 100).toFixed(1) : 0,
                rating_2_percent: totalReviews > 0 ? ((ratingDistribution.rating_2_count / totalReviews) * 100).toFixed(1) : 0,
                rating_3_percent: totalReviews > 0 ? ((ratingDistribution.rating_3_count / totalReviews) * 100).toFixed(1) : 0,
                rating_4_percent: totalReviews > 0 ? ((ratingDistribution.rating_4_count / totalReviews) * 100).toFixed(1) : 0,
                rating_5_percent: totalReviews > 0 ? ((ratingDistribution.rating_5_count / totalReviews) * 100).toFixed(1) : 0
            };
            const detailedStats = {
                book,
                rating_distribution: {
                    counts: {
                        rating_1: ratingDistribution.rating_1_count,
                        rating_2: ratingDistribution.rating_2_count,
                        rating_3: ratingDistribution.rating_3_count,
                        rating_4: ratingDistribution.rating_4_count,
                        rating_5: ratingDistribution.rating_5_count,
                        total_reviews: totalReviews
                    },
                    percentages: {
                        rating_1_percent: parseFloat(ratingPercentages.rating_1_percent),
                        rating_2_percent: parseFloat(ratingPercentages.rating_2_percent),
                        rating_3_percent: parseFloat(ratingPercentages.rating_3_percent),
                        rating_4_percent: parseFloat(ratingPercentages.rating_4_percent),
                        rating_5_percent: parseFloat(ratingPercentages.rating_5_percent)
                    }
                },
                readers_count: readersCount,
                popular_quotes: popularQuotes,
                recommended_age: book.recommended_age || 0,
                content_warnings: book.content_warnings ? JSON.parse(book.content_warnings) : []
            };
            resolve(detailedStats);
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.getBookDetailedStats = getBookDetailedStats;
const updateBookInfo = (bookId, recommendedAge, contentWarnings) => {
    return new Promise((resolve, reject) => {
        const updates = {};
        if (recommendedAge !== undefined) {
            updates.recommended_age = recommendedAge;
        }
        if (contentWarnings !== undefined) {
            updates.content_warnings = JSON.stringify(contentWarnings);
        }
        if (Object.keys(updates).length === 0) {
            resolve(0);
            return;
        }
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        const query = `UPDATE books SET ${fields} WHERE id = ?`;
        exports.db.run(query, [...values, bookId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes);
        });
    });
};
exports.updateBookInfo = updateBookInfo;
//# sourceMappingURL=models.js.map