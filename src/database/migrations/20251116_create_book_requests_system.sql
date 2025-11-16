-- Міграція: Система заявок на фізичні книги
-- Версія: 2.0
-- Дата: 2025-11-16
-- Опис: Створення повної системи заявок на фізичні книги з усіма необхідними таблицями

-- ==========================================
-- 1. ТАБЛИЦЯ ЗАЯВОК НА КНИГИ
-- ==========================================

CREATE TABLE IF NOT EXISTS book_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT NOT NULL,
  book_genre TEXT,
  book_description TEXT,
  book_cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewed_by INTEGER,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES admins(user_id) ON DELETE SET NULL
);

-- Індекси для швидкого пошуку заявок
CREATE INDEX IF NOT EXISTS idx_book_requests_user ON book_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_book_requests_status ON book_requests(status);
CREATE INDEX IF NOT EXISTS idx_book_requests_requested_at ON book_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_book_requests_priority ON book_requests(priority DESC);

-- ==========================================
-- 2. ТАБЛИЦЯ ФІЗИЧНИХ КОПІЙ КНИГ
-- ==========================================

CREATE TABLE IF NOT EXISTS physical_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  quantity_total INTEGER DEFAULT 1,
  quantity_available INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'new' CHECK(condition IN ('new', 'like_new', 'good', 'acceptable', 'poor')),
  location TEXT,
  notes TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  added_by INTEGER,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL,
  FOREIGN KEY (added_by) REFERENCES admins(user_id) ON DELETE SET NULL
);

-- Індекси для пошуку фізичних книг
CREATE INDEX IF NOT EXISTS idx_physical_books_book_id ON physical_books(book_id);
CREATE INDEX IF NOT EXISTS idx_physical_books_title ON physical_books(title);
CREATE INDEX IF NOT EXISTS idx_physical_books_author ON physical_books(author);
CREATE INDEX IF NOT EXISTS idx_physical_books_isbn ON physical_books(isbn);
CREATE INDEX IF NOT EXISTS idx_physical_books_available ON physical_books(quantity_available);

-- ==========================================
-- 3. ТАБЛИЦЯ ВИДАЧІ ФІЗИЧНИХ КНИГ
-- ==========================================

CREATE TABLE IF NOT EXISTS book_loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  physical_book_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  request_id INTEGER,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME NOT NULL,
  returned_at DATETIME,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'returned', 'overdue', 'lost')),
  issued_by INTEGER,
  notes TEXT,
  FOREIGN KEY (physical_book_id) REFERENCES physical_books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES book_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (issued_by) REFERENCES admins(user_id) ON DELETE SET NULL
);

-- Індекси для видачі книг
CREATE INDEX IF NOT EXISTS idx_book_loans_physical_book ON book_loans(physical_book_id);
CREATE INDEX IF NOT EXISTS idx_book_loans_user ON book_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_book_loans_status ON book_loans(status);
CREATE INDEX IF NOT EXISTS idx_book_loans_due_date ON book_loans(due_date);
CREATE INDEX IF NOT EXISTS idx_book_loans_request ON book_loans(request_id);

-- ==========================================
-- 4. ТАБЛИЦЯ ІСТОРІЇ ЗМІН СТАТУСІВ ЗАЯВОК
-- ==========================================

CREATE TABLE IF NOT EXISTS book_request_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by INTEGER,
  change_reason TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES book_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES admins(user_id) ON DELETE SET NULL
);

-- Індекс для історії змін
CREATE INDEX IF NOT EXISTS idx_book_request_history_request ON book_request_history(request_id);
CREATE INDEX IF NOT EXISTS idx_book_request_history_changed_at ON book_request_history(changed_at);

-- ==========================================
-- 5. ТАБЛИЦЯ НАГАДУВАНЬ ПРО ПОВЕРНЕННЯ
-- ==========================================

CREATE TABLE IF NOT EXISTS book_return_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('before_due', 'due_date', 'overdue')),
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES book_loans(id) ON DELETE CASCADE
);

-- Індекс для нагадувань
CREATE INDEX IF NOT EXISTS idx_book_return_reminders_loan ON book_return_reminders(loan_id);

-- ==========================================
-- 6. ОНОВЛЕННЯ ІСНУЮЧОЇ ТАБЛИЦІ BOOKS
-- ==========================================

-- Додаємо поле для фізичних копій якщо його ще немає
-- (безпечна операція через IF NOT EXISTS в окремому запиті)
