export interface CreateReviewDTO {
  book_id: number;
  user_id: number;
  rating: number;
  comment?: string;
  is_published?: boolean;
}

export interface UpdateReviewDTO {
  rating?: number;
  comment?: string;
  is_published?: boolean;
}

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

export interface ReviewWithUserDTO extends ReviewResponseDTO {
  username?: string;
  user_avatar?: string;
}

export interface ReviewWithBookDTO extends ReviewResponseDTO {
  book_title: string;
  book_author: string;
  book_cover?: string;
}

export interface ReviewListItemDTO {
  id: number;
  book_id: number;
  book_title: string;
  rating: number;
  comment?: string;
  username?: string;
  created_at?: string;
}

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

export interface BookRatingSummaryDTO {
  book_id: number;
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    [key in 1 | 2 | 3 | 4 | 5]: number;
  };
}

export interface UserReviewHistoryDTO {
  user_id: number;
  reviews: ReviewListItemDTO[];
  total_reviews: number;
  average_rating: number;
}

export interface PublishReviewDTO {
  review_id: number;
  admin_id: number;
  rejection_reason?: string;
}

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

export interface BulkReviewOperationDTO {
  review_ids: number[];
  action: 'publish' | 'reject' | 'delete';
  reason?: string;
}
