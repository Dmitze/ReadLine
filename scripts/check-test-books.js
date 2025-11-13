const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('📚 Перевірка тестових книг\n');

db.all(
  'SELECT id, title, file_url, audio_file_id, online_link FROM books WHERE author = ?',
  ['Тестовий автор'],
  (err, rows) => {
    if (err) {
      console.error('❌ Помилка:', err);
    } else {
      console.table(rows);
      console.log(`\n✅ Знайдено ${rows.length} тестових книг\n`);
    }
    db.close();
  }
);
