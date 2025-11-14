/**
 * BaseService - Abstract base class for all application services
 * 
 * Provides common functionality for business logic services:
 * - Access to repositories
 * - Logging capabilities
 * - Caching support
 * - Error handling with Result pattern
 */

import { BaseRepository } from '../repositories/BaseRepository';
import { ILogger } from '../core/types';
import { Result, ok, err, asyncResult } from '../core/Result';

/**
 * Abstract base service class
 * All domain services should extend this class
 */
export abstract class BaseService {
  /**
   * Create a new service instance
   * @param logger - Logger instance for logging operations
   */
  protected constructor(protected logger: ILogger) {}

  /**
   * Wrap an async operation with Result pattern and logging
   * @param operation - Async operation to execute
   * @param operationName - Name of operation for logging
   * @returns Result containing the operation result or error
   */
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
        this.logger.warn(
          `[${this.constructor.name}] Failed: ${operationName}`,
          result.error
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] Error in ${operationName}`, error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute a sync operation with Result pattern and logging
   * @param operation - Sync operation to execute
   * @param operationName - Name of operation for logging
   * @returns Result containing the operation result or error
   */
  protected executeSync<T>(
    operation: () => T,
    operationName: string
  ): Result<T> {
    try {
      this.logger.debug(`[${this.constructor.name}] Starting: ${operationName}`);
      const result = operation();
      this.logger.debug(`[${this.constructor.name}] Completed: ${operationName}`);
      return ok(result);
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] Error in ${operationName}`, error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate input data
   * @param data - Data to validate
   * @param rules - Validation rules
   * @returns Result with validation errors or ok
   */
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
