/**
 * DTOs (Data Transfer Objects) for Book entity
 * Used for API contracts and data validation
 * @module dtos/BookDTO
 */

/**
 * Request DTO for creating a book
 */
export interface CreateBookDTO {
  title: string;
  author: string;
  description?: string;
  genre: string;
  cover_url?: string;
  pdf_url?: string;
  epub_url?: string;
  is_available?: boolean;
  rating?: number;
  download_count?: number;
}

/**
 * Class-based DTO for creating a book with validation
 */
export class CreateBookDTOClass implements CreateBookDTO {
  title: string;
  author: string;
  description?: string;
  genre: string;
  cover_url?: string;
  pdf_url?: string;
  epub_url?: string;
  is_available?: boolean;
  rating?: number;
  download_count?: number;

  constructor(data: CreateBookDTO) {
    // ✅ Валідація в конструкторі
    if (!data.title || data.title.trim().length < 2) {
      throw new Error('Title is required and must be at least 2 characters');
    }
    if (!data.author || data.author.trim().length < 2) {
      throw new Error('Author is required and must be at least 2 characters');
    }
    if (!data.genre || data.genre.trim().length < 2) {
      throw new Error('Genre is required and must be at least 2 characters');
    }
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }
    if (data.download_count !== undefined && data.download_count < 0) {
      throw new Error('Download count cannot be negative');
    }

    this.title = data.title.trim();
    this.author = data.author.trim();
    this.description = data.description?.trim();
    this.genre = data.genre.trim();
    this.cover_url = data.cover_url;
    this.pdf_url = data.pdf_url;
    this.epub_url = data.epub_url;
    this.is_available = data.is_available ?? true;
    this.rating = data.rating;
    this.download_count = data.download_count ?? 0;
  }
}

/**
 * Request DTO for updating a book
 */
export interface UpdateBookDTO {
  title?: string;
  author?: string;
  description?: string;
  genre?: string;
  cover_url?: string;
  pdf_url?: string;
  epub_url?: string;
  is_available?: boolean;
  rating?: number;
  download_count?: number;
}

/**
 * Class-based DTO for updating a book with validation
 */
export class UpdateBookDTOClass implements UpdateBookDTO {
  title?: string;
  author?: string;
  description?: string;
  genre?: string;
  cover_url?: string;
  pdf_url?: string;
  epub_url?: string;
  is_available?: boolean;
  rating?: number;
  download_count?: number;

  constructor(data: UpdateBookDTO) {
    // ✅ Валідація в конструкторі
    if (data.title !== undefined && data.title.trim().length < 2) {
      throw new Error('Title must be at least 2 characters');
    }
    if (data.author !== undefined && data.author.trim().length < 2) {
      throw new Error('Author must be at least 2 characters');
    }
    if (data.genre !== undefined && data.genre.trim().length < 2) {
      throw new Error('Genre must be at least 2 characters');
    }
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }
    if (data.download_count !== undefined && data.download_count < 0) {
      throw new Error('Download count cannot be negative');
    }

    this.title = data.title?.trim();
    this.author = data.author?.trim();
    this.description = data.description?.trim();
    this.genre = data.genre?.trim();
    this.cover_url = data.cover_url;
    this.pdf_url = data.pdf_url;
    this.epub_url = data.epub_url;
    this.is_available = data.is_available;
    this.rating = data.rating;
    this.download_count = data.download_count;
  }
}

/**
 * Response DTO for book details
 */
export interface BookResponseDTO {
  id: number;
  title: string;
  author: string;
  description?: string;
  genre: string;
  cover_url?: string;
  pdf_url?: string;
  epub_url?: string;
  is_available: boolean;
  rating: number;
  download_count: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Response DTO for book list items
 */
export interface BookListItemDTO {
  id: number;
  title: string;
  author: string;
  genre: string;
  cover_url?: string;
  rating: number;
  download_count: number;
}

/**
 * Response DTO for book with rating details
 */
export interface BookWithRatingDTO extends BookResponseDTO {
  average_rating: number;
  review_count: number;
  user_rating?: number;
  is_saved?: boolean;
}

/**
 * Query DTO for book search
 */
export interface BookSearchDTO {
  query?: string;
  genre?: string;
  author?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'title' | 'rating' | 'downloads' | 'recent';
  order?: 'asc' | 'desc';
}

/**
 * Response DTO for book statistics
 */
export interface BookStatsDTO {
  total_books: number;
  available_books: number;
  genres: Array<{ name: string; count: number }>;
  top_authors: Array<{ name: string; book_count: number }>;
  average_rating: number;
  total_downloads: number;
}

/**
 * DTO for book genre filter
 */
export interface GenreFilterDTO {
  genre: string;
  limit?: number;
  offset?: number;
  sort_by?: 'rating' | 'downloads' | 'title';
}

/**
 * DTO for saving a book
 */
export interface SaveBookDTO {
  user_id: number;
  book_id: number;
}

/**
 * DTO for book download tracking
 */
export interface BookDownloadDTO {
  book_id: number;
  user_id: number;
  download_time: string;
  format: 'pdf' | 'epub' | 'other';
}
