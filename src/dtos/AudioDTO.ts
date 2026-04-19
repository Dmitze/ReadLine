export interface CreateAudioChapterDTO {
  book_id: number;
  chapter_number: number;
  title: string;
  audio_url: string;
  duration: number;
  file_size?: number;
}

export interface UpdateAudioChapterDTO {
  title?: string;
  audio_url?: string;
  duration?: number;
  file_size?: number;
}

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

export interface ListeningProgressDTO {
  id: number;
  user_id: number;
  book_id: number;
  chapter_id: number;
  current_position: number;
  total_duration: number;
  completed: boolean;
  last_listened: string;
}

export interface SaveListeningProgressDTO {
  user_id: number;
  book_id: number;
  chapter_id: number;
  current_position: number;
  total_duration: number;
  completed?: boolean;
}

export interface UserListeningStatsDTO {
  user_id: number;
  total_listening_time: number;
  books_in_progress: number;
  completed_books: number;
  average_completion: number;
  favorite_genres: string[];
}

export interface AudiobookWithChaptersDTO {
  book_id: number;
  title: string;
  author: string;
  cover_url?: string;
  total_chapters: number;
  total_duration: number;
  chapters: AudioChapterResponseDTO[];
}

export interface AudiobookSearchDTO {
  query?: string;
  genre?: string;
  author?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'title' | 'duration' | 'rating' | 'recent';
  order?: 'asc' | 'desc';
}

export interface MostListenedAudiobookDTO {
  book_id: number;
  title: string;
  author: string;
  listener_count: number;
  total_listening_time: number;
  average_completion: number;
}

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

export interface AudioPlaybackStateDTO {
  user_id: number;
  book_id: number;
  chapter_id: number;
  current_position: number;
  is_playing: boolean;
  playback_speed: number;
  timestamp: string;
}

export interface ListeningSessionDTO {
  user_id: number;
  book_id: number;
  session_start: string;
  session_end: string;
  duration_listened: number;
  chapters_listened: number;
  completion_progress: number;
}
