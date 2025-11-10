"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAdminReply = exports.updateFeedbackStatus = exports.markFeedbackAsRead = exports.getAllFeedbackMessages = exports.getPendingFeedbackMessages = exports.addFeedbackMessage = exports.getNewestBooks = exports.getMostDownloadedBooks = exports.getTopBooks = exports.isBookSaved = exports.getSavedBooks = exports.unsaveBook = exports.saveBook = exports.deleteReview = exports.publishReview = exports.getPendingReviews = exports.getBookReviews = exports.addReview = exports.incrementDownloads = exports.deleteBook = exports.updateBook = exports.searchBooks = exports.getBooksWithPagination = exports.getBooksByGenreWithPagination = exports.getAdminStats = exports.getAllAdmins = exports.isAdmin = exports.addAdmin = exports.getGenres = exports.getBookById = exports.getAllAvailableBooks = exports.getAllBooks = exports.getBooksByGenre = exports.addBook = exports.initDatabase = exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbPath = process.env.DB_PATH || './database/library.db';
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Створено директорію для БД: ${dbDir}`);
}
exports.db = new sqlite3_1.default.Database(dbPath);
const initDatabase = () => {
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
    exports.db.serialize(() => {
        exports.db.run(createBooksTable);
        exports.db.run(createAdminsTable);
        exports.db.run(createReviewsTable);
        exports.db.run(createSavedBooksTable);
        exports.db.run(createFeedbackMessagesTable);
        exports.db.run(createUsersTable);
    });
};
exports.initDatabase = initDatabase;
const addBook = (bookData) => {
    return new Promise((resolve, reject) => {
        const { title, author, genre, description, photo_file_id, file_url, file_type = 'physical', file_name } = bookData;
        const query = `
      INSERT INTO books (title, author, genre, description, photo_file_id, file_url, file_type, file_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
        exports.db.run(query, [title, author, genre, description, photo_file_id, file_url, file_type, file_name], function (err) {
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
            if (err)
                reject(err);
            else
                resolve(rows.map(row => row.genre));
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
const getBooksByGenreWithPagination = (genre, limit = 5, offset = 0) => {
    return new Promise((resolve, reject) => {
        exports.db.get('SELECT COUNT(*) as total FROM books WHERE genre = ?', [genre], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            exports.db.all('SELECT * FROM books WHERE genre = ? LIMIT ? OFFSET ?', [genre, limit, offset], (err, books) => {
                if (err)
                    reject(err);
                else
                    resolve({ books, total: countRow.total });
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
            exports.db.all('SELECT * FROM books LIMIT ? OFFSET ?', [limit, offset], (err, books) => {
                if (err)
                    reject(err);
                else
                    resolve({ books, total: countRow.total });
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
        exports.db.run('UPDATE feedback_messages SET status = ? WHERE id = ?', [status, feedbackId], (err) => {
            if (err)
                reject(err);
            else
                resolve();
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
(0, exports.initDatabase)();
//# sourceMappingURL=models.js.map