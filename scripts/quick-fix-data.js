// Швидке виправлення даних в БД
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || './database/library.db';
const db = new sqlite3.Database(dbPath);

console.log('🔧 Швидке виправлення даних...\n');

db.serialize(() => {
  // 1. Зробити всі книги доступними
  db.run('UPDATE books SET is_available = 1', (err) => {
    if (err) {
      console.error('❌ Помилка оновлення книг:', err.message);
    } else {
      db.get('SELECT COUNT(*) as count FROM books WHERE is_available = 1', (err, row) => {
        if (!err) {
          console.log(`✅ Зроблено доступними ${row.count} книг`);
        }
      });
    }
  });

  // 2. Додати базові теги
  const tags = [
    'Бестселер',
    'Класика',
    'Легке читання',
    'Для дорослих',
    'Молодіжна',
    'Пригоди',
    'Романтика',
    'Містика',
    'Детектив',
    'Фантастика'
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  tags.forEach(tag => {
    stmt.run(tag);
  });
  stmt.finalize(() => {
    db.all('SELECT * FROM tags', (err, rows) => {
      if (!err) {
        console.log(`\n✅ Створено ${rows.length} тегів:`);
        rows.forEach(tag => {
          console.log(`  - ${tag.name}`);
        });
      }
    });
  });

  // 3. Перевірити жанри
  db.all('SELECT DISTINCT genre FROM books', (err, rows) => {
    if (!err) {
      console.log(`\n📚 Жанри в БД:`);
      rows.forEach(row => {
        console.log(`  - ${row.genre}`);
      });
    }
  });

  // 4. Статистика
  setTimeout(() => {
    db.get(`
      SELECT 
        COUNT(*) as total_books,
        SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as available_books,
        (SELECT COUNT(*) FROM tags) as total_tags,
        (SELECT COUNT(*) FROM saved_books) as saved_books,
        (SELECT COUNT(*) FROM reviews) as total_reviews
      FROM books
    `, (err, stats) => {
      if (!err) {
        console.log(`\n📊 Статистика БД:`);
        console.log(`  📚 Всього книг: ${stats.total_books}`);
        console.log(`  ✅ Доступних: ${stats.available_books}`);
        console.log(`  🏷️ Тегів: ${stats.total_tags}`);
        console.log(`  💾 Збережених: ${stats.saved_books}`);
        console.log(`  ⭐ Відгуків: ${stats.total_reviews}`);
        console.log(`\n✅ Виправлення завершено!`);
      }
      db.close();
    });
  }, 1000);
});
