export interface User {
    id?: number;
    user_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    has_completed_onboarding: boolean;
    favorite_genres?: string;
    created_at?: string;
    last_active_at?: string;
}
export declare function getUserByTelegramId(userId: number): Promise<User | undefined>;
export declare function createUser(userId: number, username?: string, firstName?: string, lastName?: string): Promise<number>;
export declare function markOnboardingComplete(userId: number, favoriteGenres?: string[]): Promise<void>;
export declare function isNewUser(userId: number): Promise<boolean>;
export declare function updateLastActive(userId: number): Promise<void>;
export declare function getOrCreateUser(userId: number, username?: string, firstName?: string, lastName?: string): Promise<User>;
export declare function getUserFavoriteGenres(userId: number): Promise<string[]>;
export declare function updateUserFavoriteGenres(userId: number, genres: string[]): Promise<void>;
export declare function getUserSavedBooksCount(userId: number): Promise<number>;
export declare function getUserReviewsCount(userId: number): Promise<number>;
export declare function getUserDetailedStats(userId: number): Promise<{
    savedBooksCount: number;
    reviewsCount: number;
    favoriteGenres: string[];
    totalListeningTime: number;
}>;
//# sourceMappingURL=userFunctions.d.ts.map