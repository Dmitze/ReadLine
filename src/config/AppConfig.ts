import { getEnv } from './envSchema';

export interface AppConfig {
  bot: {
    token: string;
    webhook?: string;
    polling: boolean;
  };

  database: {
    path: string;
    sqlite?: {
      memory?: boolean;
    };
  };

  ai: {
    enabled: boolean;
    provider?: 'openai' | 'anthropic';
    apiKey?: string;
    timeout?: number;
  };

  storage: {
    uploadsDir: string;
    maxFileSize: number;
    allowedMimeTypes: string[];
  };

  server: {
    port: number;
    host: string;
  };

  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    file?: string;
  };

  features: {
    audioBooks: boolean;
    aiAssistant: boolean;
    recommendations: boolean;
    reviews: boolean;
    promoCode: boolean;
  };

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

  private loadConfig(): AppConfig {
    const env = getEnv();
    return {
      bot: {
        token: env.BOT_TOKEN,
        webhook: undefined,
        polling: true,
      },
      database: {
        path: env.DB_PATH,
        sqlite: {
          memory: false,
        },
      },
      ai: {
        enabled: !!env.GEMINI_API_KEY,
        provider: env.AI_PROVIDER as 'openai' | 'anthropic',
        apiKey: env.GEMINI_API_KEY,
        timeout: 30000,
      },
      storage: {
        uploadsDir: './uploads',
        maxFileSize: 52428800,
        allowedMimeTypes: ['application/pdf', 'audio/mpeg', 'audio/wav'],
      },
      server: {
        port: env.PORT,
        host: '0.0.0.0',
      },
      logging: {
        level: env.LOG_LEVEL,
        format: 'text',
        file: undefined,
      },
      features: {
        audioBooks: true,
        aiAssistant: true,
        recommendations: true,
        reviews: true,
        promoCode: true,
      },
      limits: {
        booksPerPage: 20,
        maxTags: 10,
        maxGenres: 5,
        sessionTimeout: 3600000,
        rateLimitPerMinute: 30,
      },
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  validate(): boolean {
    if (!this.config.bot.token) {
      throw new Error('BOT_TOKEN is required');
    }

    if (!this.config.database.path && !this.config.database.sqlite?.memory) {
      throw new Error('DB_PATH or DB_MEMORY is required');
    }

    return true;
  }

  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  getLimit(limit: keyof AppConfig['limits']): number {
    return this.config.limits[limit];
  }
}

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
