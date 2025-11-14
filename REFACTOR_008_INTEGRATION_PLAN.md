# 🔄 REFACTOR-008: Result Pattern Integration Plan

**Task:** Update all handlers and scenes to use Result pattern for type-safe error handling  
**Estimated Time:** 1-2 hours  
**Priority:** 🔴 CRITICAL  
**Status:** NOT STARTED

---

## 📋 Overview

Currently, handlers use try-catch blocks for error handling. We need to:
1. Create error middleware for centralized error handling
2. Update all handlers to use Result pattern
3. Add proper error responses
4. Test all changes

---

## 🎯 What Will Change

### Before (Current try-catch)
```typescript
searchScene.on('text', async (ctx: BotContext) => {
  try {
    logger.info('Search request', { ... });
    const books = await searchBooks(searchTerm);
    
    if (books.length === 0) {
      await ctx.reply('No results found');
      return;
    }
    
    // Display books...
  } catch (error) {
    logger.error('Search error', error);
    await ctx.reply('❌ An error occurred');
  }
});
```

### After (Result pattern)
```typescript
searchScene.on('text', async (ctx: BotContext) => {
  const result = await searchService.searchBooks(searchTerm);
  
  if (result.isErr()) {
    await handleError(ctx, result.error);
    return;
  }
  
  const books = result.unwrap();
  if (books.length === 0) {
    await ctx.reply('No results found');
    return;
  }
  
  // Display books...
});
```

---

## 🛠️ Implementation Steps

### Step 1: Create Error Handler Middleware
**File:** `src/middleware/errorHandler.ts`

```typescript
import { BotContext } from '../types/telegraf';
import { ILogger } from '../core/types';
import { Result } from '../core/Result';

export class ErrorHandler {
  constructor(private logger: ILogger) {}

  async handleSceneError(ctx: BotContext, error: Error | Result<any, Error>): Promise<void> {
    const actualError = error instanceof Error ? error : error;
    
    this.logger.error('Scene error', actualError);
    
    const errorMessage = this.getErrorMessage(actualError);
    try {
      await ctx.reply(`❌ ${errorMessage}`);
    } catch (sendError) {
      this.logger.error('Failed to send error message', sendError);
    }
  }

  private getErrorMessage(error: Error): string {
    // Handle specific error types
    if (error.message.includes('not found')) {
      return 'Не знайдено результатів';
    }
    if (error.message.includes('timeout')) {
      return 'Час очікування вичерпаний. Спробуйте пізніше';
    }
    if (error.message.includes('validation')) {
      return 'Невірні дані. Перевірте ввід';
    }
    
    // Default message
    return 'Сталась помилка. Спробуйте пізніше';
  }
}
```

### Step 2: Create Helper Function for Result Handling
**File:** `src/utils/resultHandler.ts`

```typescript
import { BotContext } from '../types/telegraf';
import { Result } from '../core/Result';

/**
 * Helper to handle Result pattern in scenes
 * Returns true if Result is Ok, false if Err
 */
export async function handleResult<T>(
  ctx: BotContext,
  result: Result<T>,
  errorMessage?: string
): Promise<boolean> {
  if (result.isOk()) {
    return true;
  }
  
  const message = errorMessage || getDefaultErrorMessage(result.error);
  try {
    await ctx.reply(`❌ ${message}`);
  } catch (error) {
    console.error('Failed to send error message', error);
  }
  
  return false;
}

function getDefaultErrorMessage(error: Error): string {
  if (error.message.includes('not found')) {
    return 'Не знайдено результатів';
  }
  if (error.message.includes('timeout')) {
    return 'Час очікування вичерпаний';
  }
  return 'Сталась помилка';
}

/**
 * Async result handler with automatic error reply
 */
export async function withResultHandler<T>(
  ctx: BotContext,
  operation: () => Promise<Result<T>>,
  onSuccess: (value: T) => Promise<void>,
  errorMessage?: string
): Promise<void> {
  const result = await operation();
  
  if (!await handleResult(ctx, result, errorMessage)) {
    return;
  }
  
  const value = result.unwrap();
  await onSuccess(value);
}
```

