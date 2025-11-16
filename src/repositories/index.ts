/**
 * Repositories barrel export
 * REFACTOR-002: Repository Layer Separation
 * REFACTOR-012: Database Query Optimization
 */

export { BaseRepository } from './BaseRepository';
export {
  OptimizedRepository,
  type PaginationParams,
  type PaginatedResult,
  type FilterOptions,
} from './OptimizedRepository';
export { BookRepository } from './BookRepository';
export { OptimizedBookRepository } from './OptimizedBookRepository';
export { UserRepository } from './UserRepository';
export { ReviewRepository } from './ReviewRepository';
export { SavedBookRepository } from './SavedBookRepository';
export { AudioRepository } from './AudioRepository';
export { TagRepository } from './TagRepository';
export { PromoCodeRepository } from './PromoCodeRepository';
