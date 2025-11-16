# Dependency Injection Guide

## Overview
This project uses a custom Service Container for dependency injection (DI). This guide explains how to use it effectively.

## Core Components

### 1. ServiceContainer
Located in `src/core/ServiceContainer.ts`

**Features:**
- ✅ Singleton and transient lifetimes
- ✅ Lazy initialization
- ✅ Async factory support
- ✅ Circular dependency detection
- ✅ Service statistics

### 2. ContainerBootstrap
Located in `src/core/ContainerBootstrap.ts`

Central place for registering all services, repositories, and utilities.

## Quick Start

### Get Container Instance

```typescript
import { getContainer } from './core/ContainerBootstrap';

const container = getContainer();
```

### Resolve a Service

```typescript
// Async resolution (preferred)
const bookService = await container.resolve<BookService>('BookService');

// Sync resolution (only for already initialized singletons)
const bookService = container.resolveSync<BookService>('BookService');
```

## Registration Patterns

### Singleton Service

Service is created once and reused:

```typescript
container.registerSingleton('BookService', () => {
  return new BookService(
    container.resolveSync('BookRepository'),
    container.resolveSync('ReviewRepository')
  );
});
```

### Transient Service

New instance created each time:

```typescript
container.registerTransient('EmailService', () => {
  return new EmailService(config);
});
```

### Async Factory

For services requiring async initialization:

```typescript
container.registerSingleton('Database', async () => {
  const db = await connectToDatabase();
  await db.migrate();
  return db;
});
```

## Usage in Handlers

### Before (Direct Dependencies)

```typescript
// ❌ BAD - Direct imports create tight coupling
import { getBook } from '../database/models';
import { cache } from '../utils/cache';

async function handleGetBook(ctx) {
  const book = await getBook(bookId);
  await cache.set(`book:${bookId}`, book);
  await ctx.reply(book.title);
}
```

### After (Dependency Injection)

```typescript
// ✅ GOOD - Dependencies injected
import { getContainer } from '../core/ContainerBootstrap';

async function handleGetBook(ctx) {
  const container = getContainer();
  const bookService = await container.resolve<BookService>('BookService');
  const cache = container.resolveSync('cache');
  
  const result = await bookService.getById(bookId);
  
  if (result.isOk() && result.value) {
    await cache.set(`book:${bookId}`, result.value);
    await ctx.reply(result.value.title);
  }
}
```

## Usage in Scenes

### Scene with DI

```typescript
import { Scenes } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { getContainer } from '../core/ContainerBootstrap';

const bookScene = new Scenes.BaseScene<BotContext>('book');

bookScene.enter(async (ctx) => {
  const container = getContainer();
  const bookService = await container.resolve<BookService>('BookService');
  
  const result = await bookService.getPopular(10);
  
  if (result.isOk()) {
    const books = result.value;
    await ctx.reply(`Found ${books.length} popular books`);
  }
});

export default bookScene;
```

## Registered Services

### Core Services
- `logger` - Winston logger
- `config` - Environment configuration
- `database` - SQLite database connection
- `DatabaseWrapper` - Database utility wrapper
- `TransactionManager` - Transaction management
- `cache` - Redis/memory cache

### Repositories
- `BookRepository` - Book data access
- `UserRepository` - User data access
- `ReviewRepository` - Review data access
- `SavedBookRepository` - Saved books
- `TagRepository` - Tags management
- `PromoCodeRepository` - Promo codes
- `AudioRepository` - Audio books

### Services
- `BookService` - Book business logic

## Best Practices

### ✅ DO: Use Constructor Injection

```typescript
export class BookService {
  constructor(
    private bookRepository: BookRepository,
    private reviewRepository: ReviewRepository
  ) {}
  
  async getTopRated() {
    return this.bookRepository.findTopRated();
  }
}
```

### ✅ DO: Register in Bootstrap

Register all services in one place:

```typescript
// src/core/ContainerBootstrap.ts
export async function bootstrapContainer(container: ServiceContainer) {
  container.registerSingleton('BookService', () => {
    return new BookService(
      container.resolveSync('BookRepository'),
      container.resolveSync('ReviewRepository')
    );
  });
}
```