### Step 3: Update Service Layer to Return Result
**Services already return Result**, so no changes needed there.

### Step 4: Update All Scene Handlers

#### Example: searchScene.ts
```typescript
import { BookService } from '../services/BookService';
import { handleResult, withResultHandler } from '../utils/resultHandler';

searchScene.on('text', async (ctx: BotContext) => {
  const searchTerm = ctx.message?.text?.trim();
  if (!searchTerm) {
    await ctx.reply('❌ Будь ласка, введіть текст');
    return;
  }

  if (searchTerm.length < CONFIG.MIN_SEARCH_LENGTH) {
    await ctx.reply(`❌ Мінімум ${CONFIG.MIN_SEARCH_LENGTH} символів`);
    return;
  }

  const bookService = new BookService(bookRepo, reviewRepo, savedRepo, logger);
  
  // Method 1: Using handleResult
  const result = await bookService.searchBooks(searchTerm);
  if (!await handleResult(ctx, result)) {
    return;
  }
  
  const books = result.unwrap();
  if (books.length === 0) {
    await ctx.reply('😔 Не знайдено');
    return;
  }
  
  // Display books...
});
```

---

## 📋 Files to Update

### Scene Files (13 files)
```
✅ src/scenes/searchScene.ts
✅ src/scenes/addBookScene.ts
✅ src/scenes/editBookScene.ts
✅ src/scenes/rateBookScene.ts
✅ src/scenes/profileScene.ts
✅ src/scenes/settingsScene.ts
✅ src/scenes/aiScene.ts
✅ src/scenes/aiAssistantScene.ts
✅ src/scenes/manageBooksScene.ts
✅ src/scenes/onboardingScene.ts
✅ src/scenes/feedbackScene.ts
✅ src/scenes/replyFeedbackScene.ts
✅ src/scenes/promoAdminScene.ts
```

### Handler Files (2 files)
```
✅ src/handlers/userHandlers.ts
✅ src/handlers/adminHandlers.ts
```

### New Files to Create (2 files)
```
✅ src/middleware/errorHandler.ts
✅ src/utils/resultHandler.ts
```

---

## 🔄 Pattern to Apply

### For Database Operations
```typescript
// Before
const books = await searchBooks(query);

// After
const booksResult = await bookService.searchBooks(query);
if (!await handleResult(ctx, booksResult)) return;
const books = booksResult.unwrap();
```

### For User Creation
```typescript
// Before
try {
  const user = await createUser(userId);
  // use user
} catch (e) {
  logger.error('Failed to create user', e);
  await ctx.reply('Error creating user');
}

// After
const userResult = await userService.createUser(userId);
if (!await handleResult(ctx, userResult, 'Failed to create account')) {
  return;
}
const user = userResult.unwrap();
// use user
```

### For Validation
```typescript
// Before
if (!title || title.length < 3) {
  await ctx.reply('Title too short');
  return;
}

// After
const validation = validateInput({ title }, {
  title: (v) => !v || v.length < 3 ? 'Title too short' : null
});
if (validation.isErr()) {
  await ctx.reply(`❌ ${validation.error.message}`);
  return;
}
```

---

## ✅ Checklist

### Phase 1: Create Infrastructure
- [ ] Create `src/middleware/errorHandler.ts`
- [ ] Create `src/utils/resultHandler.ts`
- [ ] Update `src/core/Result.ts` if needed
- [ ] Test helper functions

### Phase 2: Update searchScene.ts
- [ ] Replace try-catch with Result pattern
- [ ] Use bookService instead of direct repo calls
- [ ] Add error handling for each operation
- [ ] Test all search operations

### Phase 3: Update Other Scenes
- [ ] addBookScene.ts
- [ ] editBookScene.ts
- [ ] rateBookScene.ts
- [ ] profileScene.ts
- [ ] settingsScene.ts
- [ ] aiScene.ts
- [ ] manageBooksScene.ts
- [ ] etc.

