import { DatabaseWrapper } from '../database/dbWrapper';
import { OptimizedRepository, PaginatedResult } from './OptimizedRepository';
import { QueryOptimizer } from '../database/QueryOptimizer';
import { Book } from '../database/models';
export declare class OptimizedBookRepository extends OptimizedRepository<Book> {
    constructor(db: DatabaseWrapper, optimizer?: QueryOptimizer);
    initializeIndexes(): Promise<void>;
    create(book: Omit<Book, 'id' | 'created_at'>): Promise<number>;
    getByGenrePaginated(genre: string, limit?: number, offset?: number): Promise<PaginatedResult<Book>>;
    searchOptimized(searchTerm: string, limit?: number): Promise<Book[]>;
    getTopRated(limit?: number): Promise<Book[]>;
    getNewest(limit?: number): Promise<Book[]>;
    getRandom(): Promise<Book | undefined>;
    getAllGenres(): Promise<string[]>;
    incrementDownloads(bookId: number): Promise<void>;
    getLowRatedBooks(maxRating?: number, limit?: number): Promise<Book[]>;
    getByAuthorPaginated(author: string, limit?: number, offset?: number): Promise<PaginatedResult<Book>>;
    updateRating(bookId: number, newRating: number, reviewsCount: number): Promise<number>;
    getDashboardSummary(): Promise<{
        totalBooks: number;
        availableBooks: number;
        topRated: Book[];
        newest: Book[];
    }>;
    analyzeTableOptimization(): Promise<void>;
}
//# sourceMappingURL=OptimizedBookRepository.d.ts.map