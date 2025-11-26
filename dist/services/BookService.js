"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookService = void 0;
const Result_1 = require("../core/Result");
const models_1 = require("../database/models");
class BookService {
    constructor(bookRepository, reviewRepository, savedBookRepository, tagRepository) {
        this.bookRepository = bookRepository;
        this.reviewRepository = reviewRepository;
        this.savedBookRepository = savedBookRepository;
        this.tagRepository = tagRepository;
    }
    async createBook(input) {
        try {
            if (!input.title || !input.author || !input.genre) {
                return new Result_1.Err(new Error('Missing required book fields: title, author, genre'));
            }
            const bookId = await this.bookRepository.insert({
                title: input.title,
                author: input.author,
                genre: input.genre,
                description: input.description,
                photo_file_id: input.photo_file_id || 'default_cover',
                file_type: input.file_type,
                file_url: input.file_path,
                online_link: undefined,
                audio_file_id: undefined,
                file_name: undefined,
            });
            return new Result_1.Ok(bookId);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to create book'));
        }
    }
    async getBookById(bookId) {
        try {
            const book = await this.bookRepository.findById(bookId);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${bookId} not found`));
            }
            const reviews = await this.reviewRepository.findByBookId(bookId);
            const rating = reviews.length > 0
                ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
                : '0';
            return new Result_1.Ok({
                ...book,
                reviews_count: reviews.length,
                rating,
            });
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch book'));
        }
    }
    async updateBook(bookId, input) {
        try {
            const book = await this.bookRepository.findById(bookId);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${bookId} not found`));
            }
            await this.bookRepository.update(bookId, {
                title: input.title || book.title,
                author: input.author || book.author,
                genre: input.genre || book.genre,
                description: input.description || book.description,
                photo_file_id: input.photo_file_id || book.photo_file_id,
            });
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to update book'));
        }
    }
    async deleteBook(bookId) {
        try {
            const book = await this.bookRepository.findById(bookId);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${bookId} not found`));
            }
            await this.reviewRepository.deleteByBookId(bookId);
            await this.savedBookRepository.deleteByBookId(bookId);
            await this.tagRepository.deleteByBookId(bookId);
            await this.bookRepository.delete(bookId);
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to delete book'));
        }
    }
    async searchBooks(filters) {
        try {
            let query = 'SELECT * FROM books WHERE 1=1';
            const params = [];
            if (filters.genre) {
                query += ' AND genre LIKE ?';
                params.push(`%${filters.genre}%`);
            }
            if (filters.searchQuery) {
                query += ' AND (title LIKE ? OR author LIKE ? OR description LIKE ?)';
                const searchTerm = `%${filters.searchQuery}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            if (filters.sortBy === 'rating') {
                query += ' ORDER BY (SELECT AVG(rating) FROM reviews WHERE book_id = books.id) DESC';
            }
            else if (filters.sortBy === 'date') {
                query += ' ORDER BY created_at DESC';
            }
            else {
                query += ' ORDER BY title ASC';
            }
            const limit = filters.limit || 20;
            const offset = filters.offset || 0;
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
            const books = await this.bookRepository.db.all(query, params);
            return new Result_1.Ok(books);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to search books'));
        }
    }
    async getPopularBooks(limit = 10) {
        try {
            const books = await this.bookRepository.findMostRated(limit);
            return new Result_1.Ok(books);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch popular books'));
        }
    }
    async getNewBooks(limit = 10) {
        try {
            const books = await this.bookRepository.findNewest(limit);
            return new Result_1.Ok(books);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch new books'));
        }
    }
    async getBooksByGenre(genre, limit = 20, offset = 0) {
        try {
            const books = await this.bookRepository.findByGenre(genre);
            const paginatedBooks = books.slice(offset, offset + limit);
            return new Result_1.Ok(paginatedBooks);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch books by genre'));
        }
    }
    async getSimilarBooks(bookId, limit = 5) {
        try {
            const book = await this.bookRepository.findById(bookId);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${bookId} not found`));
            }
            const similarBooks = await this.bookRepository.findByGenre(book.genre);
            const filtered = similarBooks.filter((b) => b.id !== bookId).slice(0, limit);
            return new Result_1.Ok(filtered);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch similar books'));
        }
    }
    async addTagToBook(bookId, tagId) {
        try {
            const book = await this.bookRepository.findById(bookId);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${bookId} not found`));
            }
            const tag = await this.tagRepository.findById(tagId);
            if (!tag) {
                return new Result_1.Err(new Error(`Tag with id ${tagId} not found`));
            }
            await this.tagRepository.addTagToBook(bookId, tagId);
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to add tag to book'));
        }
    }
    async getBookTags(bookId) {
        try {
            const tags = await this.tagRepository.findByBookId(bookId);
            return new Result_1.Ok(tags);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch book tags'));
        }
    }
    async getDetailedBookInfo(bookId) {
        try {
            const stats = await (0, models_1.getBookDetailedStats)(bookId);
            return new Result_1.Ok(stats);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch detailed book info'));
        }
    }
    async updateBookExtendedInfo(bookId, recommendedAge, contentWarnings) {
        try {
            const book = await this.bookRepository.findById(bookId);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${bookId} not found`));
            }
            let result = 0;
            if (recommendedAge !== undefined) {
                result += await (0, models_1.updateBookInfo)(bookId, 'recommended_age', recommendedAge);
            }
            if (contentWarnings !== undefined) {
                result += await (0, models_1.updateBookInfo)(bookId, 'content_warnings', JSON.stringify(contentWarnings));
            }
            if (result === 0) {
                return new Result_1.Err(new Error('No updates were made'));
            }
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to update book extended info'));
        }
    }
}
exports.BookService = BookService;
//# sourceMappingURL=BookService.js.map