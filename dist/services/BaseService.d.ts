import { ILogger } from '../core/types';
import { Result } from '../core/Result';
export declare abstract class BaseService {
    protected logger: ILogger;
    protected constructor(logger: ILogger);
    protected executeAsync<T>(operation: () => Promise<T>, operationName: string): Promise<Result<T>>;
    protected executeSync<T>(operation: () => T, operationName: string): Result<T>;
    protected validate<T extends Record<string, any>>(data: T, rules: Record<keyof T, (value: any) => string | null>): Result<null, Record<string, string>>;
}
//# sourceMappingURL=BaseService.d.ts.map