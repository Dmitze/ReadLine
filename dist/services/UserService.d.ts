import { UserRepository } from '../repositories/UserRepository';
import { Result } from '../core/Result';
export interface CreateUserInput {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language?: string;
}
export interface UpdateUserInput {
    username?: string;
    first_name?: string;
    last_name?: string;
    language?: string;
    is_admin?: boolean;
}
export declare class UserService {
    private userRepository;
    constructor(userRepository: UserRepository);
    getOrCreateUser(telegramId: number, input?: CreateUserInput): Promise<Result<any>>;
    getUserById(userId: number): Promise<Result<any>>;
    getUserByTelegramId(telegramId: number): Promise<Result<any>>;
    updateUser(userId: number, input: UpdateUserInput): Promise<Result<void>>;
    promoteToAdmin(userId: number): Promise<Result<void>>;
    revokeAdmin(userId: number): Promise<Result<void>>;
    getAllAdmins(): Promise<Result<any[]>>;
    getUserCount(): Promise<Result<number>>;
    getUserLanguage(userId: number): Promise<Result<string>>;
    setUserLanguage(userId: number, language: string): Promise<Result<void>>;
}
//# sourceMappingURL=UserService.d.ts.map