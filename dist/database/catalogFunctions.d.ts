import { Book } from './models';
export type SQLParameter = string | number | boolean | null | undefined;
export type SQLParameters = SQLParameter[];
export interface CatalogFilters {
    genre?: string;
    hasAudio?: boolean;
    minRating?: number;
    sortBy?: 'rating' | 'date' | 'title' | 'downloads';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
export declare const getBooksWithFilters: (filters: CatalogFilters) => Promise<{
    books: Book[];
    total: number;
}>;
export declare const getBooksWithAudio: (limit?: number) => Promise<Book[]>;
export declare const getHighRatedBooks: (minRating?: number, limit?: number) => Promise<Book[]>;
export declare const getHighRatedBooksWithPagination: (minRating?: number, limit?: number, offset?: number) => Promise<{
    books: Book[];
    total: number;
}>;
export declare const getNewestBooksWithPagination: (limit?: number, offset?: number) => Promise<{
    books: Book[];
    total: number;
}>;
export declare const getBooksWithAudioWithPagination: (limit?: number, offset?: number) => Promise<{
    books: Book[];
    total: number;
}>;
export declare const getMostDownloadedBooksWithPagination: (limit?: number, offset?: number) => Promise<{
    books: Book[];
    total: number;
}>;
export declare const getBooksSortedByTitle: (limit?: number, offset?: number) => Promise<{
    books: Book[];
    total: number;
}>;
//# sourceMappingURL=catalogFunctions.d.ts.map