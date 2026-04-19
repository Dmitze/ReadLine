import { Book } from '../database/models';
export interface UserProfile {
    favoriteGenres: string[];
    savedBooks: Book[];
    readBooks: Book[];
}
export interface AIBookRecommendation extends Book {
    aiSummary?: string;
    reason?: string;
}
export declare function naturalLanguageSearch(query: string, allBooks: Book[], userId?: number): Promise<Book[]>;
export declare function getPersonalCollection(userProfile: UserProfile, allBooks: Book[]): Promise<AIBookRecommendation[]>;
export declare function getMoodBasedRecommendations(mood: string, allBooks: Book[]): Promise<Book[]>;
export declare function isAIEnabled(): boolean;
export declare function detectGenreFromDescription(description: string): Promise<string | null>;
export interface AIResponse {
    text: string;
    model: string;
    provider: 'Gemini' | 'Groq' | 'Fallback';
}
export declare function askAI(question: string, userId?: number): Promise<AIResponse>;
export interface UserPreferences {
    favoriteGenres?: string[];
    readingHistory?: number[];
    preferredAuthors?: string[];
    [key: string]: unknown;
}
export declare function getBookRecommendations(_userPreferences: UserPreferences): Promise<AIBookRecommendation[]>;
export declare function getMoodBasedBooks(mood: string, allBooks: Book[]): Promise<Book[]>;
export interface UserAnswers {
    interest?: string;
    mood?: string;
    length?: string;
    format?: string;
    [key: string]: unknown;
}
export declare function rerankBooksWithAI(query: string, candidates: Book[]): Promise<Book[]>;
export declare function expandQueryWithAI(query: string): Promise<string[]>;
export declare function expandQueryBasic(query: string): string[];
export declare function cleanupAIHelper(): void;
export declare function interactiveBookSelection(userAnswers: UserAnswers, allBooks: Book[]): Promise<Book[]>;
//# sourceMappingURL=aiHelper.d.ts.map