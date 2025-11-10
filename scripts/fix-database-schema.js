// Скрипт для виправлення схеми БД
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || './database/library.db';
const db = new sqlite3.Database(dbPath);

console.log('🔧 Виправлення схеми БД...');

db.serialize(() => {
  // 1. Додати відсутню колонку audio_external_link
  db.run(`
    ALTER TABLE books ADD COLUMN audio_external_link TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Помилка додавання audio_external_link:', err.message);
    } else {
      console.log('✅ Колонка audio_external_link додана');
    }
  });

  // 2. Додати відсутню колонку file_format
  db.run(`
    ALTER TABLE books ADD COLUMN file_format TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Помилка додавання file_format:', err.message);
    } else {
      console.log('✅ Колонка file_format додана');
    }
  });

  // 3. Створити таблицю tags
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Помилка створення таблиці tags:', err.message);
    } else {
      console.log('✅ Таблиця tags створена');
    }
  });

  // 4. Створити таблицю book_tags
  db.run(`
    CREATE TABLE IF NOT EXISTS book_tags (
      book_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (book_id, tag_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Помилка створення таблиці book_tags:', err.message);
    } else {
      console.log('✅ Таблиця book_tags створена');
    }
  });

  // 5. Додати колонки для сповіщень в users
  db.run(`
    ALTER TABLE users ADD COLUMN notification_frequency TEXT DEFAULT 'weekly'
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Помилка додавання notification_frequency:', err.message);
    } else {
      console.log('✅ Колонка notification_frequency додана');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN notifications_enabled INTEGER DEFAULT 1
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Помилка додавання notifications_enabled:', err.message);
    } else {
      console.log('✅ Колонка notifications_enabled додана');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN last_notification_at DATETIME
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Помилка додавання last_notification_at:', err.message);
    } else {
      console.log('✅ Колонка last_notification_at додана');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN notification_time TEXT DEFAULT '10:00'
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Помилка додавання notification_time:', err.message);
    } else {
      console.log('✅ Колонка notification_time додана');
    }
  });

  // 6. Перевірка структури
  db.all(`PRAGMA table_info(books)`, (err, columns) => {
    if (err) {
      console.error('❌ Помилка перевірки структури books:', err.message);
    } else {
      console.log('\n📊 Структура таблиці books:');
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    }
  });

  db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
    if (err) {
      console.error('❌ Помилка отримання списку таблиць:', err.message);
    } else {
      console.log('\n📊 Таблиці в БД:');
      tables.forEach(table => {
        console.log(`  - ${table.name}`);
      });
      console.log('\n✅ Виправлення схеми завершено!');
    }
    
    db.close();
  });
});
