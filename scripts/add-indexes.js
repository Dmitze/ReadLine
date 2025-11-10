/**
 * Скрипт для додавання індексів в БД для оптимізації
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './database/library.db';

console.log('📊 Додавання індексів в БД...');
console.log(`📁 Шлях до БД: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Помилка підключення до БД:', err);
    process.exit(1);
  }
  console.log('✅ Підключено до БД');
});

// Індекси для оптимізації
const indexes = [
  {
    name: 'idx_books_genre',
    table: 'books',
    column: 'genre',
    description: 'Індекс для швидкого пошуку за жанром'
  },
  {
    name: 'idx_books_rating',
    table: 'books',
    column: 'rating',
    description: 'Індекс для сортування за рейтингом'
  },
  {
    name: 'idx_books_created_at',
    table: 'books',
    column: 'created_at',
    description: 'Індекс для сортування за датою додавання'
  },
  {
    name: 'idx_books_downloads',
    table: 'books',
    column: 'downloads_count',
    description: 'Індекс для сортування за кількістю завантажень'
  },
  {
    name: 'idx_books_available',
    table: 'books',
    column: 'is_available',
    description: 'Індекс для фільтрації доступних книг'
  },
  {
    name: 'idx_saved_books_user',
    table: 'saved_books',
    column: 'user_id',
    description: 'Індекс для швидкого пошуку збережених книг користувача'
  },
  {
    name: 'idx_reviews_book',
    table: 'reviews',
    column: 'book_id',
    description: 'Індекс для швидкого пошуку відгуків книги'
  },
  {
    name: 'idx_book_tags_book',
    table: 'book_tags',
    column: 'book_id',
    description: 'Індекс для швидкого пошуку тегів книги'
  },
  {
    name: 'idx_book_tags_tag',
    table: 'book_tags',
    column: 'tag_id',
    description: 'Індекс для швидкого пошуку книг за тегом'
  }
];

let completed = 0;
let errors = 0;

// Функція для створення індексу
function createIndex(index) {
  return new Promise((resolve, reject) => {
    // Спочатку перевіряємо чи існує індекс
    db.get(
      `SELECT name FROM sqlite_master WHERE type='index' AND name=?`,
      [index.name],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          console.log(`⏭️  Індекс ${index.name} вже існує`);
          resolve();
          return;
        }
        
        // Створюємо індекс
        const sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column})`;
        
        db.run(sql, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ Створено індекс: ${index.name}`);
            console.log(`   📝 ${index.description}`);
            resolve();
          }
        });
      }
    );
  });
}

// Створюємо всі індекси послідовно
async function createAllIndexes() {
  for (const index of indexes) {
    try {
      await createIndex(index);
      completed++;
    } catch (error) {
      console.error(`❌ Помилка створення індексу ${index.name}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Результат:`);
  console.log(`   ✅ Успішно: ${completed}`);
  console.log(`   ❌ Помилки: ${errors}`);
  console.log(`   📝 Всього: ${indexes.length}`);
  console.log('='.repeat(50));
  
  db.close((err) => {
    if (err) {
      console.error('❌ Помилка закриття БД:', err);
    } else {
      console.log('✅ З\'єднання з БД закрито');
    }
    
    process.exit(errors > 0 ? 1 : 0);
  });
}

// Запускаємо
createAllIndexes();
