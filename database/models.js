const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Initialize database
const dbPath = process.env.DB_PATH || './database/library.db';
const db = new sqlite3.Database(dbPath);

// Create tables
const initDatabase = () => {
  // Create books table
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

  // Create requests table
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

  // Create admins table
  const createAdminsTable = `
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.serialize(() => {
    db.run(createBooksTable);
    db.run(createRequestsTable);
    db.run(createAdminsTable);
  });
};

// Book functions
const addBook = (bookData) => {
  return new Promise((resolve, reject) => {
    const { title, author, genre, description, photoFileId } = bookData;
    const query = `
      INSERT INTO books (title, author, genre, description, photo_file_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.run(query, [title, author, genre, description, photoFileId], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getBooksByGenre = (genre) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM books WHERE genre = ?`;
    db.all(query, [genre], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getAllBooks = () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM books`;
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getBookById = (id) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM books WHERE id = ?`;
    db.get(query, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getGenres = () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT DISTINCT genre FROM books`;
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(row => row.genre));
    });
  });
};

// Request functions
const addRequest = (requestData) => {
  return new Promise((resolve, reject) => {
    const { userId, userName, bookId, fullName, unit, phone } = requestData;
    const query = `
      INSERT INTO requests (user_id, user_name, book_id, full_name, unit, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [userId, userName, bookId, fullName, unit, phone], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getPendingRequests = () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM requests WHERE status = 'pending'`;
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const updateRequestStatus = (requestId, status) => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(query, [status, requestId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

// Admin functions
const addAdmin = (userId, username) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT OR IGNORE INTO admins (user_id, username) VALUES (?, ?)`;
    db.run(query, [userId, username], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const isAdmin = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT 1 FROM admins WHERE user_id = ?`;
    db.get(query, [userId], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
};

// Stats functions
const getAdminStats = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM books) as totalBooks,
        (SELECT COUNT(*) FROM requests WHERE status = 'pending') as pendingRequests
    `;
    db.get(query, [], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

module.exports = {
  initDatabase,
  addBook,
  getBooksByGenre,
  getAllBooks,
  getBookById,
  getGenres,
  addRequest,
  getPendingRequests,
  updateRequestStatus,
  addAdmin,
  isAdmin,
  getAdminStats
};