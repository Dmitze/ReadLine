import { Book } from './types';
export declare const addBook: (bookData: Omit<Book, "id" | "is_available" | "created_at"> & {
    isbn?: string;
    language?: string;
    is_physically_available?: boolean;
}) => Promise<number>;
export declare const getBooksByGenre: (genre: string) => Promise<Book[]>;
export declare const getAllBooks: () => Promise<Book[]>;
export declare const getAllAvailableBooks: () => Promise<Book[]>;
export declare const getBooksByIds: (ids: number[]) => Promise<Map<number, Book>>;
export declare const getBookById: (id: number) => Promise<Book | undefined>;
export declare const getGenres: () => Promise<string[]>;
export declare const getBooksByGenreWithPagination: (genre: string, page?: number, limit?: number) => Promise<{
    books: Book[];
    total: number;
}>;
export declare const getBooksWithPagination: (page?: number, limit?: number, search?: string) => Promise<{
    books: Book[];
    total: number;
    totalPages: number;
}>;
export declare const updateBook: (bookId: number, updates: Partial<Book>) => Promise<number>;
export declare const deleteBook: (bookId: number) => Promise<number>;
export declare const getTopBooks: (limit?: number) => Promise<Book[]>;
export declare const getMostDownloadedBooks: (limit?: number) => Promise<Book[]>;
export declare const getNewestBooks: (limit?: number) => Promise<Book[]>;
export declare const incrementDownloads: (bookId: number) => Promise<void>;
export declare const updateBookInfo: (bookId: number, field: string, value: any) => Promise<number>;
export declare const searchBooks: (query: string, limit?: number) => Promise<Book[]>;
//# sourceMappingURL=books.d.ts.map