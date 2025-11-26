import { Review } from './types';
export declare const addReview: (reviewData: Omit<Review, "id" | "created_at">) => Promise<number>;
export declare const getBookReviews: (bookId: number) => Promise<Review[]>;
export declare const getPendingReviews: () => Promise<Review[]>;
export declare const approveReview: (reviewId: number) => Promise<number>;
export declare const deleteReview: (reviewId: number) => Promise<number>;
export declare const publishReview: (reviewId: number) => Promise<number>;
export declare const updateBookRating: (bookId: number) => Promise<void>;
//# sourceMappingURL=reviews.d.ts.map