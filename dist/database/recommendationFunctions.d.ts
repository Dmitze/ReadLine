import { Book } from './models';
export declare const getRandomBook: () => Promise<Book | null>;
export declare const getRecentlyViewedBooks: (userId: number, limit?: number) => Promise<Book[]>;
export declare const getUserFavoriteGenres: (userId: number, limit?: number) => Promise<string[]>;
export declare const getRecommendedBooks: (userId: number, limit?: number) => Promise<Book[]>;
export declare const getUserReadingStats: (userId: number) => Promise<{
    savedCount: number;
    reviewsCount: number;
    favoriteGenres: string[];
}>;
export declare const getBooksBasedOnBehavior: (userId: number, limit?: number) => Promise<Book[]>;
export declare const getCollaborativeRecommendations: (userId: number, limit?: number) => Promise<Book[]>;
export declare const getContextualRecommendations: (userId: number, limit?: number) => Promise<Book[]>;
export declare const getSmartRecommendations: (userId: number, limit?: number) => Promise<Book[]>;
//# sourceMappingURL=recommendationFunctions.d.ts.map