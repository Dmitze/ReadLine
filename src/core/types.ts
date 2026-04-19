export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

export interface IServiceContainer {
  registerSingleton<T>(key: string, factory: () => Promise<T> | T): void;

  registerTransient<T>(key: string, factory: () => Promise<T> | T): void;

  resolve<T>(key: string): Promise<T>;

  resolveSync<T>(key: string): T;

  has(key: string): boolean;

  clear(): void;
}

export interface ILogger {
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
  userAction(userId: number, action: string, metadata?: Record<string, any>): void;
}

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

export interface ICache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  getStats(): { size: number; hits: number; misses: number };
}

export interface IAIService {
  generateRecommendation(userId: number, context: string): Promise<string>;
  analyzeBookGenre(bookTitle: string, author: string): Promise<string>;
  generateChatResponse(userId: number, message: string): Promise<string>;
}

export const ServiceKeys = {
  LOGGER: 'logger',
  DATABASE: 'database',
  CACHE: 'cache',
  AI_SERVICE: 'aiService',
  CONFIG: 'config',
} as const;

export interface IConfig {
  get(key: string): any;
  set(key: string, value: any): void;
  getAll(): Record<string, any>;
}
