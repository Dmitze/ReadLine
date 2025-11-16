# SQL Injection Protection Guide

## Overview
This document describes the SQL injection protection mechanisms implemented in the project.

## Key Components

### 1. SafeQueryExecutor
Located in `src/database/SafeQueryExecutor.ts`

**Features:**
- ✅ Parameterized queries with `?` placeholders
- ✅ Automatic SQL injection detection
- ✅ Query timeout protection
- ✅ Query logging and monitoring
- ✅ Type-safe parameters (SQLParameters)

**Usage:**
```typescript
import { SafeQueryExecutor } from '../database/SafeQueryExecutor';

const executor = new SafeQueryExecutor(db);

// ✅ SAFE - Uses parameterized query
const result = await executor.executeSelect<Book>(
  'SELECT * FROM books WHERE title = ? AND author = ?',
  ['Harry Potter', 'J.K. Rowling'],
  { checkInjection: true }
);

// ❌ UNSAFE - Never do this!
// const query = `SELECT * FROM books WHERE title = '${userInput}'`;
```

### 2. InputSanitizer
Located in `src/validation/InputSanitizer.ts`

**Features:**
- ✅ SQL injection pattern detection
- ✅ XSS prevention
- ✅ HTML sanitization
- ✅ Special character handling

**Usage:**
```typescript
import { InputSanitizer } from '../validation/InputSanitizer';

// Check for SQL injection
if (InputSanitizer.checkSqlInjection(userInput)) {
  throw new Error('Invalid input detected');
}

// Sanitize string
const safe = InputSanitizer.sanitizeString(userInput, {
  removeHtml: true,
  trim: true
});
```

### 3. DatabaseWrapper
Located in `src/database/dbWrapper.ts`

**Features:**
- ✅ Type-safe SQL parameters
- ✅ Table name validation
- ✅ Prepared statements
- ✅ Transaction support

**Usage:**
```typescript
import { DatabaseWrapper, SQLParameters } from '../database/dbWrapper';

const wrapper = new DatabaseWrapper(db);

// ✅ SAFE - Parameterized query
const books = await wrapper.all<Book>(
  'SELECT * FROM books WHERE genre = ?',
  ['Fiction']
);

// ⚠️ CAUTION - Table name validation applied
const count = await wrapper.count('books', 'is_available = ?', [1]);
```

## Security Best Practices

### DO ✅
1. **Always use parameterized queries**
   ```typescript
   db.all('SELECT * FROM books WHERE id = ?', [bookId], callback);
   ```

2. **Validate table names**
   ```typescript
   if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
     throw new Error('Invalid table name');
   }
   ```

3. **Use SafeQueryExecutor for complex queries**
   ```typescript
   const executor = new SafeQueryExecutor(db);
   await executor.executeSelect(query, params, { checkInjection: true });
   ```

4. **Sanitize user input**
   ```typescript
   const safe = InputSanitizer.sanitizeString(userInput);
   ```

### DON'T ❌
1. **Never concatenate user input into SQL**
   ```typescript
   // ❌ DANGEROUS!
   db.all(`SELECT * FROM books WHERE title = '${title}'`);
   ```

2. **Never trust user input**
   ```typescript
   // ❌ DANGEROUS!
   const query = `SELECT * FROM ${userTable}`;
   ```

3. **Never disable injection checks without reason**
   ```typescript
   // ⚠️ Only if absolutely necessary
   await executor.executeSelect(query, params, { checkInjection: false });
   ```

## Common Attack Patterns

### 1. Classic SQL Injection
```sql
-- Attack: '; DROP TABLE books; --
-- Results in: SELECT * FROM books WHERE title = ''; DROP TABLE books; --'
```

### 2. Boolean-based Blind SQL Injection
```sql
-- Attack: ' OR '1'='1
-- Results in: SELECT * FROM books WHERE title = '' OR '1'='1'
```

### 3. Union-based SQL Injection
```sql
-- Attack: ' UNION SELECT * FROM users--
-- Results in: SELECT * FROM books WHERE title = '' UNION SELECT * FROM users--'
```

### 4. Time-based Blind SQL Injection
```sql
-- Attack: '; WAITFOR DELAY '00:00:05'--
```

## Detection Patterns

The `InputSanitizer` detects these patterns:
- SQL comments: `--`, `#`, `/*`, `*/`
- Boolean attacks: `OR '1'='1'`, `AND "1"="1"`
- Destructive commands: `DROP`, `DELETE`, `INSERT`, `UPDATE`
- Union attacks: `UNION SELECT`
- Execution commands: `EXEC`, `EXECUTE`

## Testing

Run SQL injection tests:
```bash
npm test -- sql-injection.test.ts
```

## Monitoring

SafeQueryExecutor logs all queries with:
- Query text
- Parameters used
- Execution time
- Errors (if any)

Access logs:
```typescript
const executor = new SafeQueryExecutor(db);
const logs = executor.getQueryLogs();
```

## References

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
- [SQLite Security](https://www.sqlite.org/security.html)

## Support

For security concerns, please contact the development team immediately.

---
**Last Updated:** 2025-11-16  
**Version:** 1.0.0
