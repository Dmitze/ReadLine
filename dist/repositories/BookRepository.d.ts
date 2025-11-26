import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
import { Book } from '../database/models';
export declare class BookRepository extends BaseRepository<Book> {
    constructor(db: DatabaseWrapper);
    create(book: Omit<Book, 'id' | 'created_at'>): Promise<number>;
    update(bookId: number, updates: Partial<Omit<Book, 'id' | 'created_at'>>): Promise<number>;
    getByGenre(genre: string): Promise<Book[]>;
    getByGenreWithPagination(genre: string, limit?: number, offset?: number): Promise<{
        books: Book[];
        total: number;
    }>;
    getAllWithPagination(limit?: number, offset?: number): Promise<{
        books: Book[];
        total: number;
    }>;
    search(searchTerm: string, limit?: number): Promise<Book[]>;
    getTopRated(limit?: number): Promise<Book[]>;
    getNewest(limit?: number): Promise<Book[]>;
    getRandom(): Promise<Book | undefined>;
    getAllGenres(): Promise<string[]>;
    incrementDownloads(bookId: number): Promise<void>;
    getLowRatedBooks(maxRating?: number, limit?: number): Promise<Book[]>;
    getByAuthor(author: string, limit?: number): Promise<Book[]>;
    findByQuery(searchTerm: string, limit?: number): Promise<Book[]>;
    findMostRated(limit?: number): Promise<Book[]>;
    findNewest(limit?: number): Promise<Book[]>;
    findByGenre(genre: string): Promise<Book[]>;
}
//# sourceMappingURL=BookRepository.d.ts.map