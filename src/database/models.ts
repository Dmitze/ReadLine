import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import { Database } from 'sqlite3';

// Initialize environment variables
dotenv.config();

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
  is_available?: boolean;
  created_at?: string;
}

export interface Request {
  id?: number;
  user_id: number;
  user_name?: string;
  book_id: number;
  full_name: string;
  unit: string;
  phone?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  book_title?: string; // For joined queries
}

export interface Admin {
  id?: number;
  user_id: number;
  username?: string;
  created_at?: string;
}

export interface AdminStats {
  totalBooks: number;
  pendingRequests: number;
}

// Initialize database
const dbPath = process.env.DB_PATH || './database/library.db';
export const db = new sqlite3.Database(dbPath);

// Create tables
export const initDatabase = (): void => {
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
export const addBook = (bookData: Omit<Book, 'id' | 'is_available' | 'created_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const { title, author, genre, description, photo_file_id } = bookData;
    const query = `
      INSERT INTO books (title, author, genre, description, photo_file_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.run(query, [title, author, genre, description, photo_file_id], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
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

// Request functions
export const addRequest = (requestData: Omit<Request, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const { user_id, user_name, book_id, full_name, unit, phone } = requestData;
    const query = `
      INSERT INTO requests (user_id, user_name, book_id, full_name, unit, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [user_id, user_name, book_id, full_name, unit, phone], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

export const getPendingRequests = (): Promise<Request[]> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM requests WHERE status = 'pending'`;
    db.all(query, [], (err, rows: Request[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const updateRequestStatus = (requestId: number, status: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(query, [status, requestId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

// Get user requests
export const getUserRequests = (userId: number): Promise<Request[]> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT r.*, b.title as book_title FROM requests r 
                  LEFT JOIN books b ON r.book_id = b.id 
                  WHERE r.user_id = ? 
                  ORDER BY r.created_at DESC`;
    db.all(query, [userId], (err, rows: Request[]) => {
      if (err) reject(err);
      else resolve(rows);
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
    const query = `SELECT 1 FROM admins WHERE user_id = ?`;
    db.get(query, [userId], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
};

// Stats functions
export const getAdminStats = (): Promise<AdminStats> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM books) as totalBooks,
        (SELECT COUNT(*) FROM requests WHERE status = 'pending') as pendingRequests
    `;
    db.get(query, [], (err, row: AdminStats) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};