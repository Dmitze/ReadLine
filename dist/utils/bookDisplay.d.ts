import { Context } from 'telegraf';
import { Book } from '../database/models';
export interface DisplayBooksOptions {
    title?: string;
    subtitle?: string;
    isSaved?: boolean;
    showIndex?: boolean;
    indexPrefix?: string;
}
export declare function displayBookList(ctx: Context, books: Book[], options?: DisplayBooksOptions): Promise<void>;
export declare function displaySingleBook(ctx: Context, book: Book, options?: {
    isSaved?: boolean;
    index?: number;
    indexPrefix?: string;
    tags?: Array<{
        name: string;
    }>;
}): Promise<void>;
export declare function displayNoBooks(ctx: Context, message?: string): Promise<void>;
export declare function displayTopBooks(ctx: Context, books: Book[], limit?: number): Promise<void>;
export declare function displayNewBooks(ctx: Context, books: Book[], limit?: number): Promise<void>;
export declare function displaySavedBooks(ctx: Context, books: Book[]): Promise<void>;
export declare function displaySearchResults(ctx: Context, books: Book[], searchTerm: string): Promise<void>;
//# sourceMappingURL=bookDisplay.d.ts.map