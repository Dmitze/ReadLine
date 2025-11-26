import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
export interface User {
    id?: number;
    user_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    is_admin?: boolean;
    is_new?: boolean;
    created_at?: string;
    last_seen?: string;
}
export declare class UserRepository extends BaseRepository<User> {
    constructor(db: DatabaseWrapper);
    create(userData: Omit<User, 'id' | 'created_at' | 'last_seen'>): Promise<number>;
    getByTelegramId(userId: number): Promise<User | undefined>;
    update(userId: number, updates: Partial<Omit<User, 'id' | 'user_id' | 'created_at'>>): Promise<number>;
    isNew(userId: number): Promise<boolean>;
    markAsNotNew(userId: number): Promise<number>;
    updateLastSeen(userId: number): Promise<number>;
    getAllAdmins(): Promise<User[]>;
    getTotalCount(): Promise<number>;
    getActiveCount(daysBack?: number): Promise<number>;
    getNewSince(date: Date): Promise<User[]>;
    search(searchTerm: string, limit?: number): Promise<User[]>;
    findByTelegramId(userId: number): Promise<User | undefined>;
    findAdmins(): Promise<User[]>;
}
//# sourceMappingURL=UserRepository.d.ts.map