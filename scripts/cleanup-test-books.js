/**
 * Скрипт для видалення тестових книг
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('🧹 Видалення тестових книг...\n');

db.run("DELETE FROM books WHERE author = 'Тестовий автор'", function(err) {
  if (err) {
    console.error('❌ Помилка:', err);
  } else {
    console.log(`✅ Видалено ${this.changes} тестових книг\n`);
  }
  db.close();
});
