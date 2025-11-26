import { Result } from '../core/Result';
export interface UserStats {
    savedBooksCount: number;
    reviewsCount: number;
    totalListeningTime: number;
    favoriteGenres: string[];
}
export interface UserProfile {
    userId: number;
    firstName: string;
    lastName: string;
    username: string;
    stats: UserStats;
    favoriteGenres: string[];
    userTags: string[];
}
export interface PersonalCollectionResult {
    books: any[];
    source: 'smart_recommendations' | 'top_books' | 'new_books';
    count: number;
}
export declare class UserManagementService {
    private db;
    constructor(db: any);
    getUserProfile(userId: number): Promise<Result<UserProfile, Error>>;
    getUserStats(userId: number): Promise<Result<UserStats, Error>>;
    getPersonalCollection(userId: number, limit?: number): Promise<Result<PersonalCollectionResult, Error>>;
    getUserFavoriteGenres(userId: number): Promise<Result<string[], Error>>;
    getUserInterestTags(userId: number): Promise<Result<string[], Error>>;
    canUserPerformAction(userId: number, action: string): Promise<Result<boolean, Error>>;
    formatProfileText(profile: UserProfile): string;
    formatDetailedStatsText(stats: UserStats): string;
}
export declare function createUserManagementService(db: any): UserManagementService;
//# sourceMappingURL=UserManagementService.d.ts.map