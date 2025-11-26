import { BaseRepository } from './BaseRepository';
export interface Tag {
    id?: number;
    name: string;
    created_at?: string;
}
export interface BookTag {
    book_id: number;
    tag_id: number;
    created_at?: string;
}
export declare class TagRepository extends BaseRepository<Tag> {
    constructor(db: any);
    getAllTags(): Promise<Tag[]>;
    createTag(name: string): Promise<number>;
    getTagById(tagId: number): Promise<Tag | null>;
    getTagByName(name: string): Promise<Tag | null>;
    updateTag(tagId: number, updates: Partial<Tag>): Promise<number>;
    deleteTag(tagId: number): Promise<number>;
    getBookTags(bookId: number): Promise<Tag[]>;
    getBooksTagsBatch(bookIds: number[]): Promise<Map<number, Tag[]>>;
    addBookTag(bookId: number, tagId: number): Promise<void>;
    addBookTags(bookId: number, tagIds: number[]): Promise<void>;
    removeBookTag(bookId: number, tagId: number): Promise<void>;
    clearBookTags(bookId: number): Promise<void>;
    searchBooksByTag(tagName: string, limit?: number): Promise<Array<any>>;
    getPopularTags(limit?: number): Promise<Array<Tag & {
        count: number;
    }>>;
    getTagStats(tagId: number): Promise<{
        tagId: number;
        bookCount: number;
        lastUsed?: string;
    }>;
    hasBookTag(bookId: number, tagId: number): Promise<boolean>;
    getUnusedTags(): Promise<Tag[]>;
    getBooksByTag(tagId: number, limit?: number): Promise<Array<any>>;
    mergeTags(sourceTagId: number, targetTagId: number): Promise<void>;
    getTagCount(): Promise<number>;
    getOrCreateTag(name: string): Promise<number>;
    findByBookId(bookId: number): Promise<Tag[]>;
    addTagToBook(bookId: number, tagId: number): Promise<void>;
    deleteByBookId(bookId: number): Promise<number>;
}
//# sourceMappingURL=TagRepository.d.ts.map