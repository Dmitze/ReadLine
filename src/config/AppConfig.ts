/**
 * Application Configuration
 * REFACTOR-018: Configuration Management
 * Uses Zod-validated environment variables
 */

import { getEnv } from './envSchema';

export interface AppConfig {
  // Bot
  bot: {
    token: string;
    webhook?: string;
    polling: boolean;
  };
  
  // Database
  database: {
    path: string;
    sqlite?: {
      memory?: boolean;
    };
  };
  
  // AI/API
  ai: {
    enabled: boolean;
    provider?: 'openai' | 'anthropic';
    apiKey?: string;
    timeout?: number;
  };
  
  // File Storage
  storage: {
    uploadsDir: string;
    maxFileSize: number; // bytes
    allowedMimeTypes: string[];
  };
  
  // Server
  server: {
    port: number;
    host: string;
  };
  
  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    file?: string;
  };
  
  // Feature Flags
  features: {
    audioBooks: boolean;
    aiAssistant: boolean;
    recommendations: boolean;
    reviews: boolean;
    promoCode: boolean;
  };
  
  // Limits
  limits: {
    booksPerPage: number;
    maxTags: number;
    maxGenres: number;
    sessionTimeout: number;
    rateLimitPerMinute: number;
  };
}

export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Завантажити конфіг зі змінних оточення
   * Uses validated env from envSchema
   */
  private loadConfig(): AppConfig {
    const env = getEnv();
    return {
      bot: {
        token: env.BOT_TOKEN,
        webhook: undefined,
        polling: true
      },
      database: {
        path: env.DB_PATH,
        sqlite: {
          memory: false
        }
      },
      ai: {
        enabled: !!env.GEMINI_API_KEY,
        provider: env.AI_PROVIDER as 'openai' | 'anthropic',
        apiKey: env.GEMINI_API_KEY,
        timeout: 30000
      },
      storage: {
        uploadsDir: './uploads',
        maxFileSize: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf', 'audio/mpeg', 'audio/wav']
      },
      server: {
        port: env.PORT,
        host: '0.0.0.0'
      },
      logging: {
        level: env.LOG_LEVEL,
        format: 'text',
        file: undefined
      },
      features: {
        audioBooks: true,
        aiAssistant: true,
        recommendations: true,
        reviews: true,
        promoCode: true
      },
      limits: {
        booksPerPage: 20,
        maxTags: 10,
        maxGenres: 5,
        sessionTimeout: 3600000,
        rateLimitPerMinute: 30
      }
    };
  }

  /**
   * Отримати конфіг
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * Отримати конкретну секцію конфігу
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Перевірити конфіг
   */
  validate(): boolean {
    if (!this.config.bot.token) {
      throw new Error('BOT_TOKEN is required');
    }

    if (!this.config.database.path && !this.config.database.sqlite?.memory) {
      throw new Error('DB_PATH or DB_MEMORY is required');
    }

    return true;
  }

  /**
   * Чи включена функція
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Отримати ліміт
   */
  getLimit(limit: keyof AppConfig['limits']): number {
    return this.config.limits[limit];
  }
}

// Singleton instance
let configInstance: ConfigManager | null = null;

export function getConfig(): ConfigManager {
  if (!configInstance) {
    configInstance = new ConfigManager();
    configInstance.validate();
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}
