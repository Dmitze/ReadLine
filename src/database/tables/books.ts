/**
 * Books Table Operations
 * REFACTOR-009: Split models.ts - Books module
 */

import { db } from './db';
import { Book } from './types';
import { logger } from '../../utils/logger';

/**
 * Add a new book
 */
export const addBook = (
  bookData: Omit<Book, 'id' | 'is_available' | 'created_at'>
): Promise<number> => {
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
      file_name,
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
        title,
        author,
        genre,
        description,
        photo_file_id,
        file_url || null,
        audio_file_id || null,
        online_link || null,
        file_type,
        file_name,
      ],
      function (err) {
        if (err) {
          logger.error('Error adding book', err, { title, author });
          reject(err);
        } else {
          logger.info('Book added successfully', { id: this.lastID, title });
          resolve(this.lastID);
        }
      }
    );
  });
};

/**
 * Get books by genre
 */
export const getBooksByGenre = (genre: string): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM books WHERE genre = ?';
    db.all(query, [genre], (err, rows: Book[]) => {
      if (err) {
        logger.error('Error getting books by genre', err, { genre });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get all books
 */
export const getAllBooks = (): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM books';
    db.all(query, [], (err, rows: Book[]) => {
      if (err) {
        logger.error('Error getting all books', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get all available books
 */
export const getAllAvailableBooks = (): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM books WHERE (is_available = 1 OR is_available IS NULL)';
    db.all(query, [], (err, rows: Book[]) => {
      if (err) {
        logger.error('Error getting available books', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get book by ID
 */
export const getBookById = (id: number): Promise<Book | undefined> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM books WHERE id = ?';
    db.get(query, [id], (err, row: Book) => {
      if (err) {
        logger.error('Error getting book by ID', err, { bookId: id });
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Get all genres
 */
export const getGenres = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre';
    db.all(query, [], (err, rows: { genre: string }[]) => {
      if (err) {
        logger.error('Error getting genres', err);
        reject(err);
      } else {
        resolve(rows.map((row) => row.genre));
      }
    });
  });
};

/**
 * Get books by genre with pagination
 */
export const getBooksByGenreWithPagination = (
  genre: string,
  page: number = 1,
  limit: number = 10
): Promise<{ books: Book[]; total: number }> => {
  return new Promise((resolve, reject) => {
    const offset = (page - 1) * limit;
    const booksQuery = `
      SELECT * FROM books 
      WHERE genre = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const countQuery = 'SELECT COUNT(*) as total FROM books WHERE genre = ?';

    db.get(countQuery, [genre], (err, countRow: { total: number }) => {
      if (err) {
        logger.error('Error counting books by genre', err, { genre });
        reject(err);
        return;
      }

      db.all(booksQuery, [genre, limit, offset], (err, rows: Book[]) => {
        if (err) {
          logger.error('Error getting books by genre with pagination', err, { genre, page, limit });
          reject(err);
        } else {
          resolve({
            books: rows,
            total: countRow.total,
          });
        }
      });
    });
  });
};

/**
 * Get books with pagination
 */
export const getBooksWithPagination = (
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{ books: Book[]; total: number; totalPages: number }> => {
  return new Promise((resolve, reject) => {
    const offset = (page - 1) * limit;

    let booksQuery = 'SELECT * FROM books';
    let countQuery = 'SELECT COUNT(*) as total FROM books';
    const params: any[] = [];
    let countParams: any[] = [];

    if (search) {
      const searchPattern = `%${search}%`;
      booksQuery += ' WHERE title LIKE ? OR author LIKE ? OR genre LIKE ?';
      countQuery += ' WHERE title LIKE ? OR author LIKE ? OR genre LIKE ?';
      params.push(searchPattern, searchPattern, searchPattern);
      countParams = [searchPattern, searchPattern, searchPattern];
    }

    booksQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.get(countQuery, countParams, (err, countRow: { total: number }) => {
      if (err) {
        logger.error('Error counting books', err);
        reject(err);
        return;
      }

      db.all(booksQuery, params, (err, rows: Book[]) => {
        if (err) {
          logger.error('Error getting books with pagination', err, { page, limit, search });
          reject(err);
        } else {
          const totalPages = Math.ceil(countRow.total / limit);
          resolve({
            books: rows,
            total: countRow.total,
            totalPages,
          });
        }
      });
    });
  });
};

/**
 * Update book
 */
export const updateBook = (bookId: number, updates: Partial<Book>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates).filter((key) => key !== 'id');
    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => (updates as any)[field]);

    const query = `UPDATE books SET ${setClause} WHERE id = ?`;

    db.run(query, [...values, bookId], function (err) {
      if (err) {
        logger.error('Error updating book', err, { bookId, updates });
        reject(err);
      } else {
        logger.info('Book updated successfully', { bookId, changes: this.changes });
        resolve(this.changes);
      }
    });
  });
};

/**
 * Delete book
 */
export const deleteBook = (bookId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM books WHERE id = ?';

    db.run(query, [bookId], function (err) {
      if (err) {
        logger.error('Error deleting book', err, { bookId });
        reject(err);
      } else {
        logger.info('Book deleted successfully', { bookId, changes: this.changes });
        resolve(this.changes);
      }
    });
  });
};

/**
 * Get top books by rating
 */
export const getTopBooks = (limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM books 
      WHERE rating IS NOT NULL AND rating > 0 
      ORDER BY rating DESC, reviews_count DESC 
      LIMIT ?
    `;

    db.all(query, [limit], (err, rows: Book[]) => {
      if (err) {
        logger.error('Error getting top books', err, { limit });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get most downloaded books
 */
export const getMostDownloadedBooks = (limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM books 
      WHERE downloads_count IS NOT NULL AND downloads_count > 0 
      ORDER BY downloads_count DESC 
      LIMIT ?
    `;

    db.all(query, [limit], (err, rows: Book[]) => {
      if (err) {
        logger.error('Error getting most downloaded books', err, { limit });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get newest books
 */
export const getNewestBooks = (limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM books 
      ORDER BY created_at DESC 
      LIMIT ?
    `;

    db.all(query, [limit], (err, rows: Book[]) => {
      if (err) {
        logger.error('Error getting newest books', err, { limit });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Increment book downloads count
 */
export const incrementDownloads = (bookId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE books 
      SET downloads_count = COALESCE(downloads_count, 0) + 1 
      WHERE id = ?
    `;

    db.run(query, [bookId], (err) => {
      if (err) {
        logger.error('Error incrementing downloads', err, { bookId });
        reject(err);
      } else {
        logger.info('Downloads incremented', { bookId });
        resolve();
      }
    });
  });
};

/**
 * Update book info (complex updates)
 */
export const updateBookInfo = (bookId: number, field: string, value: any): Promise<number> => {
  return new Promise((resolve, reject) => {
    const allowedFields = [
      'title',
      'author',
      'genre',
      'description',
      'photo_file_id',
      'file_url',
      'pdf_file_id',
      'audio_file_id',
      'audio_duration',
      'audio_external_link',
      'narrator',
      'online_link',
      'external_link',
      'file_type',
      'file_name',
      'recommended_age',
      'content_warnings',
    ];

    if (!allowedFields.includes(field)) {
      reject(new Error(`Field ${field} is not allowed to be updated`));
      return;
    }

    const query = `UPDATE books SET ${field} = ? WHERE id = ?`;

    db.run(query, [value, bookId], function (err) {
      if (err) {
        logger.error('Error updating book info', err, { bookId, field, value });
        reject(err);
      } else {
        logger.info('Book info updated', { bookId, field, changes: this.changes });
        resolve(this.changes);
      }
    });
  });
};

/**
 * Search books with case-insensitive and partial match support
 */
export const searchBooks = (query: string, limit: number = 20): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const searchPattern = `%${query.toLowerCase()}%`;
    const sql = `
      SELECT * FROM books 
      WHERE LOWER(title) LIKE ? 
         OR LOWER(author) LIKE ? 
         OR LOWER(description) LIKE ? 
         OR LOWER(genre) LIKE ?
      ORDER BY 
        CASE 
          WHEN LOWER(title) LIKE ? THEN 1
          WHEN LOWER(author) LIKE ? THEN 2
          ELSE 3
        END,
        rating DESC
      LIMIT ?
    `;

    db.all(
      sql,
      [
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        limit,
      ],
      (err, rows: Book[]) => {
        if (err) {
          logger.error('Error searching books', err, { query, limit });
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};
