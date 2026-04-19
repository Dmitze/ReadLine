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

export type { ValidationError, ValidationResult, Validator } from './ValidationSchemas';

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
