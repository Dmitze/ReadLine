# REFACTOR-020: Comprehensive Testing Strategy

**ID:** REFACTOR-020  
**Status:** 🔄 IN PROGRESS  
**Priority:** 🔴 CRITICAL  
**Start Date:** 14 November 2025  
**Estimated Duration:** 4-6 hours  

---

## 📋 Overview

Complete testing coverage for the refactored ReadLine Bot including:
1. **Unit Tests** - Individual services, repositories, utilities
2. **Integration Tests** - Service + Repository interactions
3. **E2E Tests** - Bot scene workflows
4. **Coverage Goal:** 80%+

---

## 📁 Test Structure

```
src/__tests__/
├── unit/
│   ├── services/
│   │   ├── BookService.test.ts
│   │   ├── UserService.test.ts
│   │   ├── ReviewService.test.ts
│   │   ├── AudioService.test.ts
│   │   └── RecommendationService.test.ts
│   ├── repositories/
│   │   ├── BookRepository.test.ts
│   │   ├── UserRepository.test.ts
│   │   └── ReviewRepository.test.ts
│   ├── utils/
│   │   ├── CircuitBreaker.test.ts
│   │   ├── RetryStrategy.test.ts
│   │   └── ResultHandler.test.ts
│   ├── validation/
│   │   ├── Validator.test.ts
│   │   └── InputSanitizer.test.ts
│   └── cache/
│       └── MultiLayerCache.test.ts
├── integration/
│   ├── BookService.integration.test.ts
│   ├── UserService.integration.test.ts
│   ├── ReviewService.integration.test.ts
│   └── Database.integration.test.ts
├── e2e/
│   ├── searchScene.e2e.test.ts
│   ├── addBookScene.e2e.test.ts
│   ├── profileScene.e2e.test.ts
│   └── adminScenes.e2e.test.ts
├── fixtures/
│   ├── mockDatabase.ts
│   ├── mockContext.ts
│   ├── testData.ts
│   └── factories.ts
└── helpers/
    ├── testUtils.ts
    └── setupTests.ts
```

---

## 🧪 Test Categories

### 1. Unit Tests (45% coverage)

**Services Tests:**
- Input validation
- Error handling (Result pattern)
- Business logic
- Service methods return type

**Repositories Tests:**
- Database queries
- Error handling
- Data transformation
- Caching integration

**Utils Tests:**
- CircuitBreaker state transitions
- RetryStrategy backoff calculation
- ResultHandler success/error flows
- Validation rules

**Validation Tests:**
- Each validation rule
- Sanitization edge cases
- XSS/SQL injection prevention

### 2. Integration Tests (25% coverage)

**Service + Repository:**
- Service calls repository correctly
- Error propagation
- Cache invalidation
- Transaction handling

**Database Tests:**
- Multiple operations in sequence
- Index effectiveness
- Query optimization

### 3. E2E Tests (10% coverage)

**Scene Workflows:**
- User interactions
- Error scenarios
- Happy paths
- State management

---

## 🛠️ Setup & Fixtures

### Mock Database

```typescript
// src/__tests__/fixtures/mockDatabase.ts
export class MockDatabase {
  tables: Map<string, any[]> = new Map();
  
  run(sql: string, params?: any[]): Promise<void>
  get(sql: string, params?: any[]): Promise<any>
  all(sql: string, params?: any[]): Promise<any[]>
}
```

### Mock Context

```typescript
// src/__tests__/fixtures/mockContext.ts
export function createMockContext(overrides?: Partial<BotContext>): BotContext {
  return {
    from: { id: 12345, is_bot: false },
    message: { text: 'test' },
    reply: jest.fn(),
    // ... other properties
  };
}
```

### Test Factories

```typescript
// src/__tests__/fixtures/factories.ts
export const BookFactory = {
  create: (overrides?: Partial<Book>): Book => ({...})
};

export const UserFactory = {
  create: (overrides?: Partial<User>): User => ({...})
};
```

---

## 📝 Unit Test Examples

### BookService Tests

