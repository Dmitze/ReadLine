/**
 * Predefined Validation Schemas
 * REFACTOR-014: Comprehensive Input Validation
 */

import { ValidationBuilder } from './Validator';

/**
 * Схеми валідації для основних сутностей
 */

// ==================== BOOK SCHEMAS ====================

export const BookCreateSchema = {
  title: ['required', 'string', 'min:1', 'max:255'],
  author: ['required', 'string', 'min:1', 'max:255'],
  genre: ['required', 'string', 'min:1', 'max:100'],
  description: ['required', 'string', 'min:10', 'max:5000'],
  file_type: ['required', 'in:physical:file:audio:link'],
  photo_file_id: ['string', 'max:255'],
  file_path: ['string', 'max:1000'],
  file_size: ['number']
};

export const BookUpdateSchema = {
  title: ['string', 'min:1', 'max:255'],
  author: ['string', 'min:1', 'max:255'],
  genre: ['string', 'min:1', 'max:100'],
  description: ['string', 'min:10', 'max:5000'],
  photo_file_id: ['string', 'max:255']
};

export const BookSearchSchema = {
  query: ['string', 'max:255'],
  genre: ['string', 'max:100'],
  limit: ['number', 'min:1', 'max:100'],
  offset: ['number', 'min:0']
};

// ==================== USER SCHEMAS ====================

export const UserCreateSchema = {
  telegram_id: ['required', 'number'],
  username: ['string', 'username', 'min:3', 'max:32'],
  first_name: ['string', 'max:255'],
  last_name: ['string', 'max:255'],
  language: ['in:uk:en:ru']
};

export const UserUpdateSchema = {
  username: ['string', 'username', 'min:3', 'max:32'],
  first_name: ['string', 'max:255'],
  last_name: ['string', 'max:255'],
  language: ['in:uk:en:ru'],
  is_admin: ['boolean']
};

// ==================== REVIEW SCHEMAS ====================

export const ReviewCreateSchema = {
  book_id: ['required', 'number', 'min:1'],
  user_id: ['required', 'number', 'min:1'],
  rating: ['required', 'number', 'in:1:2:3:4:5'],
  comment: ['string', 'max:2000']
};

export const ReviewUpdateSchema = {
  rating: ['number', 'in:1:2:3:4:5'],
  comment: ['string', 'max:2000']
};

// ==================== AUDIO SCHEMAS ====================

export const AudioCreateSchema = {
  book_id: ['required', 'number', 'min:1'],
  file_id: ['required', 'string', 'min:1', 'max:255'],
  duration: ['required', 'number', 'min:1'],
  narrator: ['string', 'max:255'],
  quality: ['in:low:medium:high']
};

export const AudioUpdateSchema = {
  duration: ['number', 'min:1'],
  narrator: ['string', 'max:255'],
  quality: ['in:low:medium:high']
};

// ==================== TAG SCHEMAS ====================

/**
 * Теги повинні бути однослівними (максимум 2 слова без пробілів)
 * Приклади валідних тегів: "Детектив", "Графічний_роман"
 * Приклади невалідних тегів: "Сучасна література" (2 слова з пробілом)
 */
export const TagCreateSchema = {
  name: ['required', 'string', 'min:1', 'max:50', 'tag'], // Спеціальна валідація для тегів
  description: ['string', 'max:500']
};

export const TagUpdateSchema = {
  name: ['string', 'min:1', 'max:50', 'tag'], // Спеціальна валідація для тегів
  description: ['string', 'max:500']
};

// ==================== PROMO CODE SCHEMAS ====================

export const PromoCodeCreateSchema = {
  code: ['required', 'string', 'pattern:[A-Z0-9]{4,12}', 'max:12'],
  discount_percent: ['required', 'number', 'between:1:100'],
  max_uses: ['number', 'min:1'],
  expires_at: ['string']
};

// ==================== SAVED BOOK SCHEMAS ====================

export const SavedBookSchema = {
  book_id: ['required', 'number', 'min:1'],
  user_id: ['required', 'number', 'min:1'],
  collection: ['string', 'max:50']
};

// ==================== FEEDBACK SCHEMAS ====================

export const FeedbackCreateSchema = {
  content: ['required', 'string', 'min:10', 'max:5000'],
  type: ['required', 'in:bug:feature:improvement:other'],
  telegram_username: ['string', 'max:255']
};

export const FeedbackReplySchema = {
  message: ['required', 'string', 'min:1', 'max:2000']
};

// ==================== PAGINATION SCHEMAS ====================

export const PaginationSchema = {
  page: ['number', 'min:1'],
  limit: ['number', 'min:1', 'max:100']
};

// ==================== FILTER SCHEMAS ====================

export const BookFilterSchema = {
  genre: ['string', 'max:100'],
  rating: ['number', 'between:1:5'],
  search: ['string', 'max:255'],
  sortBy: ['in:rating:date:title:popularity'],
  limit: ['number', 'min:1', 'max:100'],
  offset: ['number', 'min:0']
};

// ==================== Fluent Builder Examples ====================

export function createBookValidation() {
  return new ValidationBuilder()
    .field('title')
    .required()
    .string()
    .min(1)
    .max(255)
    .field('author')
    .required()
    .string()
    .min(1)
    .max(255)
    .field('genre')
    .required()
    .string()
    .min(1)
    .max(100)
    .build();
}

export function updateUserValidation() {
  return new ValidationBuilder()
    .field('username')
    .string()
    .min(3)
    .max(32)
    .field('email')
    .email()
    .field('language')
    .in('uk', 'en', 'ru')
    .build();
}

export function searchValidation() {
  return new ValidationBuilder()
    .field('query')
    .string()
    .max(255)
    .safe()
    .field('limit')
    .number()
    .between(1, 100)
    .field('offset')
    .number()
    .min(0)
    .build();
}

export function ratingValidation() {
  return new ValidationBuilder()
    .field('book_id')
    .required()
    .number()
    .field('rating')
    .required()
    .number()
    .between(1, 5)
    .field('comment')
    .string()
    .max(2000)
    .safe()
    .build();
}
