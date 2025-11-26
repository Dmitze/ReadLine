export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type BookCondition = 'new' | 'like_new' | 'good' | 'acceptable' | 'poor';
export type LoanStatus = 'active' | 'returned' | 'overdue' | 'lost';
export interface PhysicalBookRequest {
    id?: number;
    user_id: number;
    book_title: string;
    book_author: string;
    book_genre?: string;
    book_description?: string;
    book_cover_url?: string;
    status: RequestStatus;
    priority?: number;
    notes?: string;
    admin_notes?: string;
    rejection_reason?: string;
    requested_at?: string;
    reviewed_at?: string;
    reviewed_by?: number;
    completed_at?: string;
}
export interface PhysicalBook {
    id?: number;
    book_id?: number;
    title: string;
    author: string;
    isbn?: string;
    quantity_total: number;
    quantity_available: number;
    condition: BookCondition;
    location?: string;
    notes?: string;
    added_at?: string;
    added_by?: number;
}
export interface BookLoan {
    id?: number;
    physical_book_id: number;
    user_id: number;
    request_id?: number;
    issued_at?: string;
    due_date: string;
    returned_at?: string;
    status: LoanStatus;
    issued_by?: number;
    notes?: string;
}
export interface RequestHistory {
    id?: number;
    request_id: number;
    old_status?: string;
    new_status: string;
    changed_by?: number;
    change_reason?: string;
    changed_at?: string;
}
export declare const initPhysicalBooksSystem: () => Promise<void>;
export declare const createRequest: (request: PhysicalBookRequest) => Promise<number>;
export declare const getRequestById: (id: number) => Promise<PhysicalBookRequest | undefined>;
export declare const getUserRequests: (userId: number) => Promise<PhysicalBookRequest[]>;
export declare const getRequestsByStatus: (status: RequestStatus) => Promise<PhysicalBookRequest[]>;
export declare const updateRequestStatus: (requestId: number, newStatus: RequestStatus, adminId?: number, reason?: string) => Promise<void>;
export declare const cancelRequest: (requestId: number, userId: number) => Promise<boolean>;
export declare const countRequests: (status: RequestStatus) => Promise<number>;
export declare const addPhysicalBook: (book: PhysicalBook) => Promise<number>;
export declare const getAvailableBooks: () => Promise<PhysicalBook[]>;
export declare const isBookAvailable: (bookId: number) => Promise<boolean>;
export declare const createLoan: (loan: BookLoan) => Promise<number>;
export declare const returnBook: (loanId: number) => Promise<void>;
export declare const getUserLoans: (userId: number) => Promise<BookLoan[]>;
export declare const getOverdueLoans: () => Promise<BookLoan[]>;
export declare const getRequestHistory: (requestId: number) => Promise<RequestHistory[]>;
//# sourceMappingURL=physicalBooks.d.ts.map