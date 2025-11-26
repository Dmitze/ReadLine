export interface BookOrder {
    id?: number;
    book_id: number;
    user_id: number;
    full_name: string;
    callsign: string;
    unit: string;
    phone: string;
    created_at?: string;
}
export interface BookOrderWithBookInfo extends BookOrder {
    book_title: string;
    book_author: string;
    book_genre: string;
}
export declare const createBookOrder: (order: Omit<BookOrder, "id" | "created_at">) => Promise<number>;
export declare const getBookOrderById: (orderId: number) => Promise<BookOrder | undefined>;
export declare const getBookOrderWithBookInfo: (orderId: number) => Promise<BookOrderWithBookInfo | undefined>;
export declare const getUserBookOrders: (userId: number) => Promise<BookOrderWithBookInfo[]>;
export declare const getAllBookOrders: () => Promise<BookOrderWithBookInfo[]>;
export declare const deleteBookOrder: (orderId: number) => Promise<void>;
export declare const hasUserOrderedBook: (userId: number, bookId: number) => Promise<boolean>;
export declare const getUserOrdersCount: (userId: number) => Promise<number>;
//# sourceMappingURL=bookOrderFunctions.d.ts.map