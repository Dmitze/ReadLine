// Script to add multi-format fields to books table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || './database/library.db';

console.log('🔄 Додавання полів для multi-format підтримки...');
console.log('📁 База даних:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Помилка підключення до БД:', err);
    process.exit(1);
  }
  console.log('✅ Підключено до БД');
});

db.serialize(() => {
  // Додаємо нові поля
  const alterQueries = [
    'ALTER TABLE books ADD COLUMN pdf_file_id TEXT',
    'ALTER TABLE books ADD COLUMN external_link TEXT',
    'ALTER TABLE books ADD COLUMN audio_file_id TEXT',
    'ALTER TABLE books ADD COLUMN audio_duration INTEGER'
  ];
  
  let completed = 0;
  let errors = 0;
  
  alterQueries.forEach((query, index) => {
    db.run(query, (err) => {
      if (err) {
        // Ігноруємо помилку якщо поле вже існує
        if (err.message.includes('duplicate column name')) {
          console.log(`ℹ️  Поле ${index + 1}/4 вже існує`);
        } else {
          console.error(`❌ Помилка додавання поля ${index + 1}/4:`, err.message);
          errors++;
        }
      } else {
        console.log(`✅ Додано поле ${index + 1}/4`);
      }
      
      completed++;
      
      if (completed === alterQueries.length) {
        if (errors === 0) {
          console.log('🎉 Міграція завершена успішно!');
        } else {
          console.log(`⚠️  Міграція завершена з ${errors} помилками`);
        }
        
        db.close((err) => {
          if (err) {
            console.error('❌ Помилка закриття БД:', err);
            process.exit(1);
          }
          console.log('✅ З\'єднання з БД закрито');
        });
      }
    });
  });
});
