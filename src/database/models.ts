/**
 * Database Models
 * REFACTOR-009: This file now re-exports from modular tables structure
 *
 * Legacy compatibility layer - imports from src/database/tables/
 */

// Re-export everything from tables
export * from './tables';

// ✅ ВИПРАВЛЕНО #4: Експортуємо нову функцію батч-завантаження
export { getBooksByIds } from './tables/books';

// Legacy exports for backward compatibility
import { db as database } from './tables/db';
export { database as db };
