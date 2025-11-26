import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
import { SavedBook } from '../database/models';
export declare class SavedBookRepository extends BaseRepository<SavedBook> {
    constructor(db: DatabaseWrapper);
    save(userId: number, bookId: number): Promise<number>;
    getByUserId(userId: number): Promise<SavedBook[]>;
    remove(userId: number, bookId: number): Promise<number>;
    isSaved(userId: number, bookId: number): Promise<boolean>;
    getCountByUserId(userId: number): Promise<number>;
    clearByUserId(userId: number): Promise<number>;
    private getBySavedId;
    getMostSaved(limit?: number): Promise<Array<{
        bookId: number;
        saveCount: number;
    }>>;
    findByUserId(userId: number): Promise<SavedBook[]>;
    deleteByBookId(bookId: number): Promise<number>;
}
//# sourceMappingURL=SavedBookRepository.d.ts.map