### Phase 4: Update Handlers
- [ ] userHandlers.ts
- [ ] adminHandlers.ts

### Phase 5: Testing & Verification
- [ ] Test all scenes manually
- [ ] Verify error messages display correctly
- [ ] Check logging is working
- [ ] Verify type safety

---

## 🎓 Code Examples

### Example 1: Simple Operation
```typescript
// In a scene
searchScene.action('view_book', async (ctx: BotContext) => {
  const bookId = parseInt(ctx.match?.[1] || '0');
  
  const result = await bookService.getBookDetails(bookId);
  
  if (!await handleResult(ctx, result, 'Book not found')) {
    return;
  }
  
  const book = result.unwrap();
  await displayBook(ctx, book);
});
```

### Example 2: Chained Operations
```typescript
// Create review with validation
reviewScene.on('text', async (ctx: BotContext) => {
  const rating = parseInt(ctx.message?.text || '0');
  
  // Validate
  if (rating < 1 || rating > 5) {
    await ctx.reply('❌ Рейтинг має бути від 1 до 5');
    return;
  }
  
  // Create review
  const reviewResult = await reviewService.createReview({
    bookId: bookId,
    userId: ctx.from?.id || 0,
    rating: rating,
    comment: comment
  });
  
  if (!await handleResult(ctx, reviewResult)) {
    return;
  }
  
  const review = reviewResult.unwrap();
  
  // Publish review
  const publishResult = await reviewService.publishReview(review.id);
  
  if (!await handleResult(ctx, publishResult, 'Failed to publish review')) {
    return;
  }
  
  await ctx.reply('✅ Review published!');
});
```

### Example 3: Multiple Results
```typescript
// Get book with all related data
scene.on('text', async (ctx: BotContext) => {
  const bookId = parseInt(ctx.message?.text || '0');
  
  // Get book details
  const bookResult = await bookService.getBookDetails(bookId);
  if (!await handleResult(ctx, bookResult)) return;
  const book = bookResult.unwrap();
  
  // Get reviews
  const reviewsResult = await reviewService.getBookReviews(bookId);
  if (!await handleResult(ctx, reviewsResult)) return;
  const reviews = reviewsResult.unwrap();
  
  // Get if saved
  const savedResult = await bookService.isSaved(ctx.from?.id || 0, bookId);
  if (!await handleResult(ctx, savedResult)) return;
  const isSaved = savedResult.unwrap();
  
  // Display everything
  await displayComplete(ctx, book, reviews, isSaved);
});
```

---

## 🚀 Integration with DI Container

Once DI is integrated in index.ts, scenes will get services from container:

```typescript
// In index.ts
const bookService = await globalContainer.resolve('bookService');

// In scenes
// Instead of creating new BookService each time
const bookService = await globalContainer.resolve('bookService');
const result = await bookService.searchBooks(query);
```

---

## 📊 Expected Changes

### Code Reduction
- Remove ~200-300 lines of try-catch blocks
- Add ~100-150 lines of Result handling

### Error Consistency
- All errors follow same pattern
- Consistent error messages
- Better logging

### Type Safety
- Result<T> ensures handling
- No uncaught exceptions
- Proper error types

---

## ⏱️ Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Infrastructure | 15-20 min | 🔴 TODO |
| searchScene | 10-15 min | 🔴 TODO |
| Other Scenes | 20-30 min | 🔴 TODO |
| Handlers | 10-15 min | 🔴 TODO |
| Testing | 15-20 min | 🔴 TODO |
| **Total** | **1-2 hours** | 🔴 TODO |

---

## 🔗 Related

- **REFACTORING_TASKS.md** - Task overview
- **REFACTORING_COMPLETION.md** - Previous work
- **src/core/Result.ts** - Result pattern implementation
- **src/services/** - Services that return Result

---

**Status:** Ready to start  
**Difficulty:** Medium (straightforward pattern replacement)  
**Impact:** High (improves error handling throughout app)
