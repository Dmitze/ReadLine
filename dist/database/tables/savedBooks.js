"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSavedBooksCount = exports.getSavedBooks = exports.isBookSaved = exports.unsaveBook = exports.saveBook = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
const saveBook = (userId, bookId) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT OR IGNORE INTO saved_books (user_id, book_id) VALUES (?, ?)';
        db_1.db.run(query, [userId, bookId], (err) => {
            if (err) {
                logger_1.logger.error('Error saving book', err, { userId, bookId });
                reject(err);
            }
            else {
                logger_1.logger.info('Book saved', { userId, bookId });
                resolve();
            }
        });
    });
};
exports.saveBook = saveBook;
const unsaveBook = (userId, bookId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM saved_books WHERE user_id = ? AND book_id = ?';
        db_1.db.run(query, [userId, bookId], (err) => {
            if (err) {
                logger_1.logger.error('Error unsaving book', err, { userId, bookId });
                reject(err);
            }
            else {
                logger_1.logger.info('Book unsaved', { userId, bookId });
                resolve();
            }
        });
    });
};
exports.unsaveBook = unsaveBook;
const isBookSaved = (userId, bookId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT COUNT(*) as count FROM saved_books WHERE user_id = ? AND book_id = ?';
        db_1.db.get(query, [userId, bookId], (err, row) => {
            if (err) {
                logger_1.logger.error('Error checking if book is saved', err, { userId, bookId });
                reject(err);
            }
            else {
                resolve(row.count > 0);
            }
        });
    });
};
exports.isBookSaved = isBookSaved;
const getSavedBooks = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT b.* 
      FROM books b
      INNER JOIN saved_books sb ON b.id = sb.book_id
      WHERE sb.user_id = ?
      ORDER BY sb.created_at DESC
    `;
        db_1.db.all(query, [userId], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting saved books', err, { userId });
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getSavedBooks = getSavedBooks;
const getSavedBooksCount = (userId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT COUNT(*) as count FROM saved_books WHERE user_id = ?';
        db_1.db.get(query, [userId], (err, row) => {
            if (err) {
                logger_1.logger.error('Error getting saved books count', err, { userId });
                reject(err);
            }
            else {
                resolve(row.count);
            }
        });
    });
};
exports.getSavedBooksCount = getSavedBooksCount;
//# sourceMappingURL=savedBooks.js.map