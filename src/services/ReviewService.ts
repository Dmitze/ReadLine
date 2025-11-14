/**
 * Review Service - Бізнес-логіка для роботи з рецензіями
 * REFACTOR-003: Service Layer
 */

import { ReviewRepository } from '../repositories/ReviewRepository';
import { BookRepository } from '../repositories/BookRepository';
import { Result, Ok, Err } from '../core/Result';

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

export class ReviewService {
  constructor(
    private reviewRepository: ReviewRepository,
    private bookRepository: BookRepository
  ) {}

  /**
   * Створити рецензію
   */
  async createReview(input: CreateReviewInput): Promise<Result<number>> {
    try {
      if (input.rating < 1 || input.rating > 5) {
        return new Err(new Error('Rating must be between 1 and 5'));
      }

      const book = await this.bookRepository.findById(input.book_id);
      if (!book) {
        return new Err(new Error(`Book with id ${input.book_id} not found`));
      }

      // Перевірити, чи користувач вже залишив рецензію
      const existingReview = await this.reviewRepository.findByUserAndBook(
        input.user_id,
        input.book_id
      );

      if (existingReview) {
        return new Err(new Error('User has already reviewed this book'));
      }

      const reviewId = await this.reviewRepository.insert({
        book_id: input.book_id,
        user_id: input.user_id,
        rating: input.rating,
        comment: input.comment || '',
        is_published: false
      });

      return new Ok(reviewId);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to create review'));
    }
  }

  /**
   * Отримати рецензію за ID
   */
  async getReviewById(reviewId: number): Promise<Result<any>> {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return new Err(new Error(`Review with id ${reviewId} not found`));
      }
      return new Ok(review);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch review'));
    }
  }

  /**
   * Оновити рецензію
   */
  async updateReview(reviewId: number, input: UpdateReviewInput): Promise<Result<void>> {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return new Err(new Error(`Review with id ${reviewId} not found`));
      }

      if (input.rating && (input.rating < 1 || input.rating > 5)) {
        return new Err(new Error('Rating must be between 1 and 5'));
      }

      await this.reviewRepository.update(reviewId, {
        rating: input.rating || review.rating,
        comment: input.comment || review.comment
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update review'));
    }
  }

  /**
   * Видалити рецензію
   */
  async deleteReview(reviewId: number): Promise<Result<void>> {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return new Err(new Error(`Review with id ${reviewId} not found`));
      }

      await this.reviewRepository.delete(reviewId);
      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to delete review'));
    }
  }

  /**
   * Опублікувати рецензію
   */
  async publishReview(reviewId: number): Promise<Result<void>> {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return new Err(new Error(`Review with id ${reviewId} not found`));
      }

      if (review.is_published) {
        return new Err(new Error('Review is already published'));
      }

      await this.reviewRepository.update(reviewId, { is_published: true });
      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to publish review'));
    }
  }

  /**
   * Відхилити рецензію
   */
  async rejectReview(reviewId: number): Promise<Result<void>> {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return new Err(new Error(`Review with id ${reviewId} not found`));
      }

      await this.reviewRepository.delete(reviewId);
      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to reject review'));
    }
  }

  /**
   * Отримати рецензії книги
   */
  async getBookReviews(bookId: number, onlyPublished: boolean = true): Promise<Result<any[]>> {
    try {
      const reviews = await this.reviewRepository.findByBookId(bookId);
      const filtered = onlyPublished ? reviews.filter(r => r.is_published) : reviews;
      return new Ok(filtered);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch reviews'));
    }
  }

  /**
   * Отримати рецензії користувача
   */
  async getUserReviews(userId: number): Promise<Result<any[]>> {
    try {
      const reviews = await this.reviewRepository.findByUserId(userId);
      return new Ok(reviews);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch user reviews'));
    }
  }

  /**
   * Отримати рецензії на модерацію
   */
  async getPendingReviews(): Promise<Result<any[]>> {
    try {
      const reviews = await this.reviewRepository.findPending();
      return new Ok(reviews);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch pending reviews'));
    }
  }

  /**
   * Отримати середній рейтинг книги
   */
  async getBookAverageRating(bookId: number): Promise<Result<number>> {
    try {
      const reviews = await this.reviewRepository.findByBookId(bookId);
      if (reviews.length === 0) return new Ok(0);

      const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      const average = sum / reviews.length;
      
      return new Ok(Math.round(average * 10) / 10);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to calculate rating'));
    }
  }
}
