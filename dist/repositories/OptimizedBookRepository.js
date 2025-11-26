"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedBookRepository = void 0;
const OptimizedRepository_1 = require("./OptimizedRepository");
const logger_1 = require("../utils/logger");
class OptimizedBookRepository extends OptimizedRepository_1.OptimizedRepository {
    constructor(db, optimizer) {
        super(db, 'books', optimizer);
    }
    async initializeIndexes() {
        try {
            await this.queryOptimizer.createIndex({
                tableName: 'books',
                columns: ['genre'],
                name: 'idx_books_genre',
            });
            await this.queryOptimizer.createIndex({
                tableName: 'books',
                columns: ['author'],
                name: 'idx_books_author',
            });
            await this.queryOptimizer.createIndex({
                tableName: 'books',
                columns: ['rating'],
                name: 'idx_books_rating',
            });
            await this.queryOptimizer.createIndex({
                tableName: 'books',
                columns: ['created_at'],
                name: 'idx_books_created_at',
            });
            await this.queryOptimizer.createIndex({
                tableName: 'books',
                columns: ['is_available'],
                name: 'idx_books_is_available',
            });
            await this.queryOptimizer.createIndex({
                tableName: 'books',
                columns: ['genre', 'rating'],
                name: 'idx_books_genre_rating',
            });
            logger_1.logger.info('Book indexes initialized');
        }
        catch (error) {
            logger_1.logger.error('Error initializing indexes', error instanceof Error ? error : new Error(String(error)));
        }
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
            this.queryOptimizer.invalidateTableCache('books');
            logger_1.logger.info(`Book created: ${title}`, { bookId });
            return bookId;
        }
        catch (error) {
            logger_1.logger.error('Error creating book', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getByGenrePaginated(genre, limit = 5, offset = 0) {
        try {
            const cacheKey = `books:genre:${genre}:${limit}:${offset}`;
            const [data, total] = await Promise.all([
                this.queryOptimizer.executeOptimized('SELECT * FROM books WHERE genre = ? ORDER BY rating DESC LIMIT ? OFFSET ?', [genre, limit, offset], `${cacheKey}:data`, 300000),
                this.queryOptimizer.getOptimized('SELECT COUNT(*) as count FROM books WHERE genre = ?', [genre], `${cacheKey}:count`, 300000),
            ]);
            const totalCount = total?.count || 0;
            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(totalCount / limit);
            return {
                data,
                total: totalCount,
                limit,
                offset,
                page,
                totalPages,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting books by genre with pagination', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async searchOptimized(searchTerm, limit = 10) {
        try {
            const pattern = `%${searchTerm}%`;
            const cacheKey = `books:search:${searchTerm}:${limit}`;
            const query = `
        SELECT * FROM books
        WHERE (title COLLATE NOCASE LIKE ?
           OR author COLLATE NOCASE LIKE ?
           OR genre COLLATE NOCASE LIKE ?)
        AND is_available = 1
        ORDER BY rating DESC
        LIMIT ?
      `;
            return await this.queryOptimizer.executeOptimized(query, [pattern, pattern, pattern, limit], cacheKey, 300000);
        }
        catch (error) {
            logger_1.logger.error('Error searching books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getTopRated(limit = 10) {
        try {
            const cacheKey = `books:top_rated:${limit}`;
            const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY rating DESC, reviews_count DESC
        LIMIT ?
      `;
            return await this.queryOptimizer.executeOptimized(query, [limit], cacheKey, 600000);
        }
        catch (error) {
            logger_1.logger.error('Error getting top rated books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getNewest(limit = 10) {
        try {
            const cacheKey = `books:newest:${limit}`;
            const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY created_at DESC
        LIMIT ?
      `;
            return await this.queryOptimizer.executeOptimized(query, [limit], cacheKey, 600000);
        }
        catch (error) {
            logger_1.logger.error('Error getting newest books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getRandom() {
        try {
            const cacheKey = 'books:random';
            const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY RANDOM()
        LIMIT 1
      `;
            return await this.queryOptimizer.getOptimized(query, [], cacheKey, 300000);
        }
        catch (error) {
            logger_1.logger.error('Error getting random book', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getAllGenres() {
        try {
            const cacheKey = 'books:all_genres';
            const query = `
        SELECT DISTINCT genre FROM books 
        WHERE is_available = 1
        ORDER BY genre ASC
      `;
            const results = await this.queryOptimizer.executeOptimized(query, [], cacheKey, 3600000);
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
            this.queryOptimizer.invalidateTableCache(`books:id:${bookId}`);
            this.queryOptimizer.invalidateTableCache('books:top_rated');
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
            return await this.queryOptimizer.executeOptimized(query, [maxRating, limit], `books:low_rated:${maxRating}:${limit}`, 300000);
        }
        catch (error) {
            logger_1.logger.error('Error getting low rated books', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getByAuthorPaginated(author, limit = 10, offset = 0) {
        try {
            const cacheKey = `books:author:${author}:${limit}:${offset}`;
            const [data, total] = await Promise.all([
                this.queryOptimizer.executeOptimized('SELECT * FROM books WHERE author COLLATE NOCASE = ? ORDER BY rating DESC LIMIT ? OFFSET ?', [author, limit, offset], `${cacheKey}:data`, 300000),
                this.queryOptimizer.getOptimized('SELECT COUNT(*) as count FROM books WHERE author COLLATE NOCASE = ?', [author], `${cacheKey}:count`, 300000),
            ]);
            const totalCount = total?.count || 0;
            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(totalCount / limit);
            return {
                data,
                total: totalCount,
                limit,
                offset,
                page,
                totalPages,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting books by author', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async updateRating(bookId, newRating, reviewsCount) {
        try {
            const query = 'UPDATE books SET rating = ?, reviews_count = ? WHERE id = ?';
            const changes = await this.db.update(query, [newRating, reviewsCount, bookId]);
            this.queryOptimizer.invalidateTableCache(`books:id:${bookId}`);
            this.queryOptimizer.invalidateTableCache('books:top_rated');
            return changes;
        }
        catch (error) {
            logger_1.logger.error('Error updating rating', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getDashboardSummary() {
        try {
            const cacheKey = 'books:dashboard_summary';
            const queryResult = await this.queryOptimizer.getOptimized('SELECT 1', [], cacheKey, 600000);
            if (queryResult) {
                return JSON.parse(JSON.stringify(queryResult));
            }
            const [totalBooks, availableBooks, topRated, newest] = await Promise.all([
                this.count(),
                this.count({ is_available: 1 }),
                this.getTopRated(5),
                this.getNewest(5),
            ]);
            const summary = {
                totalBooks,
                availableBooks,
                topRated,
                newest,
            };
            return summary;
        }
        catch (error) {
            logger_1.logger.error('Error getting dashboard summary', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async analyzeTableOptimization() {
        try {
            const analysis = await this.queryOptimizer.analyzeTable('books');
            logger_1.logger.info('Books table analysis', analysis);
        }
        catch (error) {
            logger_1.logger.error('Error analyzing table', error instanceof Error ? error : new Error(String(error)));
        }
    }
}
exports.OptimizedBookRepository = OptimizedBookRepository;
//# sourceMappingURL=OptimizedBookRepository.js.map