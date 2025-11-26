"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = void 0;
const Result_1 = require("../core/Result");
class RecommendationService {
    constructor(bookRepository, savedBookRepository, reviewRepository) {
        this.bookRepository = bookRepository;
        this.savedBookRepository = savedBookRepository;
        this.reviewRepository = reviewRepository;
    }
    async getPersonalizedRecommendations(userId, limit = 10) {
        try {
            const savedBooks = await this.savedBookRepository.findByUserId(userId);
            if (savedBooks.length === 0) {
                return this.getPopularRecommendations(limit);
            }
            const genres = new Set();
            for (const saved of savedBooks) {
                const book = await this.bookRepository.findById(saved.book_id);
                if (book?.genre) {
                    genres.add(book.genre);
                }
            }
            const recommendations = new Map();
            for (const genre of genres) {
                const books = await this.bookRepository.findByGenre(genre);
                for (const book of books.slice(0, limit * 2)) {
                    const bookId = book.id ?? 0;
                    if (bookId && !savedBooks.find((s) => s.book_id === bookId)) {
                        recommendations.set(bookId, book);
                    }
                }
            }
            return new Result_1.Ok(Array.from(recommendations.values()).slice(0, limit));
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get recommendations'));
        }
    }
    async getPopularRecommendations(limit = 10) {
        try {
            const books = await this.bookRepository.findMostRated(limit);
            return new Result_1.Ok(books);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get popular recommendations'));
        }
    }
    async getRecommendationsByGenre(genre, limit = 10) {
        try {
            const books = await this.bookRepository.findByGenre(genre);
            return new Result_1.Ok(books.slice(0, limit));
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get genre recommendations'));
        }
    }
    async getRecommendationsByRating(minRating = 4, limit = 10) {
        try {
            if (minRating < 1 || minRating > 5) {
                return new Result_1.Err(new Error('Rating must be between 1 and 5'));
            }
            const allBooks = await this.bookRepository.findAll();
            const filtered = [];
            for (const book of allBooks) {
                if (!book.id)
                    continue;
                const reviews = await this.reviewRepository.findByBookId(book.id);
                if (reviews.length > 0) {
                    const avgRating = reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length;
                    if (avgRating >= minRating) {
                        filtered.push({ ...book, rating: avgRating });
                    }
                }
            }
            return new Result_1.Ok(filtered.sort((a, b) => b.rating - a.rating).slice(0, limit));
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get rating recommendations'));
        }
    }
    async getContinueReadingRecommendations(userId, limit = 5) {
        try {
            const savedBooks = await this.savedBookRepository.findByUserId(userId);
            if (savedBooks.length === 0) {
                return new Result_1.Ok([]);
            }
            const recentBooks = savedBooks.slice(0, 5);
            const recommendations = new Map();
            for (const saved of recentBooks) {
                const book = await this.bookRepository.findById(saved.book_id);
                if (book && book.id) {
                    const byGenre = await this.bookRepository.findByGenre(book.genre);
                    for (const recommended of byGenre.slice(0, limit * 2)) {
                        const recId = recommended.id ?? 0;
                        if (recId && recId !== book.id && !savedBooks.find((s) => s.book_id === recId)) {
                            recommendations.set(recId, recommended);
                        }
                    }
                }
            }
            return new Result_1.Ok(Array.from(recommendations.values()).slice(0, limit));
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get continue reading recommendations'));
        }
    }
    async getSimilarRecommendations(bookId, limit = 5) {
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
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get similar recommendations'));
        }
    }
    async getTrendingRecommendations(limit = 10) {
        try {
            const books = await this.bookRepository.findNewest(limit);
            return new Result_1.Ok(books);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get trending recommendations'));
        }
    }
    async getRecommendationsByTags(tags, limit = 10) {
        try {
            const allBooks = await this.bookRepository.findAll();
            return new Result_1.Ok(allBooks.slice(0, limit));
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get tag recommendations'));
        }
    }
    async getRankingScore(bookId, userId) {
        try {
            const book = await this.bookRepository.findById(bookId);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${bookId} not found`));
            }
            let score = 50;
            const reviews = await this.reviewRepository.findByBookId(bookId);
            if (reviews.length > 0) {
                const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
                score += avgRating * 10;
            }
            score += Math.min(reviews.length, 50);
            return new Result_1.Ok(Math.min(score, 100));
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to calculate ranking score'));
        }
    }
}
exports.RecommendationService = RecommendationService;
//# sourceMappingURL=RecommendationService.js.map