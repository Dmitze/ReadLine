export interface Tag {
    id: number;
    name: string;
    created_at?: string;
}
export interface BookTag {
    book_id: number;
    tag_id: number;
    created_at?: string;
}
export declare const getAllTags: () => Promise<Tag[]>;
export declare const addTag: (name: string) => Promise<number>;
export declare const getBookTags: (bookId: number) => Promise<Tag[]>;
export declare const getBooksTagsBatch: (bookIds: number[]) => Promise<Map<number, Tag[]>>;
export declare const addBookTag: (bookId: number, tagId: number) => Promise<void>;
export declare const removeBookTag: (bookId: number, tagId: number) => Promise<void>;
export declare const searchBooksByTag: (tagName: string, limit?: number) => Promise<any[]>;
export declare const searchBooksByTagWithPagination: (tagName: string, limit?: number, offset?: number) => Promise<{
    books: any[];
    total: number;
}>;
export declare const getPopularTags: (limit?: number) => Promise<Array<Tag & {
    count: number;
}>>;
//# sourceMappingURL=tagFunctions.d.ts.map