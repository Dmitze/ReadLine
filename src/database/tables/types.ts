/**
 * Database Types
 * REFACTOR-009: Split models.ts - Common types
 */

export interface Book {
  id?: number;
  title: string;
  author: string;
  genre: string;
  description: string;
  photo_file_id: string;
  file_url?: string;
  pdf_file_id?: string;
  audio_file_id?: string;
  audio_duration?: number;
  audio_external_link?: string;
  narrator?: string;
  online_link?: string;
  external_link?: string;
  file_type?: string;
  file_name?: string;
  rating?: number;
  reviews_count?: number;
  downloads_count?: number;
  is_available?: boolean;
  recommended_age?: number;
  content_warnings?: string;
  created_at?: string;
}

export interface BookRatingStats {
  id?: number;
  book_id: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
  readers_count: number;
  popular_quotes?: string;
  updated_at?: string;
}

export interface Admin {
  id?: number;
  user_id: number;
  username?: string;
  created_at?: string;
}

export interface AdminStats {
  totalBooks: number;
}

export interface ExtendedAdminStats {
  totalBooks: number;
  totalUsers: number;
  totalReviews: number;
  totalFeedback: number;
  totalSavedBooks: number;
  avgRating: number;
  pendingReviews: number;
  pendingFeedback: number;
  newUsersToday: number;
  newBooksThisMonth: number;
  activeUsersThisMonth: number;
  topGenres: { genre: string; count: number }[];
  topRatedBooks: { title: string; rating: number; author: string }[];
}

export interface Review {
  id?: number;
  book_id: number;
  user_id: number;
  user_name?: string;
  rating: number;
  comment?: string;
  is_published?: boolean;
  created_at?: string;
}

export interface SavedBook {
  id?: number;
  user_id: number;
  book_id: number;
  created_at?: string;
}

export interface FeedbackMessage {
  id?: number;
  user_id: number;
  user_name?: string;
  user_username?: string;
  message: string;
  status: string;
  admin_reply?: string;
  created_at?: string;
  read_at?: string;
}

export interface UserStats {
  id?: number;
  user_id: number;
  books_read: number;
  reviews_written: number;
  favorite_genre?: string;
  last_active?: string;
}

export interface PromoCode {
  id?: number;
  code: string;
  user_id?: number;
  is_used: boolean;
  created_at?: string;
  used_at?: string;
}
