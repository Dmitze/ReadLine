/**
 * DTOs (Data Transfer Objects) for Audio entity
 * Used for API contracts and data validation
 * @module dtos/AudioDTO
 */

/**
 * Request DTO for creating an audio chapter
 */
export interface CreateAudioChapterDTO {
  book_id: number;
  chapter_number: number;
  title: string;
  audio_url: string;
  duration: number; // in seconds
  file_size?: number; // in bytes
}

/**
 * Request DTO for updating an audio chapter
 */
export interface UpdateAudioChapterDTO {
  title?: string;
  audio_url?: string;
  duration?: number;
  file_size?: number;
}

/**
 * Response DTO for audio chapter details
 */
export interface AudioChapterResponseDTO {
  id: number;
  book_id: number;
  chapter_number: number;
  title: string;
  audio_url: string;
  duration: number;
  file_size?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Response DTO for listening progress
 */
export interface ListeningProgressDTO {
  id: number;
  user_id: number;
  book_id: number;
  chapter_id: number;
  current_position: number; // in seconds
  total_duration: number; // in seconds
  completed: boolean;
  last_listened: string;
}

/**
 * Request DTO for saving listening progress
 */
export interface SaveListeningProgressDTO {
  user_id: number;
  book_id: number;
  chapter_id: number;
  current_position: number;
  total_duration: number;
  completed?: boolean;
}

/**
 * Response DTO for user listening statistics
 */
export interface UserListeningStatsDTO {
  user_id: number;
  total_listening_time: number; // in seconds
  books_in_progress: number;
  completed_books: number;
  average_completion: number; // percentage
  favorite_genres: string[];
}

/**
 * Response DTO for audiobook with chapters
 */
export interface AudiobookWithChaptersDTO {
  book_id: number;
  title: string;
  author: string;
  cover_url?: string;
  total_chapters: number;
  total_duration: number; // in seconds
  chapters: AudioChapterResponseDTO[];
}

/**
 * Query DTO for audiobook search
 */
export interface AudiobookSearchDTO {
  query?: string;
  genre?: string;
  author?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'title' | 'duration' | 'rating' | 'recent';
  order?: 'asc' | 'desc';
}

/**
 * Response DTO for most listened audiobooks
 */
export interface MostListenedAudiobookDTO {
  book_id: number;
  title: string;
  author: string;
  listener_count: number;
  total_listening_time: number;
  average_completion: number;
}

/**
 * Response DTO for audio library item
 */
export interface AudioLibraryItemDTO {
  book_id: number;
  title: string;
  author: string;
  genre: string;
  cover_url?: string;
  total_chapters: number;
  current_chapter: number;
  current_position: number;
  total_duration: number;
  completion_percentage: number;
  last_listened: string;
}

/**
 * Response DTO for audio statistics
 */
export interface AudioStatsDTO {
  total_audiobooks: number;
  total_chapters: number;
  total_duration: number;
  users_listening: number;
  average_completion_rate: number;
  most_popular_audiobook: {
    id: number;
    title: string;
    listeners: number;
  };
}

/**
 * DTO for audio playback state
 */
export interface AudioPlaybackStateDTO {
  user_id: number;
  book_id: number;
  chapter_id: number;
  current_position: number;
  is_playing: boolean;
  playback_speed: number; // 0.5, 1.0, 1.5, 2.0
  timestamp: string;
}

/**
 * DTO for user listening session
 */
export interface ListeningSessionDTO {
  user_id: number;
  book_id: number;
  session_start: string;
  session_end: string;
  duration_listened: number; // in seconds
  chapters_listened: number;
  completion_progress: number;
}
