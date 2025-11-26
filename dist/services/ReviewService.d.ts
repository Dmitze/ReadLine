import { ReviewRepository } from '../repositories/ReviewRepository';
import { BookRepository } from '../repositories/BookRepository';
import { Result } from '../core/Result';
export interface CreateReviewInput {
    book_id: number;
    user_id: number;
    rating: number;
    comment?: string;
}
export interface UpdateReviewInput {
    rating?: number;
    comment?: string;
}
export declare class ReviewService {
    private reviewRepository;
    private bookRepository;
    constructor(reviewRepository: ReviewRepository, bookRepository: BookRepository);
    createReview(input: CreateReviewInput): Promise<Result<number>>;
    getReviewById(reviewId: number): Promise<Result<any>>;
    updateReview(reviewId: number, input: UpdateReviewInput): Promise<Result<void>>;
    deleteReview(reviewId: number): Promise<Result<void>>;
    publishReview(reviewId: number): Promise<Result<void>>;
    rejectReview(reviewId: number): Promise<Result<void>>;
    getBookReviews(bookId: number, onlyPublished?: boolean): Promise<Result<any[]>>;
    getUserReviews(userId: number): Promise<Result<any[]>>;
    getPendingReviews(): Promise<Result<any[]>>;
    getBookAverageRating(bookId: number): Promise<Result<number>>;
}
//# sourceMappingURL=ReviewService.d.ts.map