const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || './database/library.db';

console.log('🎧 Додавання таблиць для аудіокниг...');
console.log(`📁 База даних: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Помилка підключення до БД:', err.message);
    process.exit(1);
  }
  console.log('✅ Підключено до БД');
});

// Додаємо поле narrator до books
const addNarratorField = `
  ALTER TABLE books ADD COLUMN narrator TEXT;
`;

// Створюємо таблицю audio_chapters
const createAudioChaptersTable = `
  CREATE TABLE IF NOT EXISTS audio_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_id TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );
`;

// Створюємо таблицю listening_progress
const createListeningProgressTable = `
  CREATE TABLE IF NOT EXISTS listening_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    chapter_id INTEGER,
    position INTEGER DEFAULT 0,
    total_listened INTEGER DEFAULT 0,
    last_listened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES audio_chapters(id) ON DELETE SET NULL,
    UNIQUE(user_id, book_id)
  );
`;

// Створюємо індекси для швидкого пошуку
const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_audio_chapters_book_id ON audio_chapters(book_id);',
  'CREATE INDEX IF NOT EXISTS idx_listening_progress_user_book ON listening_progress(user_id, book_id);',
  'CREATE INDEX IF NOT EXISTS idx_listening_progress_book_id ON listening_progress(book_id);'
];

// Виконуємо міграцію
db.serialize(() => {
  // Створюємо таблицю audio_chapters
  db.run(createAudioChaptersTable, (err) => {
    if (err) {
      console.error('❌ Помилка створення таблиці audio_chapters:', err.message);
    } else {
      console.log('✅ Створено таблицю audio_chapters');
    }
  });
  
  // Створюємо таблицю listening_progress
  db.run(createListeningProgressTable, (err) => {
    if (err) {
      console.error('❌ Помилка створення таблиці listening_progress:', err.message);
    } else {
      console.log('✅ Створено таблицю listening_progress');
    }
  });
  
  // Створюємо індекси
  createIndexes.forEach((indexSQL, i) => {
    db.run(indexSQL, (err) => {
      if (err) {
        console.error(`❌ Помилка створення індексу ${i + 1}:`, err.message);
      } else {
        console.log(`✅ Створено індекс ${i + 1}/${createIndexes.length}`);
      }
    });
  });
  
  // Перевіряємо чи існує поле narrator
  db.all("PRAGMA table_info(books)", (err, columns) => {
    if (err) {
      console.error('❌ Помилка перевірки структури таблиці:', err.message);
      return;
    }
    
    const hasNarrator = columns.some(col => col.name === 'narrator');
    
    if (!hasNarrator) {
      db.run(addNarratorField, (err) => {
        if (err) {
          console.error('❌ Помилка додавання поля narrator:', err.message);
        } else {
          console.log('✅ Додано поле narrator до таблиці books');
        }
        
        // Закриваємо з'єднання після завершення
        closeDatabase();
      });
    } else {
      console.log('ℹ️  Поле narrator вже існує');
      closeDatabase();
    }
  });
});

function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('❌ Помилка закриття БД:', err.message);
      process.exit(1);
    }
    console.log('🎉 Міграція завершена успішно!');
    console.log('✅ З\'єднання з БД закрито');
  });
}
