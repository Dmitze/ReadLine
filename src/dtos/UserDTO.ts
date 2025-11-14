/**
 * DTOs (Data Transfer Objects) for User entity
 * Used for API contracts and data validation
 * @module dtos/UserDTO
 */

/**
 * Request DTO for creating a user
 */
export interface CreateUserDTO {
  user_id: number; // Telegram user ID
  username?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  favorite_genres?: string[];
  language?: string;
}

/**
 * Request DTO for updating a user
 */
export interface UpdateUserDTO {
  username?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  favorite_genres?: string[];
  language?: string;
  last_seen?: string;
}

/**
 * Response DTO for user profile
 */
export interface UserResponseDTO {
  id: number;
  user_id: number; // Telegram user ID
  username?: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  is_new: boolean;
  favorite_genres: string[];
  language: string;
  created_at?: string;
  updated_at?: string;
  last_seen?: string;
}

/**
 * Response DTO for user statistics
 */
export interface UserStatsDTO {
  id: number;
  username?: string;
  favorite_genres: string[];
  saved_books_count: number;
  reviews_count: number;
  downloaded_books_count: number;
  is_admin: boolean;
}

/**
 * Response DTO for user library (saved books)
 */
export interface UserLibraryDTO {
  user_id: number;
  saved_books: Array<{
    id: number;
    title: string;
    author: string;
    genre: string;
    rating: number;
    saved_at: string;
  }>;
  total_saved: number;
}

/**
 * Request DTO for updating user preferences
 */
export interface UpdateUserPreferencesDTO {
  favorite_genres?: string[];
  language?: string;
  notification_enabled?: boolean;
  notification_frequency?: 'daily' | 'weekly' | 'monthly' | 'never';
  notification_time?: string;
}

/**
 * Response DTO for user preferences
 */
export interface UserPreferencesDTO {
  user_id: number;
  favorite_genres: string[];
  language: string;
  notification_enabled: boolean;
  notification_frequency: string;
  notification_time: string;
}

/**
 * Query DTO for user search/filtering
 */
export interface UserSearchDTO {
  query?: string;
  is_admin?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'created' | 'last_seen' | 'username';
  order?: 'asc' | 'desc';
}

/**
 * Response DTO for user activity
 */
export interface UserActivityDTO {
  user_id: number;
  last_seen: string;
  books_saved: number;
  reviews_written: number;
  books_downloaded: number;
  status: 'active' | 'inactive' | 'suspended';
}

/**
 * Response DTO for admin user with extended info
 */
export interface AdminUserDTO extends UserResponseDTO {
  total_users_managed?: number;
  moderation_actions?: number;
  last_action?: string;
}

/**
 * DTO for user notification settings
 */
export interface UserNotificationSettingsDTO {
  user_id: number;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  time: string;
  genres: string[];
}
