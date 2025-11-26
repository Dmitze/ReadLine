"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedBookRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
const logger_1 = require("../utils/logger");
class SavedBookRepository extends BaseRepository_1.BaseRepository {
    constructor(db) {
        super(db, 'saved_books');
    }
    async save(userId, bookId) {
        try {
            const existing = await this.getBySavedId(userId, bookId);
            if (existing) {
                return existing.id;
            }
            const query = `
        INSERT INTO saved_books (user_id, book_id)
        VALUES (?, ?)
      `;
            const id = await this.db.insert(query, [userId, bookId]);
            logger_1.logger.info('Book saved by user', { userId, bookId });
            return id;
        }
        catch (error) {
            logger_1.logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getByUserId(userId) {
        try {
            const query = `
        SELECT * FROM saved_books 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `;
            return await this.db.all(query, [userId]);
        }
        catch (error) {
            logger_1.logger.error('Error getting user saved books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async remove(userId, bookId) {
        try {
            const query = 'DELETE FROM saved_books WHERE user_id = ? AND book_id = ?';
            const changes = await this.db.delete(query, [userId, bookId]);
            if (changes > 0) {
                logger_1.logger.info('Book removed from saved', { userId, bookId });
            }
            return changes;
        }
        catch (error) {
            logger_1.logger.error('Error removing saved book', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async isSaved(userId, bookId) {
        try {
            const query = `
        SELECT COUNT(*) as count FROM saved_books 
        WHERE user_id = ? AND book_id = ?
      `;
            const result = await this.db.get(query, [userId, bookId]);
            return (result?.count || 0) > 0;
        }
        catch (error) {
            logger_1.logger.error('Error checking if book is saved', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getCountByUserId(userId) {
        try {
            return await this.count('user_id = ?', [userId]);
        }
        catch (error) {
            logger_1.logger.error('Error getting saved books count', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async clearByUserId(userId) {
        try {
            const query = 'DELETE FROM saved_books WHERE user_id = ?';
            return await this.db.delete(query, [userId]);
        }
        catch (error) {
            logger_1.logger.error('Error clearing user saved books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getBySavedId(userId, bookId) {
        try {
            const query = 'SELECT * FROM saved_books WHERE user_id = ? AND book_id = ?';
            return await this.db.get(query, [userId, bookId]);
        }
        catch (error) {
            logger_1.logger.error('Error getting saved book', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getMostSaved(limit = 10) {
        try {
            const query = `
        SELECT book_id as bookId, COUNT(*) as saveCount FROM saved_books 
        GROUP BY book_id
        ORDER BY saveCount DESC
        LIMIT ?
      `;
            return await this.db.all(query, [limit]);
        }
        catch (error) {
            logger_1.logger.error('Error getting most saved books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async findByUserId(userId) {
        return this.getByUserId(userId);
    }
    async deleteByBookId(bookId) {
        try {
            const query = 'DELETE FROM saved_books WHERE book_id = ?';
            return await this.db.delete(query, [bookId]);
        }
        catch (error) {
            logger_1.logger.error('Error deleting saved books by book id', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
}
exports.SavedBookRepository = SavedBookRepository;
//# sourceMappingURL=SavedBookRepository.js.map