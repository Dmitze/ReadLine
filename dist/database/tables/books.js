"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchBooks = exports.searchBooksByField = exports.updateBookInfo = exports.incrementDownloads = exports.getNewestBooks = exports.getMostDownloadedBooks = exports.getTopBooks = exports.deleteBook = exports.updateBook = exports.getBooksWithPagination = exports.getBooksByGenreWithPagination = exports.getGenres = exports.getBookById = exports.getBooksByIds = exports.getAllAvailableBooks = exports.getAllBooks = exports.getBooksByGenre = exports.addBook = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
const addBook = (bookData) => {
    return new Promise((resolve, reject) => {
        const { title, author, genre, description, photo_file_id, pdf_file_id, file_url, audio_file_id, online_link, file_type = 'physical', file_name, isbn, language, is_physically_available = false, } = bookData;
        const query = `
      INSERT INTO books (
        title, author, genre, description, photo_file_id,
        pdf_file_id, file_url, audio_file_id, online_link,
        file_type, file_name, isbn, language, is_available, is_physically_available
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `;
        db_1.db.run(query, [
            title,
            author,
            genre,
            description,
            photo_file_id,
            pdf_file_id || null,
            file_url || null,
            audio_file_id || null,
            online_link || null,
            file_type,
            file_name,
            isbn || null,
            language || 'Українська',
            is_physically_available ? 1 : 0,
        ], function (err) {
            if (err) {
                logger_1.logger.error('Error adding book', err, { title, author });
                reject(err);
            }
            else {
                logger_1.logger.info('Book added successfully', { id: this.lastID, title });
                resolve(this.lastID);
            }
        });
    });
};
exports.addBook = addBook;
const getBooksByGenre = (genre) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM books WHERE genre LIKE ?';
        db_1.db.all(query, [`%${genre}%`], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting books by genre', err, { genre });
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getBooksByGenre = getBooksByGenre;
const getAllBooks = () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM books';
        db_1.db.all(query, [], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting all books', err);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getAllBooks = getAllBooks;
const getAllAvailableBooks = () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM books WHERE (is_available = 1 OR is_available IS NULL)';
        db_1.db.all(query, [], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting available books', err);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getAllAvailableBooks = getAllAvailableBooks;
const getBooksByIds = (ids) => {
    return new Promise((resolve, reject) => {
        if (ids.length === 0) {
            resolve(new Map());
            return;
        }
        const placeholders = ids.map(() => '?').join(',');
        const query = `SELECT * FROM books WHERE id IN (${placeholders})`;
        db_1.db.all(query, ids, (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting books by IDs', err, { count: ids.length });
                reject(err);
            }
            else {
                const bookMap = new Map();
                for (const book of rows) {
                    if (book.id !== undefined) {
                        bookMap.set(book.id, book);
                    }
                }
                resolve(bookMap);
            }
        });
    });
};
exports.getBooksByIds = getBooksByIds;
const getBookById = (id) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM books WHERE id = ?';
        db_1.db.get(query, [id], (err, row) => {
            if (err) {
                logger_1.logger.error('Error getting book by ID', err, { bookId: id });
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
};
exports.getBookById = getBookById;
const getGenres = () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre';
        db_1.db.all(query, [], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting genres', err);
                reject(err);
            }
            else {
                resolve(rows.map((row) => row.genre));
            }
        });
    });
};
exports.getGenres = getGenres;
const getBooksByGenreWithPagination = (genre, page = 1, limit = 10) => {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        const booksQuery = `
      SELECT * FROM books 
      WHERE genre LIKE ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
        const countQuery = 'SELECT COUNT(*) as total FROM books WHERE genre LIKE ?';
        db_1.db.get(countQuery, [`%${genre}%`], (err, countRow) => {
            if (err) {
                logger_1.logger.error('Error counting books by genre', err, { genre });
                reject(err);
                return;
            }
            db_1.db.all(booksQuery, [`%${genre}%`, limit, offset], (err, rows) => {
                if (err) {
                    logger_1.logger.error('Error getting books by genre with pagination', err, { genre, page, limit });
                    reject(err);
                }
                else {
                    resolve({
                        books: rows,
                        total: countRow.total,
                    });
                }
            });
        });
    });
};
exports.getBooksByGenreWithPagination = getBooksByGenreWithPagination;
const getBooksWithPagination = (page = 1, limit = 10, search) => {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        let booksQuery = 'SELECT * FROM books';
        let countQuery = 'SELECT COUNT(*) as total FROM books';
        const params = [];
        let countParams = [];
        if (search) {
            const searchPattern = `%${search}%`;
            booksQuery += ' WHERE title LIKE ? OR author LIKE ? OR genre LIKE ?';
            countQuery += ' WHERE title LIKE ? OR author LIKE ? OR genre LIKE ?';
            params.push(searchPattern, searchPattern, searchPattern);
            countParams = [searchPattern, searchPattern, searchPattern];
        }
        booksQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        db_1.db.get(countQuery, countParams, (err, countRow) => {
            if (err) {
                logger_1.logger.error('Error counting books', err);
                reject(err);
                return;
            }
            db_1.db.all(booksQuery, params, (err, rows) => {
                if (err) {
                    logger_1.logger.error('Error getting books with pagination', err, { page, limit, search });
                    reject(err);
                }
                else {
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
exports.getBooksWithPagination = getBooksWithPagination;
const updateBook = (bookId, updates) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updates).filter((key) => key !== 'id');
        const setClause = fields.map((field) => `${field} = ?`).join(', ');
        const values = fields.map((field) => updates[field]);
        const query = `UPDATE books SET ${setClause} WHERE id = ?`;
        db_1.db.run(query, [...values, bookId], function (err) {
            if (err) {
                logger_1.logger.error('Error updating book', err, { bookId, updates });
                reject(err);
            }
            else {
                logger_1.logger.info('Book updated successfully', { bookId, changes: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.updateBook = updateBook;
const deleteBook = (bookId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM books WHERE id = ?';
        db_1.db.run(query, [bookId], function (err) {
            if (err) {
                logger_1.logger.error('Error deleting book', err, { bookId });
                reject(err);
            }
            else {
                logger_1.logger.info('Book deleted successfully', { bookId, changes: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.deleteBook = deleteBook;
const getTopBooks = (limit = 10) => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT * FROM books 
      WHERE rating IS NOT NULL AND rating > 0 
      ORDER BY rating DESC, reviews_count DESC 
      LIMIT ?
    `;
        db_1.db.all(query, [limit], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting top books', err, { limit });
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getTopBooks = getTopBooks;
const getMostDownloadedBooks = (limit = 10) => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT * FROM books 
      WHERE downloads_count IS NOT NULL AND downloads_count > 0 
      ORDER BY downloads_count DESC 
      LIMIT ?
    `;
        db_1.db.all(query, [limit], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting most downloaded books', err, { limit });
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getMostDownloadedBooks = getMostDownloadedBooks;
const getNewestBooks = (limit = 10) => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT * FROM books 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
        db_1.db.all(query, [limit], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting newest books', err, { limit });
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getNewestBooks = getNewestBooks;
const incrementDownloads = (bookId) => {
    return new Promise((resolve, reject) => {
        const query = `
      UPDATE books 
      SET downloads_count = COALESCE(downloads_count, 0) + 1 
      WHERE id = ?
    `;
        db_1.db.run(query, [bookId], (err) => {
            if (err) {
                logger_1.logger.error('Error incrementing downloads', err, { bookId });
                reject(err);
            }
            else {
                logger_1.logger.info('Downloads incremented', { bookId });
                resolve();
            }
        });
    });
};
exports.incrementDownloads = incrementDownloads;
const updateBookInfo = (bookId, field, value) => {
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
            'isbn',
            'language',
            'recommended_age',
            'content_warnings',
        ];
        if (!allowedFields.includes(field)) {
            reject(new Error(`Field ${field} is not allowed to be updated`));
            return;
        }
        const query = `UPDATE books SET ${field} = ? WHERE id = ?`;
        db_1.db.run(query, [value, bookId], function (err) {
            if (err) {
                logger_1.logger.error('Error updating book info', err, { bookId, field, value });
                reject(err);
            }
            else {
                logger_1.logger.info('Book info updated', { bookId, field, changes: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.updateBookInfo = updateBookInfo;
const searchBooksByField = (field, query, limit = 20) => {
    return new Promise((resolve, reject) => {
        const sql = `
      SELECT * FROM books
      WHERE ${field} LIKE ? OR lower(${field}) LIKE lower(?)
      ORDER BY
        CASE WHEN ${field} LIKE ? THEN 0 ELSE 1 END,
        rating DESC
      LIMIT ?
    `;
        const partial = `%${query}%`;
        db_1.db.all(sql, [partial, partial, partial, limit], (err, rows) => {
            if (err) {
                logger_1.logger.error(`Error searching books by ${field}`, err, { query, limit });
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.searchBooksByField = searchBooksByField;
const searchBooks = (query, limit = 20) => {
    return new Promise((resolve, reject) => {
        const pattern = `%${query}%`;
        const patternLower = `%${query.toLowerCase()}%`;
        const sql = `
      SELECT * FROM books
      WHERE title LIKE ? OR lower(title) LIKE ?
         OR author LIKE ? OR lower(author) LIKE ?
         OR description LIKE ? OR lower(description) LIKE ?
         OR genre LIKE ? OR lower(genre) LIKE ?
      ORDER BY
        CASE
          WHEN title LIKE ? THEN 1
          WHEN author LIKE ? THEN 2
          ELSE 3
        END,
        rating DESC
      LIMIT ?
    `;
        db_1.db.all(sql, [
            pattern, patternLower,
            pattern, patternLower,
            pattern, patternLower,
            pattern, patternLower,
            pattern, pattern,
            limit,
        ], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error searching books', err, { query, limit });
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.searchBooks = searchBooks;
//# sourceMappingURL=books.js.map