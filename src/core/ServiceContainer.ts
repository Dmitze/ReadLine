/**
 * Service Container Implementation
 * REFACTOR-001: Dependency Injection System
 * 
 * This is the core dependency injection container that manages all services
 * in the application. It supports both singleton and transient lifetimes.
 */

import { IServiceContainer } from './types';
import { logger } from '../utils/logger';

interface ServiceDefinition {
  factory: () => Promise<any> | any;
  lifetime: 'singleton' | 'transient';
  instance?: any;
  isInitialized?: boolean;
}

/**
 * Service Container Implementation
 * 
 * Features:
 * - Singleton and transient service registration
 * - Lazy initialization (services created on first use)
 * - Async factory support
 * - Service dependency tracking
 */
export class ServiceContainer implements IServiceContainer {
  private services: Map<string, ServiceDefinition> = new Map();
  private initializationInProgress: Map<string, Promise<any>> = new Map();

  /**
   * Register a singleton service
   * The service will be created once and reused
   */
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

  /**
   * Register a transient service
   * A new instance will be created each time it's requested
   */
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

  /**
   * Resolve a service asynchronously
   * Works for both singleton and transient services
   */
  async resolve<T>(key: string): Promise<T> {
    const definition = this.services.get(key);

    if (!definition) {
      throw new Error(`Service ${key} is not registered in the container`);
    }

    // For transient services, always create a new instance
    if (definition.lifetime === 'transient') {
      return this.createInstance<T>(key, definition);
    }

    // For singleton services, reuse the instance
    if (definition.isInitialized && definition.instance !== undefined) {
      return definition.instance as T;
    }

    // If initialization is in progress, wait for it
    if (this.initializationInProgress.has(key)) {
      return this.initializationInProgress.get(key)!;
    }

    // Create the instance
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

  /**
   * Resolve a service synchronously
   * Only works for already-initialized singletons
   */
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
      throw new Error(
        `Service ${key} is not initialized. Use resolve() first.`
      );
    }

    return definition.instance as T;
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all services
   */
  clear(): void {
    // Call dispose methods if they exist
    for (const definition of this.services.values()) {
      if (definition.instance && typeof definition.instance.dispose === 'function') {
        definition.instance.dispose().catch((err) => {
          logger.error('Error disposing service', err instanceof Error ? err : new Error(String(err)));
        });
      }
    }

    this.services.clear();
    this.initializationInProgress.clear();
    logger.info('Service container cleared');
  }

  /**
   * Get all registered service keys
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get container statistics
   */
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

  /**
   * Create a service instance
   */
  private async createInstance<T>(
    key: string,
    definition: ServiceDefinition
  ): Promise<T> {
    try {
      const result = definition.factory();

      // Handle async factory
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

/**
 * Global service container instance
 * This is the single entry point for dependency injection
 */
export const globalContainer = new ServiceContainer();

/**
 * Initialize the global container with default services
 * This should be called once at application startup
 */
export async function initializeContainer(): Promise<void> {
  logger.info('Initializing service container');

  try {
    // Register logger first (used by other services)
    globalContainer.registerSingleton('logger', () => {
      const { logger: loggerInstance } = require('../utils/logger');
      return loggerInstance;
    });

    // Register database
    globalContainer.registerSingleton('database', async () => {
      const { initDatabase } = await import('../database/models');
      return initDatabase();
    });

    // Register cache
    globalContainer.registerSingleton('cache', () => {
      const { cache } = require('../utils/cache');
      return cache;
    });

    // Register configuration
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
