"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStats = exports.isAdmin = exports.addAdmin = exports.getUserRequests = exports.updateRequestStatus = exports.getPendingRequests = exports.addRequest = exports.getGenres = exports.getBookById = exports.getAllBooks = exports.getBooksByGenre = exports.addBook = exports.initDatabase = exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbPath = process.env.DB_PATH || './database/library.db';
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
        is_available BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
    const createRequestsTable = `
    CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_name TEXT,
        book_id INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books (id)
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
    exports.db.serialize(() => {
        exports.db.run(createBooksTable);
        exports.db.run(createRequestsTable);
        exports.db.run(createAdminsTable);
    });
};
exports.initDatabase = initDatabase;
const addBook = (bookData) => {
    return new Promise((resolve, reject) => {
        const { title, author, genre, description, photo_file_id } = bookData;
        const query = `
      INSERT INTO books (title, author, genre, description, photo_file_id)
      VALUES (?, ?, ?, ?, ?)
    `;
        exports.db.run(query, [title, author, genre, description, photo_file_id], function (err) {
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
const addRequest = (requestData) => {
    return new Promise((resolve, reject) => {
        const { user_id, user_name, book_id, full_name, unit, phone } = requestData;
        const query = `
      INSERT INTO requests (user_id, user_name, book_id, full_name, unit, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        exports.db.run(query, [user_id, user_name, book_id, full_name, unit, phone], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.lastID);
        });
    });
};
exports.addRequest = addRequest;
const getPendingRequests = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM requests WHERE status = 'pending'`;
        exports.db.all(query, [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getPendingRequests = getPendingRequests;
const updateRequestStatus = (requestId, status) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        exports.db.run(query, [status, requestId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes);
        });
    });
};
exports.updateRequestStatus = updateRequestStatus;
const getUserRequests = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT r.*, b.title as book_title FROM requests r 
                  LEFT JOIN books b ON r.book_id = b.id 
                  WHERE r.user_id = ? 
                  ORDER BY r.created_at DESC`;
        exports.db.all(query, [userId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getUserRequests = getUserRequests;
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
        const query = `SELECT 1 FROM admins WHERE user_id = ?`;
        exports.db.get(query, [userId], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(!!row);
        });
    });
};
exports.isAdmin = isAdmin;
const getAdminStats = () => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT 
        (SELECT COUNT(*) FROM books) as totalBooks,
        (SELECT COUNT(*) FROM requests WHERE status = 'pending') as pendingRequests
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
//# sourceMappingURL=models.js.map