import { Book } from './types';
export declare const saveBook: (userId: number, bookId: number) => Promise<void>;
export declare const unsaveBook: (userId: number, bookId: number) => Promise<void>;
export declare const isBookSaved: (userId: number, bookId: number) => Promise<boolean>;
export declare const getSavedBooks: (userId: number) => Promise<Book[]>;
export declare const getSavedBooksCount: (userId: number) => Promise<number>;
//# sourceMappingURL=savedBooks.d.ts.map