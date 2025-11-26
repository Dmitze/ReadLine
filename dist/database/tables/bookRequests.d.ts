export declare enum BookRequestStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    ISSUED = "issued",
    RETURNED = "returned",
    OVERDUE = "overdue"
}
export declare enum BookRequestPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export interface BookRequest {
    id?: number;
    user_id: number;
    book_title: string;
    book_author: string;
    book_genre?: string;
    status: BookRequestStatus;
    priority: BookRequestPriority;
    comment?: string;
    admin_comment?: string;
    issued_at?: string;
    due_date?: string;
    returned_at?: string;
    created_at?: string;
    updated_at?: string;
    reviewed_by?: number;
    reviewed_at?: string;
}
export interface BookRequestStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    issued: number;
    returned: number;
    overdue: number;
}
export declare const createBookRequestsTable: () => Promise<void>;
export declare const createBookRequest: (request: Omit<BookRequest, "id" | "created_at" | "updated_at">) => Promise<number>;
export declare const getBookRequestById: (requestId: number) => Promise<BookRequest | undefined>;
export declare const getUserBookRequests: (userId: number) => Promise<BookRequest[]>;
export declare const getBookRequestsByStatus: (status: BookRequestStatus) => Promise<BookRequest[]>;
export declare const getAllBookRequests: (limit?: number) => Promise<BookRequest[]>;
export declare const updateBookRequestStatus: (requestId: number, status: BookRequestStatus, adminId?: number, adminComment?: string) => Promise<void>;
export declare const issueBook: (requestId: number, daysToReturn: number, adminId: number) => Promise<void>;
export declare const returnBook: (requestId: number) => Promise<void>;
export declare const getBookRequestsStats: () => Promise<BookRequestStats>;
export declare const getOverdueRequests: () => Promise<BookRequest[]>;
export declare const markOverdueRequests: () => Promise<number>;
export declare const deleteBookRequest: (requestId: number) => Promise<void>;
//# sourceMappingURL=bookRequests.d.ts.map