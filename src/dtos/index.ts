/**
 * DTO Exports
 * Central export point for all Data Transfer Objects
 * @module dtos
 */

// Book DTOs
export type {
  CreateBookDTO,
  UpdateBookDTO,
  BookResponseDTO,
  BookListItemDTO,
  BookWithRatingDTO,
  BookSearchDTO,
  BookStatsDTO,
  GenreFilterDTO,
  SaveBookDTO,
  BookDownloadDTO,
} from './BookDTO';

// User DTOs
export type {
  CreateUserDTO,
  UpdateUserDTO,
  UserResponseDTO,
  UserStatsDTO,
  UserLibraryDTO,
  UpdateUserPreferencesDTO,
  UserPreferencesDTO,
  UserSearchDTO,
  UserActivityDTO,
  AdminUserDTO,
  UserNotificationSettingsDTO,
} from './UserDTO';

// Review DTOs
export type {
  CreateReviewDTO,
  UpdateReviewDTO,
  ReviewResponseDTO,
  ReviewWithUserDTO,
  ReviewWithBookDTO,
  ReviewListItemDTO,
  ReviewSearchDTO,
  BookRatingSummaryDTO,
  UserReviewHistoryDTO,
  PublishReviewDTO,
  PendingReviewDTO,
  ReviewStatsDTO,
  BulkReviewOperationDTO,
} from './ReviewDTO';

// Audio DTOs
export type {
  CreateAudioChapterDTO,
  UpdateAudioChapterDTO,
  AudioChapterResponseDTO,
  ListeningProgressDTO,
  SaveListeningProgressDTO,
  UserListeningStatsDTO,
  AudiobookWithChaptersDTO,
  AudiobookSearchDTO,
  MostListenedAudiobookDTO,
  AudioLibraryItemDTO,
  AudioStatsDTO,
  AudioPlaybackStateDTO,
  ListeningSessionDTO,
} from './AudioDTO';

// Validation - Types
export type { ValidationError, ValidationResult, Validator } from './ValidationSchemas';

// Validation - Functions
export {
  ValidationRules,
  BookValidationSchema,
  UserValidationSchema,
  ReviewValidationSchema,
  AudioValidationSchema,
  validateAgainstSchema,
  sanitizeString,
  validatePaginationParams,
  validateSortParams,
} from './ValidationSchemas';
