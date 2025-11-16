# Transaction Handling Guide

## Overview
This document describes transaction management patterns and best practices for database operations.

## Core Components

### 1. DatabaseWrapper.transaction()
Located in `src/database/dbWrapper.ts`

**Features:**
- ✅ Proper async/await (no Promise anti-pattern)
- ✅ Automatic BEGIN/COMMIT/ROLLBACK
- ✅ Error handling with logging
- ✅ Type-safe callback

**Basic Usage:**
```typescript
import { db } from './database/models';
import { DatabaseWrapper } from './database/dbWrapper';

const wrapper = new DatabaseWrapper(db);

// Execute multiple operations atomically
const result = await wrapper.transaction(async () => {
  const bookId = await insertBook(bookData);
  await insertTags(bookId, tags);
  await updateStats(bookId);
  return bookId;
});
```

### 2. TransactionManager
Located in `src/database/TransactionManager.ts`

**Features:**
- ✅ Result pattern integration
- ✅ Transaction statistics
- ✅ Timeout support
- ✅ Deadlock retry
- ✅ Savepoint support
- ✅ Batch operations

**Advanced Usage:**
```typescript
import { TransactionManager } from './database/TransactionManager';

const manager = new TransactionManager(dbWrapper);

// Execute with Result pattern
const result = await manager.executeTransaction(async () => {
  return await complexOperation();
});

if (result.isOk()) {
  console.log('Success:', result.value);
} else {
  console.error('Failed:', result.error);
}
```

### 3. TransactionPatterns
Common transaction patterns for typical use cases.

## Transaction Patterns

### Pattern 1: Create with Related Entities

```typescript
import { TransactionPatterns } from './database/TransactionManager';

const patterns = new TransactionPatterns(manager);

const result = await patterns.createWithRelated(
  // Create main entity
  async () => {
    const bookId = await insertBook({
      title: 'New Book',
      author: 'Author Name'
    });
    return bookId;
  },
  // Create related entities
  [
    async (bookId) => await insertTag(bookId, 'fiction'),
    async (bookId) => await insertTag(bookId, 'bestseller'),
    async (bookId) => await updateCatalog(bookId)
  ]
);

if (result.isOk()) {
  const { main, related } = result.value;
  console.log('Book created:', main);
  console.log('Tags created:', related);
}
```

### Pattern 2: Update with Cascade

```typescript
const result = await patterns.updateWithCascade([
  async () => updateBook(bookId, { title: 'New Title' }),
  async () => updateSearchIndex(bookId),
  async () => invalidateCache(bookId)
]);
```

### Pattern 3: Delete with Cascade

```typescript
const result = await patterns.deleteWithCascade(
  // Main delete
  async () => deleteBook(bookId),
  // Cascade deletes
  [
    async () => deleteBookTags(bookId),
    async () => deleteSavedBooks(bookId),
    async () => deleteReviews(bookId)
  ]
);
```

### Pattern 4: Batch Operations

```typescript
const operations = [
  async () => updateBook(1, data1),
  async () => updateBook(2, data2),
  async () => updateBook(3, data3)
];

const result = await manager.batch(operations);

if (result.isOk()) {
  console.log('All books updated:', result.value);
}
```

### Pattern 5: Savepoints (Nested Transactions)

```typescript
await wrapper.transaction(async () => {
  await insertBook(bookData);
  
  // Create savepoint for risky operation
  const tagResult = await manager.savepoint('tag_insert', async () => {
    return await insertTags(bookId, tags);
  });
  
  if (tagResult.isErr()) {
    // Savepoint rolled back, but transaction continues
    logger.warn('Failed to insert tags', tagResult.error);
  }
  
  await updateStats(bookId);
});
```

## Best Practices

### ✅ DO: Keep Transactions Short

```typescript
// ✅ GOOD - Short transaction
await wrapper.transaction(async () => {
  const id = await insert(data);
  await updateRelated(id);
  return id;
});

// ❌ BAD - Long transaction with external API
await wrapper.transaction(async () => {
  const id = await insert(data);
  await fetch('https://api.example.com'); // Don't do I/O in transaction!
  await update(id);
});
```

### ✅ DO: Handle Deadlocks

```typescript
const result = await manager.executeTransaction(
  async () => await operation(),
  {
    retryOnDeadlock: true,
    maxRetries: 3
  }
);
```

### ✅ DO: Use Timeouts

```typescript
const result = await manager.executeTransaction(
  async () => await operation(),
  {
    timeout: 5000 // 5 seconds
  }
);
```

