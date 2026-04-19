"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
const logger_1 = require("../utils/logger");
class BookRepository extends BaseRepository_1.BaseRepository {
    constructor(db) {
        super(db, 'books');
    }
    async create(book) {
        try {
            const { title, author, genre, description, photo_file_id, file_url, audio_file_id, online_link, file_type, file_name, } = book;
            const query = `
        INSERT INTO books (
          title, author, genre, description, photo_file_id,
          file_url, audio_file_id, online_link, file_type, file_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
            const bookId = await this.db.insert(query, [
                title,
                author,
                genre,
                description,
                photo_file_id,
                file_url || null,
                audio_file_id || null,
                online_link || null,
                file_type || 'physical',
                file_name || null,
            ]);
            logger_1.logger.info(`Book created: ${title}`, { bookId });
            return bookId;
        }
        catch (error) {
            logger_1.logger.error('Error creating book', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async update(bookId, updates) {
        try {
            if (Object.keys(updates).length === 0) {
                return 0;
            }
            const allowedFields = [
                'title',
                'author',
                'genre',
                'description',
                'photo_file_id',
                'file_url',
                'audio_file_id',
                'online_link',
                'file_type',
                'file_name',
                'rating',
                'reviews_count',
                'downloads_count',
                'is_available',
                'is_physically_available',
            ];
            const validUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    validUpdates[key] = value;
                }
            }
            if (Object.keys(validUpdates).length === 0) {
                return 0;
            }
            const fields = Object.keys(validUpdates)
                .map((key) => `"${key}" = ?`)
                .join(', ');
            const values = Object.values(validUpdates);
            const query = `UPDATE books SET ${fields} WHERE id = ?`;
            const changes = await this.db.update(query, [...values, bookId]);
            if (changes > 0) {
                logger_1.logger.info(`Book updated: ${bookId}`, { changes });
            }
            return changes;
        }
        catch (error) {
            logger_1.logger.error('Error updating book', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getByGenre(genre) {
        try {
            const query = 'SELECT * FROM books WHERE genre = ? ORDER BY rating DESC';
            return await this.db.all(query, [genre]);
        }
        catch (error) {
            logger_1.logger.error('Error getting books by genre', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getByGenreWithPagination(genre, limit = 5, offset = 0) {
        try {
            const totalQuery = 'SELECT COUNT(*) as total FROM books WHERE genre = ?';
            const totalResult = await this.db.get(totalQuery, [genre]);
            const total = totalResult?.total || 0;
            const booksQuery = 'SELECT * FROM books WHERE genre = ? ORDER BY rating DESC LIMIT ? OFFSET ?';
            const books = await this.db.all(booksQuery, [genre, limit, offset]);
            return { books, total };
        }
        catch (error) {
            logger_1.logger.error('Error getting books by genre with pagination', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getAllWithPagination(limit = 5, offset = 0) {
        try {
            const totalQuery = 'SELECT COUNT(*) as total FROM books';
            const totalResult = await this.db.get(totalQuery, []);
            const total = totalResult?.total || 0;
            const booksQuery = 'SELECT * FROM books LIMIT ? OFFSET ?';
            const books = await this.db.all(booksQuery, [limit, offset]);
            return { books, total };
        }
        catch (error) {
            logger_1.logger.error('Error getting all books with pagination', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async search(searchTerm, limit = 10) {
        try {
            const pattern = `%${searchTerm}%`;
            const query = `
        SELECT * FROM books
        WHERE title LIKE ? COLLATE NOCASE
           OR author LIKE ? COLLATE NOCASE
           OR genre LIKE ? COLLATE NOCASE
        ORDER BY rating DESC
        LIMIT ?
      `;
            return await this.db.all(query, [pattern, pattern, pattern, limit]);
        }
        catch (error) {
            logger_1.logger.error('Error searching books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getTopRated(limit = 10) {
        try {
            const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY rating DESC, reviews_count DESC
        LIMIT ?
      `;
            return await this.db.all(query, [limit]);
        }
        catch (error) {
            logger_1.logger.error('Error getting top rated books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getNewest(limit = 10) {
        try {
            const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY created_at DESC
        LIMIT ?
      `;
            return await this.db.all(query, [limit]);
        }
        catch (error) {
            logger_1.logger.error('Error getting newest books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getRandom() {
        try {
            const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY RANDOM()
        LIMIT 1
      `;
            return await this.db.get(query, []);
        }
        catch (error) {
            logger_1.logger.error('Error getting random book', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getAllGenres() {
        try {
            const query = `
        SELECT DISTINCT genre FROM books 
        WHERE is_available = 1
        ORDER BY genre ASC
      `;
            const results = await this.db.all(query, []);
            return results.map((r) => r.genre);
        }
        catch (error) {
            logger_1.logger.error('Error getting all genres', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async incrementDownloads(bookId) {
        try {
            const query = 'UPDATE books SET downloads_count = downloads_count + 1 WHERE id = ?';
            await this.db.update(query, [bookId]);
        }
        catch (error) {
            logger_1.logger.error('Error incrementing downloads', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getLowRatedBooks(maxRating = 2, limit = 20) {
        try {
            const query = `
        SELECT * FROM books 
        WHERE rating <= ? AND reviews_count >= 3
        ORDER BY rating ASC, reviews_count DESC
        LIMIT ?
      `;
            return await this.db.all(query, [maxRating, limit]);
        }
        catch (error) {
            logger_1.logger.error('Error getting low rated books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getByAuthor(author, limit) {
        try {
            let query = `
        SELECT * FROM books
        WHERE author = ? COLLATE NOCASE
        ORDER BY rating DESC
      `;
            const params = [author];
            if (limit !== undefined) {
                query += ' LIMIT ?';
                params.push(limit);
            }
            return await this.db.all(query, params);
        }
        catch (error) {
            logger_1.logger.error('Error getting books by author', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async findByQuery(searchTerm, limit) {
        return this.search(searchTerm, limit || 10);
    }
    async findMostRated(limit) {
        return this.getTopRated(limit || 10);
    }
    async findNewest(limit) {
        return this.getNewest(limit || 10);
    }
    async findByGenre(genre) {
        return this.getByGenre(genre);
    }
}
exports.BookRepository = BookRepository;
//# sourceMappingURL=BookRepository.js.map