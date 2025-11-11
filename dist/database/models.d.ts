import sqlite3 from 'sqlite3';
export interface Book {
    id?: number;
    title: string;
    author: string;
    genre: string;
    description: string;
    photo_file_id: string;
    file_url?: string;
    file_type?: string;
    file_name?: string;
    rating?: number;
    reviews_count?: number;
    downloads_count?: number;
    is_available?: boolean;
    created_at?: string;
}
export interface Admin {
    id?: number;
    user_id: number;
    username?: string;
    created_at?: string;
}
export interface AdminStats {
    totalBooks: number;
}
export interface Review {
    id?: number;
    book_id: number;
    user_id: number;
    user_name?: string;
    rating: number;
    comment?: string;
    is_published?: boolean;
    created_at?: string;
}
export interface SavedBook {
    id?: number;
    user_id: number;
    book_id: number;
    created_at?: string;
}
export interface FeedbackMessage {
    id?: number;
    user_id: number;
    user_name?: string;
    user_username?: string;
    message: string;
    status?: string;
    admin_reply?: string;
    created_at?: string;
    read_at?: string;
}
export interface AudioChapter {
    id?: number;
    book_id: number;
    chapter_number: number;
    title: string;
    file_id: string;
    duration: number;
    created_at?: string;
}
export interface ListeningProgress {
    id?: number;
    user_id: number;
    book_id: number;
    chapter_id?: number;
    position: number;
    total_listened: number;
    last_listened_at?: string;
    created_at?: string;
}
export declare const db: sqlite3.Database;
export declare const initDatabase: () => Promise<void>;
export declare const addBook: (bookData: Omit<Book, "id" | "is_available" | "created_at">) => Promise<number>;
export declare const getBooksByGenre: (genre: string) => Promise<Book[]>;
export declare const getAllBooks: () => Promise<Book[]>;
export declare const getAllAvailableBooks: () => Promise<Book[]>;
export declare const getBookById: (id: number) => Promise<Book | undefined>;
export declare const getGenres: () => Promise<string[]>;
export declare const addAdmin: (userId: number, username?: string) => Promise<number>;
export declare const isAdmin: (userId: number) => Promise<boolean>;
export declare const getAllAdmins: () => Promise<Admin[]>;
export declare const getAdminStats: () => Promise<AdminStats>;
export declare const getBooksByGenreWithPagination: (genre: string, limit?: number, offset?: number) => Promise<{
    books: Book[];
    total: number;
}>;
export declare const getBooksWithPagination: (limit?: number, offset?: number) => Promise<{
    books: Book[];
    total: number;
}>;
export declare const searchBooks: (searchTerm: string, limit?: number) => Promise<Book[]>;
export declare const updateBook: (bookId: number, updates: Partial<Omit<Book, "id" | "created_at">>) => Promise<number>;
export declare const deleteBook: (bookId: number) => Promise<number>;
export declare const incrementDownloads: (bookId: number) => Promise<void>;
export declare const addReview: (reviewData: Omit<Review, "id" | "created_at">) => Promise<number>;
export declare const getBookReviews: (bookId: number) => Promise<Review[]>;
export declare const getPendingReviews: () => Promise<Review[]>;
export declare const publishReview: (reviewId: number) => Promise<number>;
export declare const deleteReview: (reviewId: number) => Promise<number>;
export declare const saveBook: (userId: number, bookId: number) => Promise<number>;
export declare const unsaveBook: (userId: number, bookId: number) => Promise<number>;
export declare const getSavedBooks: (userId: number) => Promise<Book[]>;
export declare const isBookSaved: (userId: number, bookId: number) => Promise<boolean>;
export declare const areBooksaved: (userId: number, bookIds: number[]) => Promise<Set<number>>;
export declare const getTopBooks: (limit?: number) => Promise<Book[]>;
export declare const getMostDownloadedBooks: (limit?: number) => Promise<Book[]>;
export declare const getNewestBooks: (limit?: number) => Promise<Book[]>;
export declare const addFeedbackMessage: (feedbackData: Omit<FeedbackMessage, "id" | "status" | "created_at" | "read_at">) => Promise<number>;
export declare const getPendingFeedbackMessages: () => Promise<FeedbackMessage[]>;
export declare const getAllFeedbackMessages: () => Promise<FeedbackMessage[]>;
export declare const markFeedbackAsRead: (feedbackId: number) => Promise<void>;
export declare const updateFeedbackStatus: (feedbackId: number, status: string) => Promise<number>;
export declare const addAdminReply: (feedbackId: number, reply: string) => Promise<void>;
//# sourceMappingURL=models.d.ts.map