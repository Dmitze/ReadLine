-- Міграція: Додавання полів для фізичних примірників книг
-- Дата: 2025-11-16

-- Додаємо поле "чи є фізичний примірник"
ALTER TABLE books ADD COLUMN has_physical_copy BOOLEAN DEFAULT 0;

-- Додаємо поля для управління кількістю
ALTER TABLE books ADD COLUMN physical_copies_total INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN physical_copies_available INTEGER DEFAULT 0;

-- Індекс для швидкого пошуку книг з фізичними примірниками
CREATE INDEX IF NOT EXISTS idx_books_has_physical ON books(has_physical_copy);
CREATE INDEX IF NOT EXISTS idx_books_physical_available ON books(physical_copies_available);

-- Оновлюємо існуючі книги
-- Якщо є file_type = 'physical', встановлюємо has_physical_copy = 1
UPDATE books 
SET has_physical_copy = 1, 
    physical_copies_total = 1, 
    physical_copies_available = 1 
WHERE file_type = 'physical';
