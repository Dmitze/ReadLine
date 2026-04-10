/**
 * Database Tables Index
 * REFACTOR-009: Split models.ts - Main export file
 */

// Export types
export * from './types';

// Export database connection and initialization
export { db, initDatabase } from './db';

// Export books functions
export {
  addBook,
  getBooksByGenre,
  getAllBooks,
  getAllAvailableBooks,
  getBookById,
  getGenres,
  getBooksByGenreWithPagination,
  getBooksWithPagination,
  updateBook,
  deleteBook,
  getTopBooks,
  getMostDownloadedBooks,
  getNewestBooks,
  incrementDownloads,
  updateBookInfo,
  searchBooks,
} from './books';

// Export reviews functions
export {
  addReview,
  getBookReviews,
  getPendingReviews,
  approveReview,
  publishReview,
  deleteReview,
  updateBookRating,
} from './reviews';

// Export saved books functions
export { saveBook, unsaveBook, isBookSaved, getSavedBooks, getSavedBooksCount } from './savedBooks';

// Export admins functions
export {
  addAdmin,
  isAdmin,
  getAllAdmins,
  getAdminStats,
  getExtendedAdminStats,
  removeAdmin,
} from './admins';

// Export feedback functions
export {
  addFeedbackMessage,
  getPendingFeedbackMessages,
  getAllFeedbackMessages,
  updateFeedbackStatus,
  addAdminReply,
  deleteFeedback,
} from './feedback';

// Export stats functions
export { getBookDetailedStats } from './stats';

// Export podcasts functions
export {
  addPodcast,
  getAllPodcasts,
  getPodcastById,
  updatePodcast,
  getPodcastReviews,
  deletePodcast,
} from './podcasts';

export type { Podcast, PodcastReview, PodcastListen } from './podcasts';
