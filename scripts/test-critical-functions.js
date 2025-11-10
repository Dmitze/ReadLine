/**
 * Тестування критичних функцій бота
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Тестування критичних функцій...');

// Тест 1: Випадкова книга
function testRandomBook() {
  return new Promise((resolve, reject) => {
    console.log('\n🎲 ТЕСТ: Випадкова книга');
    
    db.get(
      'SELECT * FROM books WHERE (is_available = 1 OR is_available IS NULL) ORDER BY RANDOM() LIMIT 1',
      (err, row) => {
        if (err) {
          console.error('❌ Помилка SQL:', err);
          reject(err);
        } else if (row) {
          console.log(`✅ Випадкова книга: "${row.title}" by ${row.author}`);
          console.log(`📊 Рейтинг: ${row.rating || 'Немає'}, Завантажень: ${row.downloads_count || 0}`);
          resolve(row);
        } else {
          console.log('❌ Книга не знайдена');
          resolve(null);
        }
      }
    );
  });
}

// Тест 2: Пошук за жанром
function testGenreSearch(genre) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 ТЕСТ: Пошук за жанром "${genre}"`);
    
    db.all(
      'SELECT * FROM books WHERE LOWER(genre) LIKE LOWER(?) AND (is_available = 1 OR is_available IS NULL) LIMIT 5',
      [`%${genre}%`],
      (err, rows) => {
        if (err) {
          console.error('❌ Помилка SQL:', err);
          reject(err);
        } else {
          console.log(`✅ Знайдено ${rows.length} книг для жанру "${genre}"`);
          rows.forEach((book, i) => {
            console.log(`  ${i + 1}. "${book.title}" - ${book.author} (${book.genre})`);
          });
          resolve(rows);
        }
      }
    );
  });
}

// Тест 3: Пошук за назвою
function testTitleSearch(title) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 ТЕСТ: Пошук за назвою "${title}"`);
    
    db.all(
      'SELECT * FROM books WHERE LOWER(title) LIKE LOWER(?) AND (is_available = 1 OR is_available IS NULL) LIMIT 5',
      [`%${title}%`],
      (err, rows) => {
        if (err) {
          console.error('❌ Помилка SQL:', err);
          reject(err);
        } else {
          console.log(`✅ Знайдено ${rows.length} книг для назви "${title}"`);
          rows.forEach((book, i) => {
            console.log(`  ${i + 1}. "${book.title}" - ${book.author}`);
          });
          resolve(rows);
        }
      }
    );
  });
}

// Тест 4: Статистика користувача
function testUserStats(userId) {
  return new Promise((resolve, reject) => {
    console.log(`\n📊 ТЕСТ: Статистика користувача ${userId}`);
    
    // Збережені книги
    db.get(
      'SELECT COUNT(*) as count FROM saved_books WHERE user_id = ?',
      [userId],
      (err, savedRow) => {
        if (err) {
          console.error('❌ Помилка збережених книг:', err);
          reject(err);
          return;
        }
        
        // Відгуки
        db.get(
          'SELECT COUNT(*) as count FROM reviews WHERE user_id = ?',
          [userId],
          (err, reviewRow) => {
            if (err) {
              console.error('❌ Помилка відгуків:', err);
              reject(err);
              return;
            }
            
            console.log(`✅ Збережено книг: ${savedRow.count}`);
            console.log(`✅ Залишено відгуків: ${reviewRow.count}`);
            
            resolve({
              savedBooks: savedRow.count,
              reviews: reviewRow.count
            });
          }
        );
      }
    );
  });
}

// Тест 5: Топ книги
function testTopBooks() {
  return new Promise((resolve, reject) => {
    console.log('\n🏆 ТЕСТ: Топ книги');
    
    db.all(
      'SELECT * FROM books WHERE rating > 0 ORDER BY rating DESC, reviews_count DESC LIMIT 5',
      (err, rows) => {
        if (err) {
          console.error('❌ Помилка топ книг:', err);
          reject(err);
        } else {
          console.log(`✅ Топ ${rows.length} книг:`);
          rows.forEach((book, i) => {
            console.log(`  ${i + 1}. "${book.title}" - рейтинг: ${book.rating}, відгуків: ${book.reviews_count}`);
          });
          resolve(rows);
        }
      }
    );
  });
}

// Запуск всіх тестів
async function runAllTests() {
  try {
    console.log('🚀 Початок тестування...\n');
    
    // Тест випадкової книги (5 разів)
    for (let i = 1; i <= 3; i++) {
      await testRandomBook();
    }
    
    // Тести пошуку
    await testGenreSearch('Любовний');
    await testGenreSearch('любовний роман');
    await testGenreSearch('Фентезі');
    await testGenreSearch('Жахи');
    await testGenreSearch('Детектив');
    
    await testTitleSearch('Гордість');
    await testTitleSearch('Гаррі');
    await testTitleSearch('Дракула');
    
    // Тест статистики (реальний користувач)
    await testUserStats(906087418);
    
    // Тест топ книг
    await testTopBooks();
    
    console.log('\n🎉 Всі тести завершені успішно!');
    
  } catch (error) {
    console.error('\n❌ Помилка під час тестування:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Помилка закриття БД:', err);
      } else {
        console.log('✅ База даних закрита');
      }
    });
  }
}

// Запуск
runAllTests();