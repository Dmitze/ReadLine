import { Book } from '../database/models';
import { Result } from '../core/Result';
export interface BookCreationData {
    title: string;
    author: string;
    genre: string;
    description: string;
    photo_file_id?: string;
    file_type: string;
    is_physically_available: boolean;
    file_url?: string;
    file_name?: string;
    audio_file_id?: string;
    online_link?: string;
    selectedTags?: number[];
}
export interface BookCreationResult {
    bookId: number;
    book: Book;
}
export declare class BookManagementService {
    private tagRepository;
    private db;
    constructor(db: any);
    createBook(bookData: BookCreationData): Promise<Result<BookCreationResult, Error>>;
    bulkUpdateAvailability(bookIds: number[], available: boolean, adminId?: number): Promise<Result<{
        success: boolean;
        count: number;
        errors: string[];
    }, Error>>;
    bulkDeleteBooks(bookIds: number[], adminId?: number): Promise<Result<{
        success: boolean;
        count: number;
        errors: string[];
    }, Error>>;
    validateBookData(bookData: Partial<BookCreationData>): Result<boolean, string[]>;
    canUserAddBook(userId: number): Promise<Result<boolean, string>>;
    getUserBookStats(userId: number): Promise<Result<{
        totalBooks: number;
        publishedBooks: number;
        pendingBooks: number;
    }, Error>>;
}
export declare function createBookManagementService(db: any): BookManagementService;
//# sourceMappingURL=BookManagementService.d.ts.map