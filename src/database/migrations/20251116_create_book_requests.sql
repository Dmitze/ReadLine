-- Міграція: Створення таблиці заявок на книги
-- Дата: 2025-11-16

-- Таблиця заявок на фізичні книги
CREATE TABLE IF NOT EXISTS book_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  callsign TEXT NOT NULL,
  unit TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'issued', 'returned', 'rejected', 'cancelled')),
  comment TEXT,
  admin_comment TEXT,
  issued_at DATETIME,
  returned_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_by INTEGER,
  processed_at DATETIME,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_book_requests_book_id ON book_requests(book_id);
CREATE INDEX IF NOT EXISTS idx_book_requests_user_id ON book_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_book_requests_status ON book_requests(status);
CREATE INDEX IF NOT EXISTS idx_book_requests_created_at ON book_requests(created_at);

-- Індекс для пошуку активних заявок користувача на конкретну книгу
CREATE INDEX IF NOT EXISTS idx_book_requests_user_book_active 
ON book_requests(user_id, book_id, status);
