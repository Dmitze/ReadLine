import { BookRepository } from '../repositories/BookRepository';
import { ReviewRepository } from '../repositories/ReviewRepository';
import { SavedBookRepository } from '../repositories/SavedBookRepository';
import { TagRepository } from '../repositories/TagRepository';
import { Result } from '../core/Result';
export interface CreateBookInput {
    title: string;
    author: string;
    genre: string;
    description: string;
    photo_file_id?: string;
    file_type: 'physical' | 'file' | 'audio' | 'link';
    file_path?: string;
    file_size?: number;
}
export interface UpdateBookInput {
    title?: string;
    author?: string;
    genre?: string;
    description?: string;
    photo_file_id?: string;
}
export interface BookFilters {
    genre?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'rating' | 'date' | 'title';
    userId?: number;
}
export declare class BookService {
    private bookRepository;
    private reviewRepository;
    private savedBookRepository;
    private tagRepository;
    constructor(bookRepository: BookRepository, reviewRepository: ReviewRepository, savedBookRepository: SavedBookRepository, tagRepository: TagRepository);
    createBook(input: CreateBookInput): Promise<Result<number>>;
    getBookById(bookId: number): Promise<Result<any>>;
    updateBook(bookId: number, input: UpdateBookInput): Promise<Result<void>>;
    deleteBook(bookId: number): Promise<Result<void>>;
    searchBooks(filters: BookFilters): Promise<Result<any[]>>;
    getPopularBooks(limit?: number): Promise<Result<any[]>>;
    getNewBooks(limit?: number): Promise<Result<any[]>>;
    getBooksByGenre(genre: string, limit?: number, offset?: number): Promise<Result<any[]>>;
    getSimilarBooks(bookId: number, limit?: number): Promise<Result<any[]>>;
    addTagToBook(bookId: number, tagId: number): Promise<Result<void>>;
    getBookTags(bookId: number): Promise<Result<any[]>>;
    getDetailedBookInfo(bookId: number): Promise<Result<any>>;
    updateBookExtendedInfo(bookId: number, recommendedAge?: number, contentWarnings?: string[]): Promise<Result<void>>;
}
//# sourceMappingURL=BookService.d.ts.map