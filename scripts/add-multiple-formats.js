/**
 * Міграція: Додавання підтримки кількох форматів для однієї книги
 * 
 * Додає нові поля:
 * - pdf_file_id - для PDF файлу
 * - epub_file_id - для EPUB файлу
 * - audio_file_id - для аудіо файлу
 * - online_link - для онлайн посилання
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/library.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Починаємо міграцію: додавання підтримки кількох форматів...\n');

db.serialize(() => {
  // Додаємо нові колонки
  const alterQueries = [
    'ALTER TABLE books ADD COLUMN pdf_file_id TEXT',
    'ALTER TABLE books ADD COLUMN epub_file_id TEXT',
    'ALTER TABLE books ADD COLUMN audio_file_id TEXT',
    'ALTER TABLE books ADD COLUMN online_link TEXT'
  ];
  
  let completed = 0;
  
  alterQueries.forEach((query, index) => {
    db.run(query, (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log(`⚠️  Колонка вже існує (пропускаємо)`);
        } else {
          console.error(`❌ Помилка при виконанні запиту ${index + 1}:`, err.message);
        }
      } else {
        console.log(`✅ Запит ${index + 1} виконано успішно`);
      }
      
      completed++;
      
      if (completed === alterQueries.length) {
        console.log('\n✅ Міграція завершена успішно!');
        console.log('\n📝 Тепер книги можуть мати:');
        console.log('   - PDF файл (pdf_file_id)');
        console.log('   - EPUB файл (epub_file_id)');
        console.log('   - Аудіо файл (audio_file_id)');
        console.log('   - Онлайн посилання (online_link)');
        console.log('\n💡 Старі поля file_url та file_type залишаються для зворотної сумісності');
        
        db.close();
      }
    });
  });
});
