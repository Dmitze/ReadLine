import { BaseRepository } from '../repositories/BaseRepository';
import { ILogger } from '../core/types';
import { Result, ok, err, asyncResult } from '../core/Result';

export abstract class BaseService {
  protected constructor(protected logger: ILogger) {}

  protected async executeAsync<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<Result<T>> {
    try {
      this.logger.debug(`[${this.constructor.name}] Starting: ${operationName}`);
      const result = await asyncResult(operation);

      if (result.isOk()) {
        this.logger.debug(`[${this.constructor.name}] Completed: ${operationName}`);
      } else {
        this.logger.warn(`[${this.constructor.name}] Failed: ${operationName}`, result.error);
      }

      return result;
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[${this.constructor.name}] Error in ${operationName}`, e);
      return err(e);
    }
  }

  protected executeSync<T>(operation: () => T, operationName: string): Result<T> {
    try {
      this.logger.debug(`[${this.constructor.name}] Starting: ${operationName}`);
      const result = operation();
      this.logger.debug(`[${this.constructor.name}] Completed: ${operationName}`);
      return ok(result);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[${this.constructor.name}] Error in ${operationName}`, e);
      return err(e);
    }
  }

  protected validate<T extends Record<string, any>>(
    data: T,
    rules: Record<keyof T, (value: any) => string | null>
  ): Result<null, Record<string, string>> {
    const errors: Record<string, string> = {};

    for (const [field, validator] of Object.entries(rules)) {
      const error = validator(data[field as keyof T]);
      if (error) {
        errors[field] = error;
      }
    }

    if (Object.keys(errors).length > 0) {
      return err(errors);
    }

    return ok(null);
  }
}