### ✅ DO: Log Transaction Boundaries

```typescript
await wrapper.transaction(async () => {
  logger.info('Starting book creation transaction');
  
  const bookId = await insertBook(data);
  await insertTags(bookId, tags);
  
  logger.info('Book creation transaction completed', { bookId });
  return bookId;
});
```

### ❌ DON'T: Nest Transactions Without Savepoints

```typescript
// ❌ BAD - Nested transactions
await wrapper.transaction(async () => {
  await wrapper.transaction(async () => { // Won't work as expected
    await operation();
  });
});

// ✅ GOOD - Use savepoints
await wrapper.transaction(async () => {
  await manager.savepoint('nested', async () => {
    await operation();
  });
});
```

### ❌ DON'T: Ignore Transaction Errors

```typescript
// ❌ BAD - Swallowing errors
try {
  await wrapper.transaction(async () => {
    await operation();
  });
} catch (error) {
  // Silent failure - bad!
}

// ✅ GOOD - Handle errors properly
try {
  await wrapper.transaction(async () => {
    await operation();
  });
} catch (error) {
  logger.error('Transaction failed', error);
  throw error; // Re-throw or handle appropriately
}
```

## Isolation Levels

SQLite supports limited isolation levels:

```typescript
// Default: SERIALIZABLE (highest isolation)

// Read uncommitted (for read-heavy operations)
await manager.executeTransaction(
  async () => await readOperation(),
  {
    isolationLevel: IsolationLevel.READ_UNCOMMITTED
  }
);
```

## Common Scenarios

### Scenario 1: Creating Book with Tags

```typescript
await wrapper.transaction(async () => {
  // Insert book
  const bookId = await dbWrapper.insert(
    'INSERT INTO books (title, author) VALUES (?, ?)',
    [title, author]
  );
  
  // Insert tags
  for (const tag of tags) {
    await dbWrapper.insert(
      'INSERT INTO book_tags (book_id, tag_id) VALUES (?, ?)',
      [bookId, tag.id]
    );
  }
  
  return bookId;
});
```

### Scenario 2: Updating User with Stats

```typescript
await wrapper.transaction(async () => {
  // Update user
  await dbWrapper.update(
    'UPDATE users SET name = ? WHERE id = ?',
    [newName, userId]
  );
  
  // Update stats
  await dbWrapper.run(
    'UPDATE user_stats SET updated_at = ? WHERE user_id = ?',
    [new Date().toISOString(), userId]
  );
});
```

### Scenario 3: Safe Delete with References

```typescript
const result = await patterns.deleteWithCascade(
  async () => {
    await dbWrapper.delete(
      'DELETE FROM books WHERE id = ?',
      [bookId]
    );
  },
  [
    async () => {
      await dbWrapper.delete(
        'DELETE FROM book_tags WHERE book_id = ?',
        [bookId]
      );
    },
    async () => {
      await dbWrapper.delete(
        'DELETE FROM saved_books WHERE book_id = ?',
        [bookId]
      );
    }
  ]
);
```

## Monitoring & Debugging

### Get Transaction Statistics

```typescript
const stats = manager.getStats(transactionId);

console.log({
  duration: stats.duration,
  operations: stats.operations,
  committed: stats.committed,
  error: stats.error
});
```

### Clear Statistics

```typescript
// Clear old stats periodically
manager.clearStats();
```

## Testing Transactions

```typescript
describe('Transaction Tests', () => {
  it('should rollback on error', async () => {
    const operation = async () => {
      await insertData();
      throw new Error('Simulated error');
    };
    
    await expect(
      wrapper.transaction(operation)
    ).rejects.toThrow('Simulated error');
    
    // Verify rollback
    const count = await dbWrapper.count('table_name');
    expect(count).toBe(0);
  });
});
```

## Performance Tips

1. **Batch similar operations** - Use `manager.batch()` for multiple similar operations
2. **Use savepoints for partial rollback** - Don't roll back entire transaction for minor failures
3. **Keep transactions short** - Long transactions block other operations
4. **Avoid I/O in transactions** - Don't make HTTP requests or read files
5. **Index your queries** - Slow queries in transactions cause locks

## References

- [SQLite Transaction Documentation](https://www.sqlite.org/lang_transaction.html)
- [Result Pattern](./RESULT_PATTERN.md)
- [Error Handling](./ERROR_HANDLING.md)

---
**Last Updated:** 2025-11-16  
**Version:** 1.0.0