```typescript
// src/__tests__/unit/services/BookService.test.ts
import { BookService } from '../../../services/BookService';
import { BookRepository } from '../../../repositories/BookRepository';
import { ReviewRepository } from '../../../repositories/ReviewRepository';

describe('BookService', () => {
  let service: BookService;
  let bookRepo: jest.Mocked<BookRepository>;
  let reviewRepo: jest.Mocked<ReviewRepository>;

  beforeEach(() => {
    bookRepo = createMockBookRepository();
    reviewRepo = createMockReviewRepository();
    service = new BookService(bookRepo, reviewRepo, savedRepo, logger);
  });

  describe('searchBooks', () => {
    it('should return books matching query', async () => {
      const mockBooks = [{ id: 1, title: 'Test Book' }];
      bookRepo.search.mockResolvedValue(mockBooks);

      const result = await service.searchBooks('Test');
      
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockBooks);
    });

    it('should handle empty results', async () => {
      bookRepo.search.mockResolvedValue([]);

      const result = await service.searchBooks('NonExistent');
      
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([]);
    });

    it('should return error on database failure', async () => {
      const error = new Error('Database error');
      bookRepo.search.mockRejectedValue(error);

      const result = await service.searchBooks('Test');
      
      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('Database error');
    });
  });

  describe('getBookDetails', () => {
    it('should fetch book with reviews', async () => {
      const mockBook = { id: 1, title: 'Test' };
      const mockReviews = [{ id: 1, rating: 5 }];
      
      bookRepo.getById.mockResolvedValue(mockBook);
      reviewRepo.getByBookId.mockResolvedValue(mockReviews);

      const result = await service.getBookDetails(1);
      
      expect(result.isOk()).toBe(true);
      const book = result.unwrap();
      expect(book.reviews).toEqual(mockReviews);
    });

    it('should return error if book not found', async () => {
      bookRepo.getById.mockResolvedValue(null);

      const result = await service.getBookDetails(999);
      
      expect(result.isErr()).toBe(true);
    });
  });
});
```

### Validator Tests

```typescript
// src/__tests__/unit/validation/Validator.test.ts
import { Validator } from '../../../validation/Validator';

describe('Validator', () => {
  const validator = new Validator();

  describe('required rule', () => {
    it('should pass for non-empty string', () => {
      const result = validator.required('hello');
      expect(result).toBeNull(); // No error
    });

    it('should fail for empty string', () => {
      const result = validator.required('');
      expect(result).toBeDefined();
      expect(result?.message).toContain('required');
    });
  });

  describe('email rule', () => {
    it('should validate correct email', () => {
      const result = validator.email('test@example.com');
      expect(result).toBeNull();
    });

    it('should reject invalid email', () => {
      const result = validator.email('invalid-email');
      expect(result).toBeDefined();
    });
  });

  describe('min rule', () => {
    it('should validate string length', () => {
      const result = validator.min('hello', 3);
      expect(result).toBeNull();
    });

    it('should reject string too short', () => {
      const result = validator.min('hi', 3);
      expect(result).toBeDefined();
    });
  });
});
```

---

## 🔗 Integration Test Examples

### BookService Integration

```typescript
// src/__tests__/integration/BookService.integration.test.ts
import { BookService } from '../../../services/BookService';
import { BookRepository } from '../../../repositories/BookRepository';
import { Database } from '../../../database/dbWrapper';

describe('BookService Integration', () => {
  let db: Database;
  let repository: BookRepository;
  let service: BookService;

  beforeAll(async () => {
    db = new Database(':memory:'); // In-memory for tests
    await db.initialize();
    repository = new BookRepository(db);
    service = new BookService(repository, ...);
  });

  afterEach(async () => {
    await db.clear();
  });

  describe('search and recommendations', () => {
    it('should search and recommend similar books', async () => {
      // Setup test data
      const book1 = await repository.insert({
        title: 'Fiction Book',
        genre: 'Fiction'
      });
      
      const book2 = await repository.insert({
        title: 'Another Fiction',
        genre: 'Fiction'
      });

      // Test service
      const searchResult = await service.searchBooks('Fiction');
      expect(searchResult.isOk()).toBe(true);
      
      const books = searchResult.unwrap();
      expect(books.length).toBe(2);

      // Test recommendations
      const recResult = await service.getSimilarBooks(book1.id);
      expect(recResult.isOk()).toBe(true);
      
      const similar = recResult.unwrap();
      expect(similar.some(b => b.id === book2.id)).toBe(true);
    });
  });
});
```

