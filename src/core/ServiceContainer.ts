import { IServiceContainer } from './types';
import { logger } from '../utils/logger';

interface ServiceDefinition {
  factory: () => Promise<any> | any;
  lifetime: 'singleton' | 'transient';
  instance?: any;
  isInitialized?: boolean;
}

export class ServiceContainer implements IServiceContainer {
  private services: Map<string, ServiceDefinition> = new Map();
  private initializationInProgress: Map<string, Promise<any>> = new Map();

  registerSingleton<T>(key: string, factory: () => Promise<T> | T): void {
    if (this.services.has(key)) {
      logger.warn(`Service ${key} is already registered, overwriting`);
    }

    this.services.set(key, {
      factory,
      lifetime: 'singleton',
      isInitialized: false,
    });

    logger.debug(`Registered singleton service: ${key}`);
  }

  registerTransient<T>(key: string, factory: () => Promise<T> | T): void {
    if (this.services.has(key)) {
      logger.warn(`Service ${key} is already registered, overwriting`);
    }

    this.services.set(key, {
      factory,
      lifetime: 'transient',
    });

    logger.debug(`Registered transient service: ${key}`);
  }

  async resolve<T>(key: string): Promise<T> {
    const definition = this.services.get(key);

    if (!definition) {
      throw new Error(`Service ${key} is not registered in the container`);
    }

    if (definition.lifetime === 'transient') {
      return this.createInstance<T>(key, definition);
    }

    if (definition.isInitialized && definition.instance !== undefined) {
      return definition.instance as T;
    }

    if (this.initializationInProgress.has(key)) {
      return this.initializationInProgress.get(key)!;
    }

    const initPromise = this.createInstance<T>(key, definition);
    this.initializationInProgress.set(key, initPromise);

    try {
      const instance = await initPromise;
      definition.instance = instance;
      definition.isInitialized = true;
      return instance;
    } finally {
      this.initializationInProgress.delete(key);
    }
  }

  resolveSync<T>(key: string): T {
    const definition = this.services.get(key);

    if (!definition) {
      throw new Error(`Service ${key} is not registered in the container`);
    }

    if (definition.lifetime === 'transient') {
      throw new Error(
        `Cannot resolve transient service ${key} synchronously. Use resolve() instead.`
      );
    }

    if (!definition.isInitialized || definition.instance === undefined) {
      throw new Error(`Service ${key} is not initialized. Use resolve() first.`);
    }

    return definition.instance as T;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  clear(): void {
    for (const definition of this.services.values()) {
      if (definition.instance && typeof definition.instance.dispose === 'function') {
        definition.instance.dispose().catch((err: unknown) => {
          logger.error(
            'Error disposing service',
            err instanceof Error ? err : new Error(String(err))
          );
        });
      }
    }

    this.services.clear();
    this.initializationInProgress.clear();
    logger.info('Service container cleared');
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  getStats() {
    const services = Array.from(this.services.entries()).map(([key, def]) => ({
      key,
      lifetime: def.lifetime,
      initialized: def.isInitialized,
    }));

    return {
      totalServices: this.services.size,
      services,
    };
  }

  async getBookService(): Promise<any> {
    return this.resolve('bookService');
  }

  private async createInstance<T>(key: string, definition: ServiceDefinition): Promise<T> {
    try {
      const result = definition.factory();

      if (result instanceof Promise) {
        return await result;
      }

      return result as T;
    } catch (error) {
      logger.error(
        `Error creating service instance for ${key}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}

export const globalContainer = new ServiceContainer();

export async function initializeContainer(): Promise<void> {
  logger.info('Initializing service container');

  try {
    globalContainer.registerSingleton('logger', () => {
      const { logger: loggerInstance } = require('../utils/logger');
      return loggerInstance;
    });

    globalContainer.registerSingleton('database', async () => {
      const { initDatabase } = await import('../database/models');
      return initDatabase();
    });

    globalContainer.registerSingleton('cache', () => {
      const { cache } = require('../utils/cache');
      return cache;
    });

    globalContainer.registerSingleton('config', () => {
      return {
        get: (key: string) => process.env[key],
        set: (key: string, value: any) => {
          process.env[key] = value;
        },
        getAll: () => process.env,
      };
    });

    logger.info('Service container initialized successfully');
    const stats = globalContainer.getStats();
    logger.debug(`Container stats: ${JSON.stringify(stats)}`);
  } catch (error) {
    logger.error(
      'Failed to initialize service container',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
