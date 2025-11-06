import sqlite3 from 'sqlite3';
export interface Book {
    id?: number;
    title: string;
    author: string;
    genre: string;
    description: string;
    photo_file_id: string;
    is_available?: boolean;
    created_at?: string;
}
export interface Request {
    id?: number;
    user_id: number;
    user_name?: string;
    book_id: number;
    full_name: string;
    unit: string;
    phone?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
    book_title?: string;
}
export interface Admin {
    id?: number;
    user_id: number;
    username?: string;
    created_at?: string;
}
export interface AdminStats {
    totalBooks: number;
    pendingRequests: number;
}
export declare const db: sqlite3.Database;
export declare const initDatabase: () => void;
export declare const addBook: (bookData: Omit<Book, "id" | "is_available" | "created_at">) => Promise<number>;
export declare const getBooksByGenre: (genre: string) => Promise<Book[]>;
export declare const getAllBooks: () => Promise<Book[]>;
export declare const getBookById: (id: number) => Promise<Book | undefined>;
export declare const getGenres: () => Promise<string[]>;
export declare const addRequest: (requestData: Omit<Request, "id" | "status" | "created_at" | "updated_at">) => Promise<number>;
export declare const getPendingRequests: () => Promise<Request[]>;
export declare const updateRequestStatus: (requestId: number, status: string) => Promise<number>;
export declare const getUserRequests: (userId: number) => Promise<Request[]>;
export declare const addAdmin: (userId: number, username?: string) => Promise<number>;
export declare const isAdmin: (userId: number) => Promise<boolean>;
export declare const getAdminStats: () => Promise<AdminStats>;
//# sourceMappingURL=models.d.ts.map