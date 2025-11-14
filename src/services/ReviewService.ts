/**
 * ReviewService - Business logic for review operations
 * 
 * Responsibilities:
 * - Review creation and management
 * - Rating calculations
 * - Review moderation workflow
 * - Review statistics
 */

import { BaseService } from './BaseService';
import { ReviewRepository } from '../repositories/ReviewRepository';
import { BookRepository } from '../repositories/BookRepository';
import { ILogger } from '../core/types';
import { Result } from '../core/Result';
import { Review } from '../database/models';

/**
 * Service for review-related operations
 */
export class ReviewService extends BaseService {
  /**
   * Create a new ReviewService instance
   * @param reviewRepository - Repository for review operations
   * @param bookRepository - Repository for book operations
   * @param logger - Logger instance
   */
  constructor(
    private reviewRepository: ReviewRepository,
    private bookRepository: BookRepository,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * Create a new review
   * @param bookId - Book ID
   * @param userId - User ID
   * @param rating - Rating (1-5)
   * @param comment - Review comment (optional)
   * @returns Result with created review
   */
  async createReview(
    bookId: number,
    userId: number,
    rating: number,
    comment?: string
  ): Promise<Result<Review>> {
    return this.executeAsync(
      async () => {
        // Validate rating
        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
          throw new Error('Rating must be an integer between 1 and 5');
        }

        // Check if book exists
        const book = await this.bookRepository.getById(bookId);
        if (!book) {
          throw new Error(`Book with ID ${bookId} not found`);
        }

        // Check if user already reviewed this book
        const existing = await this.reviewRepository.hasUserReviewedBook(userId, bookId);
        if (existing) {
          throw new Error('User has already reviewed this book');
        }

        const review: Omit<Review, 'id'> = {
          book_id: bookId,
          user_id: userId,
          rating,
          comment: comment || null,
          is_published: false,
          created_at: new Date().toISOString(),
        };

        const reviewId = await this.reviewRepository.create(review);
        const createdReview = await this.reviewRepository.getById(reviewId);

        if (!createdReview) {
          throw new Error('Failed to create review');
        }

        return createdReview;
      },
      `createReview(${bookId}, ${userId}, ${rating})`
    );
  }

  /**
   * Get reviews for a book
   * @param bookId - Book ID
   * @returns Result with book reviews
   */
  async getBookReviews(bookId: number): Promise<Result<Review[]>> {
    return this.executeAsync(
      async () => {
        const reviews = await this.reviewRepository.getByBookId(bookId);
        // Filter only published reviews
        return reviews.filter((r) => r.is_published);
      },
      `getBookReviews(${bookId})`
    );
  }

  /**
   * Get user's reviews
   * @param userId - User ID
   * @returns Result with user's reviews
   */
  async getUserReviews(userId: number): Promise<Result<Review[]>> {
    return this.executeAsync(
      async () => {
        const reviews = await this.reviewRepository.getByUserId(userId);
        return reviews;
      },
      `getUserReviews(${userId})`
    );
  }

  /**
   * Get average rating for a book
   * @param bookId - Book ID
   * @returns Result with average rating
   */
  async getBookAverageRating(bookId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => await this.reviewRepository.getAverageRating(bookId),
      `getBookAverageRating(${bookId})`
    );
  }

  /**
   * Publish a review (make it visible)
   * @param reviewId - Review ID
   * @returns Result with success status
   */
  async publishReview(reviewId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => {
        const review = await this.reviewRepository.getById(reviewId);
        if (!review) {
          throw new Error(`Review with ID ${reviewId} not found`);
        }

        return await this.reviewRepository.publish(reviewId);
      },
      `publishReview(${reviewId})`
    );
  }

  /**
   * Get pending reviews for moderation
   * @returns Result with pending reviews
   */
  async getPendingReviews(): Promise<Result<Review[]>> {
    return this.executeAsync(
      async () => await this.reviewRepository.getPending(),
      `getPendingReviews`
    );
  }

  /**
   * Get pending reviews count
   * @returns Result with count of pending reviews
   */
  async getPendingReviewsCount(): Promise<Result<number>> {
    return this.executeAsync(
      async () => await this.reviewRepository.getPendingCount(),
      `getPendingReviewsCount`
    );
  }

  /**
   * Get review count for a book
   * @param bookId - Book ID
   * @returns Result with review count
   */
  async getBookReviewCount(bookId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => await this.reviewRepository.getCountForBook(bookId),
      `getBookReviewCount(${bookId})`
    );
  }

  /**
   * Delete a review
   * @param reviewId - Review ID
   * @returns Result with success status
   */
  async deleteReview(reviewId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => {
        const review = await this.reviewRepository.getById(reviewId);
        if (!review) {
          throw new Error(`Review with ID ${reviewId} not found`);
        }

        return await this.reviewRepository.delete(reviewId);
      },
      `deleteReview(${reviewId})`
    );
  }
}
