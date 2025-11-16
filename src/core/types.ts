/**
 * Core type definitions for the application
 * REFACTOR-001: Dependency Injection System
 */

/**
 * Generic result type for error handling
 * Replaces try-catch blocks with type-safe Result pattern
 */
export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

/**
 * Service container interface
 * All application services are registered and resolved through this container
 */
export interface IServiceContainer {
  /**
   * Register a singleton service
   * @param key Service identifier
   * @param factory Function that creates the service instance
   */
  registerSingleton<T>(key: string, factory: () => Promise<T> | T): void;

  /**
   * Register a transient service (new instance each time)
   * @param key Service identifier
   * @param factory Function that creates the service instance
   */
  registerTransient<T>(key: string, factory: () => Promise<T> | T): void;

  /**
   * Resolve a service by key
   * @param key Service identifier
   * @returns Service instance
   */
  resolve<T>(key: string): Promise<T>;

  /**
   * Resolve a service synchronously (for singletons only)
   * @param key Service identifier
   * @returns Service instance
   */
  resolveSync<T>(key: string): T;

  /**
   * Check if a service is registered
   * @param key Service identifier
   */
  has(key: string): boolean;

  /**
   * Clear all registered services
   */
  clear(): void;
}

/**
 * Logger service interface
 */
export interface ILogger {
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
  userAction(userId: number, action: string, metadata?: Record<string, any>): void;
}

/**
 * Database service interface
 */
export interface IDatabase {
  get<T>(query: string, params?: any[]): Promise<T | undefined>;
  all<T>(query: string, params?: any[]): Promise<T[]>;
  run(query: string, params?: any[]): Promise<{ lastID: number; changes: number }>;
  insert(query: string, params?: any[]): Promise<number>;
  update(query: string, params?: any[]): Promise<number>;
  delete(query: string, params?: any[]): Promise<number>;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
  exists(query: string, params?: any[]): Promise<boolean>;
  count(table: string, where?: string, params?: any[]): Promise<number>;
}

/**
 * Cache service interface
 */
export interface ICache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  getStats(): { size: number; hits: number; misses: number };
}

/**
 * AI service interface
 */
export interface IAIService {
  generateRecommendation(userId: number, context: string): Promise<string>;
  analyzeBookGenre(bookTitle: string, author: string): Promise<string>;
  generateChatResponse(userId: number, message: string): Promise<string>;
}

/**
 * Service identifiers (constants for dependency injection)
 */
export const ServiceKeys = {
  LOGGER: 'logger',
  DATABASE: 'database',
  CACHE: 'cache',
  AI_SERVICE: 'aiService',
  CONFIG: 'config',
} as const;

/**
 * Configuration service interface
 */
export interface IConfig {
  get(key: string): any;
  set(key: string, value: any): void;
  getAll(): Record<string, any>;
}
