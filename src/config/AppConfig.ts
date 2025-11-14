/**
 * Application Configuration
 * REFACTOR-018: Configuration Management
 */

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

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.config = this.loadConfig(env);
  }

  /**
   * Завантажити конфіг зі змінних оточення
   */
  private loadConfig(env: NodeJS.ProcessEnv): AppConfig {
    return {
      bot: {
        token: env.BOT_TOKEN || '',
        webhook: env.BOT_WEBHOOK,
        polling: env.BOT_POLLING !== 'false'
      },
      database: {
        path: env.DB_PATH || './database.sqlite',
        sqlite: {
          memory: env.DB_MEMORY === 'true'
        }
      },
      ai: {
        enabled: env.AI_ENABLED === 'true',
        provider: (env.AI_PROVIDER as any) || 'openai',
        apiKey: env.AI_API_KEY,
        timeout: parseInt(env.AI_TIMEOUT || '30000')
      },
      storage: {
        uploadsDir: env.UPLOADS_DIR || './uploads',
        maxFileSize: parseInt(env.MAX_FILE_SIZE || '52428800'), // 50MB
        allowedMimeTypes: (env.ALLOWED_MIME_TYPES || 'application/pdf,audio/mpeg,audio/wav').split(',')
      },
      server: {
        port: parseInt(env.SERVER_PORT || '3000'),
        host: env.SERVER_HOST || '0.0.0.0'
      },
      logging: {
        level: (env.LOG_LEVEL as any) || 'info',
        format: (env.LOG_FORMAT as any) || 'text',
        file: env.LOG_FILE
      },
      features: {
        audioBooks: env.FEATURE_AUDIO_BOOKS !== 'false',
        aiAssistant: env.FEATURE_AI_ASSISTANT !== 'false',
        recommendations: env.FEATURE_RECOMMENDATIONS !== 'false',
        reviews: env.FEATURE_REVIEWS !== 'false',
        promoCode: env.FEATURE_PROMO_CODE !== 'false'
      },
      limits: {
        booksPerPage: parseInt(env.BOOKS_PER_PAGE || '20'),
        maxTags: parseInt(env.MAX_TAGS || '10'),
        maxGenres: parseInt(env.MAX_GENRES || '5'),
        sessionTimeout: parseInt(env.SESSION_TIMEOUT || '3600000'),
        rateLimitPerMinute: parseInt(env.RATE_LIMIT_PER_MINUTE || '30')
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
