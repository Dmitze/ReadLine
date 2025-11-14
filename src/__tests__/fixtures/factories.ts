/**
 * Test Data Factories
 * Factory pattern for creating test data consistently
 */

/**
 * Book Factory
 */
export const BookFactory = {
  create: (overrides: Record<string, any> = {}) => ({
    id: Math.floor(Math.random() * 10000),
    title: 'Test Book',
    author: 'Test Author',
    genre: 'Fiction',
    description: 'A test book description',
    rating: 4.5,
    year: 2023,
    isAvailable: true,
    language: 'uk',
    pageCount: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  createMany: (count: number, overrides: Record<string, any> = {}) => {
    return Array.from({ length: count }, (_, i) =>
      BookFactory.create({ id: i + 1, ...overrides })
    );
  },

  // Specific book types
  fiction: (overrides?: Record<string, any>) =>
    BookFactory.create({ genre: 'Fiction', ...overrides }),

  scifi: (overrides?: Record<string, any>) =>
    BookFactory.create({ genre: 'Science Fiction', ...overrides }),

  history: (overrides?: Record<string, any>) =>
    BookFactory.create({ genre: 'History', ...overrides }),

  unavailable: (overrides?: Record<string, any>) =>
    BookFactory.create({ isAvailable: false, ...overrides })
};

/**
 * User Factory
 */
export const UserFactory = {
  create: (overrides: Record<string, any> = {}) => ({
    id: Math.floor(Math.random() * 10000),
    telegramId: Math.floor(Math.random() * 10000000),
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    email: 'test@example.com',
    language: 'uk',
    isAdmin: false,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  createMany: (count: number, overrides: Record<string, any> = {}) => {
    return Array.from({ length: count }, (_, i) =>
      UserFactory.create({ id: i + 1, ...overrides })
    );
  },

  // Specific user types
  admin: (overrides?: Record<string, any>) =>
    UserFactory.create({ isAdmin: true, ...overrides }),

  blocked: (overrides?: Record<string, any>) =>
    UserFactory.create({ isBlocked: true, ...overrides })
};

/**
 * Review Factory
 */
export const ReviewFactory = {
  create: (overrides: Record<string, any> = {}) => ({
    id: Math.floor(Math.random() * 10000),
    bookId: 1,
    userId: 1,
    rating: 5,
    comment: 'Great book!',
    isApproved: true,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  createMany: (count: number, overrides: Record<string, any> = {}) => {
    return Array.from({ length: count }, (_, i) =>
      ReviewFactory.create({ id: i + 1, ...overrides })
    );
  },

  // Specific review types
  approved: (overrides?: Record<string, any>) =>
    ReviewFactory.create({ isApproved: true, ...overrides }),

  pending: (overrides?: Record<string, any>) =>
    ReviewFactory.create({ isApproved: false, ...overrides }),

  highRating: (overrides?: Record<string, any>) =>
    ReviewFactory.create({ rating: 5, ...overrides }),

  lowRating: (overrides?: Record<string, any>) =>
    ReviewFactory.create({ rating: 1, ...overrides })
};

/**
 * Audio Book Factory
 */
export const AudioBookFactory = {
  create: (overrides: Record<string, any> = {}) => ({
    id: Math.floor(Math.random() * 10000),
    bookId: 1,
    narrator: 'Test Narrator',
    duration: 3600,
    fileUrl: 'https://example.com/audio.mp3',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  // Specific audio book types
  available: (overrides?: Record<string, any>) =>
    AudioBookFactory.create({ status: 'available', ...overrides }),

  processing: (overrides?: Record<string, any>) =>
    AudioBookFactory.create({ status: 'processing', ...overrides })
};

/**
 * SavedBook Factory
 */
export const SavedBookFactory = {
  create: (overrides: Record<string, any> = {}) => ({
    id: Math.floor(Math.random() * 10000),
    userId: 1,
    bookId: 1,
    status: 'reading',
    progress: 50,
    savedAt: new Date(),
    ...overrides
  }),

  // Specific saved book types
  reading: (overrides?: Record<string, any>) =>
    SavedBookFactory.create({ status: 'reading', ...overrides }),

  completed: (overrides?: Record<string, any>) =>
    SavedBookFactory.create({ status: 'completed', progress: 100, ...overrides }),

  toRead: (overrides?: Record<string, any>) =>
    SavedBookFactory.create({ status: 'to_read', progress: 0, ...overrides })
};

/**
 * Tag Factory
 */
export const TagFactory = {
  create: (overrides: Record<string, any> = {}) => ({
    id: Math.floor(Math.random() * 10000),
    name: 'test-tag',
    bookCount: 1,
    createdAt: new Date(),
    ...overrides
  }),

  createMany: (count: number, overrides: Record<string, any> = {}) => {
    return Array.from({ length: count }, (_, i) =>
      TagFactory.create({ id: i + 1, name: `tag-${i}`, ...overrides })
    );
  }
};

/**
 * Feedback Factory
 */
export const FeedbackFactory = {
  create: (overrides: Record<string, any> = {}) => ({
    id: Math.floor(Math.random() * 10000),
    userId: 1,
    message: 'Test feedback',
    type: 'bug',
    isRead: false,
    reply: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  // Specific feedback types
  bug: (overrides?: Record<string, any>) =>
    FeedbackFactory.create({ type: 'bug', ...overrides }),

  feature: (overrides?: Record<string, any>) =>
    FeedbackFactory.create({ type: 'feature', ...overrides }),

  suggestion: (overrides?: Record<string, any>) =>
    FeedbackFactory.create({ type: 'suggestion', ...overrides }),

  read: (overrides?: Record<string, any>) =>
    FeedbackFactory.create({ isRead: true, ...overrides })
};

/**
 * PromoCode Factory
 */
export const PromoCodeFactory = {
  create: (overrides: Record<string, any> = {}) => ({
    id: Math.floor(Math.random() * 10000),
    code: 'PROMO2025',
    discount: 10,
    maxUses: 100,
    usedCount: 0,
    isActive: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: new Date(),
    ...overrides
  }),

  // Specific promo types
  active: (overrides?: Record<string, any>) =>
    PromoCodeFactory.create({ isActive: true, ...overrides }),

  expired: (overrides?: Record<string, any>) =>
    PromoCodeFactory.create({
      isActive: false,
      expiresAt: new Date(Date.now() - 1000),
      ...overrides
    }),

  unlimited: (overrides?: Record<string, any>) =>
    PromoCodeFactory.create({ maxUses: 9999, ...overrides })
};

/**
 * All factories combined
 */
export const Factories = {
  Book: BookFactory,
  User: UserFactory,
  Review: ReviewFactory,
  AudioBook: AudioBookFactory,
  SavedBook: SavedBookFactory,
  Tag: TagFactory,
  Feedback: FeedbackFactory,
  PromoCode: PromoCodeFactory
};
