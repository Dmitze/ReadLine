/**
 * DTOs (Data Transfer Objects) for Review entity
 * Used for API contracts and data validation
 * @module dtos/ReviewDTO
 */

/**
 * Request DTO for creating a review
 */
export interface CreateReviewDTO {
  book_id: number;
  user_id: number;
  rating: number; // 1-5
  comment?: string;
  is_published?: boolean;
}

/**
 * Request DTO for updating a review
 */
export interface UpdateReviewDTO {
  rating?: number;
  comment?: string;
  is_published?: boolean;
}

/**
 * Response DTO for review details
 */
export interface ReviewResponseDTO {
  id: number;
  book_id: number;
  user_id: number;
  rating: number;
  comment?: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Response DTO for review with user info
 */
export interface ReviewWithUserDTO extends ReviewResponseDTO {
  username?: string;
  user_avatar?: string;
}

/**
 * Response DTO for review with book info
 */
export interface ReviewWithBookDTO extends ReviewResponseDTO {
  book_title: string;
  book_author: string;
  book_cover?: string;
}

/**
 * Response DTO for review list item
 */
export interface ReviewListItemDTO {
  id: number;
  book_id: number;
  book_title: string;
  rating: number;
  comment?: string;
  username?: string;
  created_at?: string;
}

/**
 * Query DTO for review search/filtering
 */
export interface ReviewSearchDTO {
  book_id?: number;
  user_id?: number;
  min_rating?: number;
  max_rating?: number;
  is_published?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'rating' | 'created' | 'recent';
  order?: 'asc' | 'desc';
}

/**
 * Response DTO for book ratings summary
 */
export interface BookRatingSummaryDTO {
  book_id: number;
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    [key in 1 | 2 | 3 | 4 | 5]: number;
  };
}

/**
 * Response DTO for user review history
 */
export interface UserReviewHistoryDTO {
  user_id: number;
  reviews: ReviewListItemDTO[];
  total_reviews: number;
  average_rating: number;
}

/**
 * Request DTO for publishing pending reviews
 */
export interface PublishReviewDTO {
  review_id: number;
  admin_id: number; // Admin who approved
  rejection_reason?: string; // If rejected
}

/**
 * Response DTO for pending reviews (moderation queue)
 */
export interface PendingReviewDTO {
  id: number;
  book_id: number;
  book_title: string;
  user_id: number;
  username?: string;
  rating: number;
  comment?: string;
  created_at: string;
  awaiting_approval: boolean;
}

/**
 * Response DTO for review statistics
 */
export interface ReviewStatsDTO {
  total_reviews: number;
  published_reviews: number;
  pending_reviews: number;
  average_rating: number;
  top_rated_book: {
    id: number;
    title: string;
    rating: number;
  };
}

/**
 * DTO for bulk review operations
 */
export interface BulkReviewOperationDTO {
  review_ids: number[];
  action: 'publish' | 'reject' | 'delete';
  reason?: string;
}
