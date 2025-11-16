/**
 * Типізація для Telegraf - замінює any
 */

import { Scenes } from 'telegraf';

/**
 * Розширений контекст бота
 * NOTE: Using 'any' for compatibility with Telegraf scenes system
 * Telegraf's middleware typing is complex and doesn't work well with custom contexts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BotContext = any;

/**
 * Дані сесії
 */
export interface SessionData {
  __scenes?: Scenes.WizardSessionData;
  userId?: number;
  isAdmin?: boolean;
}

/**
 * Wizard Context для scenes
 */
export interface WizardState {
  // AddBookScene
  title?: string;
  author?: string;
  genre?: string;
  description?: string;
  photoFileId?: string;
  bookType?: string;
  fileUrl?: string;
  fileName?: string;
  selectedFormats?: string[]; // Multi-format support
  pdfFileId?: string;
  externalLink?: string;
  audioFileId?: string;
  audioDuration?: number;
  narrator?: string;
  selectedTags?: number[]; // Вибрані теги при додаванні книги
  savedBookId?: number; // ID збереженої книги для додавання тегів
  editingField?: 'title' | 'author' | 'description'; // ✅ ВИПРАВЛЕНО #15: Поле що редагується

  // Multi-format fields (нові поля для мультиформатності)
  bookFile?: string; // File ID для файлу книги
  bookFileName?: string; // Назва файлу книги
  bookAudio?: string; // File ID для аудіо
  bookAudioName?: string; // Назва аудіофайлу
  bookLink?: string; // Посилання на книгу

  // Multi-genre support (підтримка кількох жанрів)
  selectedGenres?: string[]; // Вибрані жанри при додаванні книги

  // Additional format flag
  addingAdditionalFormat?: boolean; // Чи додаємо додатковий формат

  // AI Assistant (Завдання 29)
  useAI?: boolean; // Чи використовувати AI для розпізнавання
  aiRecognized?: boolean; // Чи була інформація розпізнана AI
  awaitingDescriptionFix?: boolean; // Чи очікуємо виправлення опису
  aiSuggestedTags?: string[]; // Теги запропоновані AI

  // AI Filter & Assistant (Завдання 32, 35)
  waitingForCustomMood?: boolean; // Чи очікуємо кастомний настрій
  aiInterest?: string; // Інтерес користувача (fiction/nonfiction)
  aiLength?: string; // Бажана довжина книги
  aiMood?: string; // Настрій користувача

  // RequestBookScene
  bookId?: number;
  fullName?: string;
  unit?: string;
  phone?: string;

  // RateBookScene
  rating?: number;
  comment?: string;

  // Index signature для динамічного доступу (REFACTOR-006)
  [key: string]: any;
}

/**
 * Callback Query Data типи
 */
export type CallbackAction =
  | `order_${number}`
  | `save_${number}`
  | `download_${number}`
  | `reviews_${number}`
  | `similar_${number}`
  | `rate_${number}`
  | `approve_${number}`
  | `reject_${number}`
  | `publish_review_${number}`
  | `delete_review_${number}`
  | 'view_requests'
  | 'add_book'
  | 'admin_stats'
  | 'moderate_reviews';
