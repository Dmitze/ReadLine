-- Migration: Add missing columns to promo_codes table
-- Date: 2025-11-24
-- Description: Adds description, promo_type, is_active, and created_by columns to promo_codes table

-- Check if columns exist before adding them (SQLite doesn't have IF NOT EXISTS for columns)
PRAGMA table_info(promo_codes);

-- These commands should be run manually or via application logic due to SQLite limitations:
-- ALTER TABLE promo_codes ADD COLUMN description TEXT;
-- ALTER TABLE promo_codes ADD COLUMN promo_type TEXT DEFAULT 'yakaboo_unlimited';
-- ALTER TABLE promo_codes ADD COLUMN is_active INTEGER DEFAULT 1;
-- ALTER TABLE promo_codes ADD COLUMN created_by INTEGER;
