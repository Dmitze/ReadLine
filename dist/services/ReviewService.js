"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const Result_1 = require("../core/Result");
class ReviewService {
    constructor(reviewRepository, bookRepository) {
        this.reviewRepository = reviewRepository;
        this.bookRepository = bookRepository;
    }
    async createReview(input) {
        try {
            if (input.rating < 1 || input.rating > 5) {
                return new Result_1.Err(new Error('Rating must be between 1 and 5'));
            }
            const book = await this.bookRepository.findById(input.book_id);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${input.book_id} not found`));
            }
            const existingReview = await this.reviewRepository.findByUserAndBook(input.user_id, input.book_id);
            if (existingReview) {
                return new Result_1.Err(new Error('User has already reviewed this book'));
            }
            const reviewId = await this.reviewRepository.insert({
                book_id: input.book_id,
                user_id: input.user_id,
                rating: input.rating,
                comment: input.comment || '',
                is_published: false,
            });
            return new Result_1.Ok(reviewId);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to create review'));
        }
    }
    async getReviewById(reviewId) {
        try {
            const review = await this.reviewRepository.findById(reviewId);
            if (!review) {
                return new Result_1.Err(new Error(`Review with id ${reviewId} not found`));
            }
            return new Result_1.Ok(review);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch review'));
        }
    }
    async updateReview(reviewId, input) {
        try {
            const review = await this.reviewRepository.findById(reviewId);
            if (!review) {
                return new Result_1.Err(new Error(`Review with id ${reviewId} not found`));
            }
            if (input.rating && (input.rating < 1 || input.rating > 5)) {
                return new Result_1.Err(new Error('Rating must be between 1 and 5'));
            }
            await this.reviewRepository.update(reviewId, {
                rating: input.rating || review.rating,
                comment: input.comment || review.comment,
            });
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to update review'));
        }
    }
    async deleteReview(reviewId) {
        try {
            const review = await this.reviewRepository.findById(reviewId);
            if (!review) {
                return new Result_1.Err(new Error(`Review with id ${reviewId} not found`));
            }
            await this.reviewRepository.delete(reviewId);
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to delete review'));
        }
    }
    async publishReview(reviewId) {
        try {
            const review = await this.reviewRepository.findById(reviewId);
            if (!review) {
                return new Result_1.Err(new Error(`Review with id ${reviewId} not found`));
            }
            if (review.is_published) {
                return new Result_1.Err(new Error('Review is already published'));
            }
            await this.reviewRepository.update(reviewId, { is_published: true });
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to publish review'));
        }
    }
    async rejectReview(reviewId) {
        try {
            const review = await this.reviewRepository.findById(reviewId);
            if (!review) {
                return new Result_1.Err(new Error(`Review with id ${reviewId} not found`));
            }
            await this.reviewRepository.delete(reviewId);
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to reject review'));
        }
    }
    async getBookReviews(bookId, onlyPublished = true) {
        try {
            const reviews = await this.reviewRepository.findByBookId(bookId);
            const filtered = onlyPublished ? reviews.filter((r) => r.is_published) : reviews;
            return new Result_1.Ok(filtered);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch reviews'));
        }
    }
    async getUserReviews(userId) {
        try {
            const reviews = await this.reviewRepository.findByUserId(userId);
            return new Result_1.Ok(reviews);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch user reviews'));
        }
    }
    async getPendingReviews() {
        try {
            const reviews = await this.reviewRepository.findPending();
            return new Result_1.Ok(reviews);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch pending reviews'));
        }
    }
    async getBookAverageRating(bookId) {
        try {
            const reviews = await this.reviewRepository.findByBookId(bookId);
            if (reviews.length === 0)
                return new Result_1.Ok(0);
            const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
            const average = sum / reviews.length;
            return new Result_1.Ok(Math.round(average * 10) / 10);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to calculate rating'));
        }
    }
}
exports.ReviewService = ReviewService;
//# sourceMappingURL=ReviewService.js.map