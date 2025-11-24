-- Migration: Add ISBN and Language fields to books table
-- Date: 2025-11-23
-- Description: Додає поля ISBN та Language для улучшення метаданих книги

ALTER TABLE books ADD COLUMN isbn TEXT;
ALTER TABLE books ADD COLUMN language TEXT DEFAULT 'Українська';

-- Indices для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_language ON books(language);
