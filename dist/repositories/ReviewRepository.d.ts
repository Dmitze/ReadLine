import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
import { Review } from '../database/models';
export declare class ReviewRepository extends BaseRepository<Review> {
    constructor(db: DatabaseWrapper);
    create(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<number>;
    getByBookId(bookId: number): Promise<Review[]>;
    getPending(): Promise<Review[]>;
    publish(reviewId: number): Promise<number>;
    reject(reviewId: number): Promise<number>;
    getByUserId(userId: number): Promise<Review[]>;
    getAverageRating(bookId: number): Promise<number>;
    getCountForBook(bookId: number): Promise<number>;
    hasUserReviewedBook(userId: number, bookId: number): Promise<boolean>;
    getPendingCount(): Promise<number>;
    getRecent(limit?: number): Promise<Review[]>;
    getHighlyRated(limit?: number): Promise<Review[]>;
    update(reviewId: number, updates: Partial<Omit<Review, 'id' | 'created_at'>>): Promise<number>;
    findByBookId(bookId: number): Promise<Review[]>;
    findByUserId(userId: number): Promise<Review[]>;
    findPending(): Promise<Review[]>;
    findByUserAndBook(userId: number, bookId: number): Promise<Review | undefined>;
    deleteByBookId(bookId: number): Promise<number>;
}
//# sourceMappingURL=ReviewRepository.d.ts.map