### ✅ DO: Resolve at Usage Point

```typescript
async function handleCommand(ctx) {
  const container = getContainer();
  const service = await container.resolve('BookService');
  await service.doSomething();
}
```

### ❌ DON'T: Resolve in Module Scope

```typescript
// ❌ BAD - Resolved at import time
import { getContainer } from './core/ContainerBootstrap';
const bookService = await getContainer().resolve('BookService');

export async function handleCommand(ctx) {
  await bookService.doSomething(); // Service may not be initialized!
}
```

### ❌ DON'T: Mix DI and Direct Imports

```typescript
// ❌ BAD - Mixing patterns
import { getBook } from '../database/models';  // Direct import
const bookService = await container.resolve('BookService'); // DI

// ✅ GOOD - Consistent DI
const bookService = await container.resolve('BookService');
const book = await bookService.getById(id);
```

## Testing with DI

### Mock Services in Tests

```typescript
import { ServiceContainer } from '../core/ServiceContainer';

describe('BookHandler', () => {
  let container: ServiceContainer;
  let mockBookService: jest.Mocked<BookService>;

  beforeEach(() => {
    container = new ServiceContainer();
    
    mockBookService = {
      getById: jest.fn(),
      getPopular: jest.fn()
    } as any;

    container.registerSingleton('BookService', () => mockBookService);
  });

  it('should get book by id', async () => {
    mockBookService.getById.mockResolvedValue(
      new Ok({ id: 1, title: 'Test Book' })
    );

    const service = await container.resolve('BookService');
    const result = await service.getById(1);

    expect(result.isOk()).toBe(true);
  });
});
```

## Advanced Patterns

### Factory Pattern

```typescript
container.registerSingleton('EmailServiceFactory', () => {
  return {
    create: (type: 'smtp' | 'sendgrid') => {
      if (type === 'smtp') {
        return new SmtpEmailService();
      }
      return new SendgridEmailService();
    }
  };
});
```

### Decorator Pattern

```typescript
container.registerSingleton('CachedBookService', () => {
  const bookService = container.resolveSync('BookService');
  const cache = container.resolveSync('cache');
  
  return new CachedBookService(bookService, cache);
});
```

### Lifecycle Management

```typescript
class DatabaseService {
  async dispose() {
    await this.connection.close();
  }
}

// Container automatically calls dispose() on clear()
container.registerSingleton('Database', () => new DatabaseService());
```

## Migration Strategy

### Step 1: Identify Dependencies
Find all places where services are directly imported:
```bash
grep -r "import.*from.*database/models" src/
```

### Step 2: Register Services
Add to `ContainerBootstrap.ts`:
```typescript
container.registerSingleton('BookService', () => new BookService());
```

### Step 3: Update Consumers
Replace direct imports with DI:
```typescript
// Before
import { getBook } from '../database/models';

// After  
const container = getContainer();
const bookService = await container.resolve('BookService');
```

### Step 4: Test
Run tests to ensure nothing broke:
```bash
npm test
```

## Troubleshooting

### Service Not Found
```
Error: Service BookService is not registered in the container
```
**Solution:** Register the service in `ContainerBootstrap.ts`

### Circular Dependencies
```
Error: Circular dependency detected
```
**Solution:** Use lazy resolution or refactor dependencies

### Sync Resolution of Uninitialized Service
```
Error: Service is not initialized. Use resolve() first.
```
**Solution:** Use async `resolve()` or initialize service earlier

## Container Statistics

Get container info for debugging:

```typescript
const stats = container.getStats();
console.log(stats);
// {
//   totalServices: 15,
//   services: [
//     { key: 'BookService', lifetime: 'singleton', initialized: true },
//     ...
//   ]
// }
```

## References

- [Service Container Implementation](../src/core/ServiceContainer.ts)
- [Bootstrap Configuration](../src/core/ContainerBootstrap.ts)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

---
**Last Updated:** 2025-11-16  
**Version:** 1.0.0
