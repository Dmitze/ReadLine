import { BookRepository } from '../repositories/BookRepository';
import { SavedBookRepository } from '../repositories/SavedBookRepository';
import { ReviewRepository } from '../repositories/ReviewRepository';
import { Result } from '../core/Result';
export interface RecommendationRequest {
    userId?: number;
    genre?: string;
    rating?: number;
    limit?: number;
}
export declare class RecommendationService {
    private bookRepository;
    private savedBookRepository;
    private reviewRepository;
    constructor(bookRepository: BookRepository, savedBookRepository: SavedBookRepository, reviewRepository: ReviewRepository);
    getPersonalizedRecommendations(userId: number, limit?: number): Promise<Result<any[]>>;
    getPopularRecommendations(limit?: number): Promise<Result<any[]>>;
    getRecommendationsByGenre(genre: string, limit?: number): Promise<Result<any[]>>;
    getRecommendationsByRating(minRating?: number, limit?: number): Promise<Result<any[]>>;
    getContinueReadingRecommendations(userId: number, limit?: number): Promise<Result<any[]>>;
    getSimilarRecommendations(bookId: number, limit?: number): Promise<Result<any[]>>;
    getTrendingRecommendations(limit?: number): Promise<Result<any[]>>;
    getRecommendationsByTags(tags: string[], limit?: number): Promise<Result<any[]>>;
    getRankingScore(bookId: number, userId?: number): Promise<Result<number>>;
}
//# sourceMappingURL=RecommendationService.d.ts.map