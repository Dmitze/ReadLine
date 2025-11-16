# Error Handling Best Practices

## Overview
This document describes the error handling patterns and best practices used in the project.

## Core Components

### 1. Centralized Error Handler
Located in `src/utils/errorHandler.ts`

**Features:**
- ✅ Typed error categories (ErrorType enum)
- ✅ Custom AppError class
- ✅ Automatic logging
- ✅ User-friendly error messages
- ✅ Retry logic
- ✅ Timeout handling
- ✅ Fallback mechanisms

### 2. Error Types

```typescript
export enum ErrorType {
  DATABASE = 'DATABASE_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NETWORK = 'NETWORK_ERROR',
  AI = 'AI_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN_ERROR'
}
```

## Usage Patterns

### ✅ DO: Proper Error Handling

#### 1. Use AppError for Custom Errors
```typescript
import { AppError, ErrorType } from '../utils/errorHandler';

throw new AppError(
  ErrorType.VALIDATION,
  'Invalid book title',
  '❌ Назва книги повинна містити від 1 до 200 символів'
);
```

#### 2. Log Errors with Context
```typescript
import { handleError, ErrorType } from '../utils/errorHandler';

try {
  await saveBook(bookData);
} catch (error) {
  handleError(error, ErrorType.DATABASE, {
    bookId: bookData.id,
    userId: ctx.from.id
  });
  throw error; // Re-throw if needed
}
```

#### 3. Use Async Handler Wrapper
```typescript
import { asyncHandler, ErrorType } from '../utils/errorHandler';

const safeOperation = asyncHandler(
  async (bookId: number) => {
    return await getBookFromAPI(bookId);
  },
  ErrorType.NETWORK
);

const result = await safeOperation(123);
if (!result) {
  // Handle failure
}
```

#### 4. Error Middleware for Handlers
```typescript
import { errorMiddleware, ErrorType } from '../utils/errorHandler';

bot.command('search', errorMiddleware(async (ctx) => {
  await ctx.scene.enter('searchScene');
}, ErrorType.VALIDATION));
```

#### 5. Retry Unstable Operations
```typescript
import { retryOperation } from '../utils/errorHandler';

const data = await retryOperation(
  () => fetchFromExternalAPI(),
  3,  // max retries
  1000 // delay ms
);
```

#### 6. Use Fallback for Degradation
```typescript
import { withFallback, ErrorType } from '../utils/errorHandler';

const recommendations = await withFallback(
  () => getAIRecommendations(userId),
  () => getDefaultRecommendations(userId),
  ErrorType.AI
);
```

#### 7. Always Log in Catch Blocks
```typescript
import { logger } from '../utils/logger';

try {
  await deleteMessage(messageId);
} catch (error) {
  logger.debug('Failed to delete message', {
    error: error instanceof Error ? error.message : String(error),
    messageId
  });
}
```

### ❌ DON'T: Anti-Patterns

#### 1. Empty Catch Blocks
```typescript
// ❌ BAD - Silent failures
try {
  await operation();
} catch {} // Nothing logged!

// ✅ GOOD
try {
  await operation();
} catch (error) {
  logger.error('Operation failed', error);
}
```

#### 2. Catching Without Logging
```typescript
// ❌ BAD
try {
  await saveData();
} catch {
  return null; // What went wrong?
}

// ✅ GOOD
try {
  await saveData();
} catch (error) {
  logger.error('Failed to save data', error);
  return null;
}
```

#### 3. Generic Error Messages
```typescript
// ❌ BAD
catch (error) {
  ctx.reply('Error occurred');
}

// ✅ GOOD
catch (error) {
  await sendErrorToUser(ctx, error, '❌ Помилка збереження книги');
}
```

#### 4. Not Re-throwing When Needed
```typescript
// ❌ BAD - Caller can't handle
async function critical() {
  try {
    await mustSucceed();
  } catch (error) {
    logger.error('Failed', error);
    // Function continues as if nothing happened!
  }
}

// ✅ GOOD
async function critical() {
  try {
    await mustSucceed();
  } catch (error) {
    logger.error('Failed', error);
    throw error; // Let caller decide
  }
}
```

## Testing Error Handling

### Test Error Scenarios
```typescript
describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    const mockDb = {
      get: jest.fn().mockRejectedValue(new Error('DB Error'))
    };
    
    const result = await getBook(mockDb, 123);
    
    expect(result.isErr()).toBe(true);
    expect(logger.error).toHaveBeenCalled();
  });
  
  it('should retry failed operations', async () => {
    let attempts = 0;
    const operation = jest.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    });
    
    const result = await retryOperation(operation, 3, 100);
    
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```

## Error Recovery Strategies

### 1. Graceful Degradation
When primary feature fails, provide limited functionality:
```typescript
try {
  return await getAIRecommendations();
} catch {
  return await getPopularBooks(); // Fallback
}
```

### 2. Circuit Breaker
Prevent cascading failures:
```typescript
import { CircuitBreaker } from '../utils/CircuitBreaker';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  timeout: 60000
});

const result = await breaker.execute(() => unstableAPI());
```

### 3. Timeout Protection
Prevent hanging operations:
```typescript
import { withTimeout } from '../utils/errorHandler';

const result = await withTimeout(
  () => slowOperation(),
  5000, // 5 seconds
  'Operation took too long'
);
```

## Monitoring & Alerts

### Log Levels
- **ERROR**: Critical issues requiring immediate attention
- **WARN**: Potential issues, degraded functionality
- **INFO**: Normal operations, user actions
- **DEBUG**: Detailed debugging information

### What to Log
```typescript
logger.error('Critical error message', error, {
  userId: ctx.from?.id,
  action: 'book_creation',
  timestamp: new Date().toISOString(),
  requestId: generateId()
});
```

## Common Error Scenarios

### Database Errors
```typescript
try {
  await db.run(query, params);
} catch (error) {
  if (error.message.includes('UNIQUE constraint')) {
    throw new AppError(
      ErrorType.VALIDATION,
      'Duplicate entry',
      '❌ Така книга вже існує'
    );
  }
  throw new AppError(ErrorType.DATABASE, error.message);
}
```

### Network Errors
```typescript
try {
  const response = await axios.get(url);
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    throw new AppError(
      ErrorType.NETWORK,
      'Connection refused',
      '❌ Сервіс тимчасово недоступний'
    );
  }
  throw error;
}
```

### Validation Errors
```typescript
if (!isValidBookTitle(title)) {
  throw new AppError(
    ErrorType.VALIDATION,
    'Invalid title',
    '❌ Назва книги некоректна'
  );
}
```

## Resources

- [Result Pattern](./RESULT_PATTERN.md)
- [Logging Guide](./LOGGING.md)
- [Testing Guide](./TESTING.md)

---
**Last Updated:** 2025-11-16  
**Version:** 1.0.0