---

## 🤖 E2E Test Examples

### Search Scene E2E

```typescript
// src/__tests__/e2e/searchScene.e2e.test.ts
import { searchScene } from '../../../scenes/searchScene';
import { createMockContext } from '../fixtures/mockContext';
import { BookFactory } from '../fixtures/factories';

describe('Search Scene E2E', () => {
  let context: BotContext;

  beforeEach(() => {
    context = createMockContext();
  });

  describe('text search', () => {
    it('should handle successful search', async () => {
      context.message.text = 'Fiction';
      
      // Simulate scene action
      await searchScene.on('text', context);

      // Verify response
      expect(context.reply).toHaveBeenCalled();
      const response = (context.reply as jest.Mock).mock.calls[0][0];
      expect(response).toContain('Fiction');
    });

    it('should handle empty search', async () => {
      context.message.text = '';
      
      await searchScene.on('text', context);

      expect(context.reply).toHaveBeenCalledWith(
        expect.stringContaining('введіть')
      );
    });

    it('should handle no results', async () => {
      context.message.text = 'NonExistentBook123';
      
      await searchScene.on('text', context);

      expect(context.reply).toHaveBeenCalledWith(
        expect.stringContaining('Не знайдено')
      );
    });
  });
});
```

---

## ✅ Test Checklist

### Phase 1: Setup (30 min)
- [ ] Create test directory structure
- [ ] Create mock fixtures and factories
- [ ] Setup test utilities
- [ ] Configure database for tests

### Phase 2: Unit Tests (1.5-2 hours)
- [ ] BookService tests (12 tests)
- [ ] UserService tests (10 tests)
- [ ] ReviewService tests (10 tests)
- [ ] Validator tests (15 tests)
- [ ] CircuitBreaker tests (8 tests)
- [ ] Cache tests (6 tests)

### Phase 3: Integration Tests (1-1.5 hours)
- [ ] BookService + Repository integration (8 tests)
- [ ] UserService integration (6 tests)
- [ ] Database transaction tests (4 tests)
- [ ] Cache invalidation tests (4 tests)

### Phase 4: E2E Tests (1 hour)
- [ ] Search scene workflow (5 tests)
- [ ] Add book scene workflow (4 tests)
- [ ] Profile scene workflow (3 tests)
- [ ] Error handling scenarios (4 tests)

### Phase 5: Coverage & Refining (30 min)
- [ ] Run coverage report
- [ ] Identify gaps
- [ ] Add missing tests
- [ ] Ensure 80%+ coverage

---

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- BookService.test.ts

# Run unit tests only
npm test -- src/__tests__/unit

# Run integration tests only
npm test -- src/__tests__/integration

# Run E2E tests only
npm test -- src/__tests__/e2e
```

---

## 📊 Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Services | 90% | TBD |
| Repositories | 85% | TBD |
| Utils | 85% | TBD |
| Validation | 90% | TBD |
| Cache | 80% | TBD |
| **Overall** | **80%** | TBD |

---

## 🔗 Dependencies

- `jest` - Testing framework
- `ts-jest` - TypeScript support
- `@types/jest` - Type definitions

All already in package.json ✅

---

## 📝 Best Practices

1. **Mock external dependencies** - Don't hit real database
2. **Test one thing per test** - Single responsibility
3. **Use meaningful test names** - Describe what's being tested
4. **Setup/Teardown properly** - Clean state between tests
5. **Test happy & sad paths** - Both success and failure
6. **Avoid hardcoded data** - Use factories and fixtures
7. **Test behavior, not implementation** - Focus on outputs

---

## 🎯 Success Criteria

✅ 80%+ code coverage  
✅ All critical services tested  
✅ All error paths tested  
✅ E2E workflows verified  
✅ All tests passing  
✅ No flaky tests  

---

*Strategy Document: 14 November 2025*
