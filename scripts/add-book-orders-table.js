// Міграція: Додавання системи замовлення фізичних книг
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Починаємо міграцію: додавання системи замовлення книг...\n');

db.serialize(() => {
  // 1. Додаємо поле is_physically_available до таблиці books
  db.run(`
    ALTER TABLE books ADD COLUMN is_physically_available BOOLEAN DEFAULT 0
  `, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ Поле is_physically_available вже існує');
      } else {
        console.error('❌ Помилка при додаванні поля is_physically_available:', err.message);
      }
    } else {
      console.log('✅ Додано поле is_physically_available до таблиці books');
    }
  });

  // 2. Створюємо таблицю book_orders
  db.run(`
    CREATE TABLE IF NOT EXISTS book_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      callsign TEXT NOT NULL,
      unit TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Помилка при створенні таблиці book_orders:', err.message);
    } else {
      console.log('✅ Створено таблицю book_orders');
    }
  });

  // 3. Створюємо індекси
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_book_orders_book_id ON book_orders(book_id)
  `, (err) => {
    if (err) {
      console.error('❌ Помилка при створенні індексу idx_book_orders_book_id:', err.message);
    } else {
      console.log('✅ Створено індекс idx_book_orders_book_id');
    }
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_book_orders_user_id ON book_orders(user_id)
  `, (err) => {
    if (err) {
      console.error('❌ Помилка при створенні індексу idx_book_orders_user_id:', err.message);
    } else {
      console.log('✅ Створено індекс idx_book_orders_user_id');
    }
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_book_orders_created_at ON book_orders(created_at)
  `, (err) => {
    if (err) {
      console.error('❌ Помилка при створенні індексу idx_book_orders_created_at:', err.message);
    } else {
      console.log('✅ Створено індекс idx_book_orders_created_at');
    }
  });

  // Перевірка результатів
  db.all(`PRAGMA table_info(books)`, (err, rows) => {
    if (err) {
      console.error('❌ Помилка при перевірці таблиці books:', err.message);
    } else {
      const hasField = rows.some(row => row.name === 'is_physically_available');
      if (hasField) {
        console.log('\n✅ Поле is_physically_available успішно додано до books');
      }
    }
  });

  db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='book_orders'`, (err, rows) => {
    if (err) {
      console.error('❌ Помилка при перевірці таблиці book_orders:', err.message);
    } else if (rows.length > 0) {
      console.log('✅ Таблиця book_orders успішно створена');
    }
    
    console.log('\n🎉 Міграція завершена!\n');
    db.close();
  });
});
