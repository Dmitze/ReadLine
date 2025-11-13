/**
 * Скрипт для перевірки мультиформатної книги
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Перевірка мультиформатних книг...\n');

// Шукаємо книги які мають кілька форматів
db.all(`
  SELECT 
    id,
    title,
    author,
    file_url,
    file_type,
    audio_file_id,
    online_link
  FROM books
  WHERE 
    (file_url IS NOT NULL OR audio_file_id IS NOT NULL OR online_link IS NOT NULL)
  ORDER BY id DESC
  LIMIT 10
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Помилка:', err);
    db.close();
    return;
  }
  
  console.log(`Знайдено ${rows.length} книг з форматами:\n`);
  
  rows.forEach(book => {
    console.log(`📖 ID: ${book.id} - ${book.title}`);
    console.log(`   Автор: ${book.author}`);
    
    const formats = [];
    if (book.file_url) formats.push(`📄 Файл (${book.file_type})`);
    if (book.audio_file_id) formats.push('🎧 Аудіо');
    if (book.online_link) formats.push('🌐 Посилання');
    
    console.log(`   Формати: ${formats.join(', ')}`);
    
    if (formats.length > 1) {
      console.log(`   ✅ МУЛЬТИФОРМАТНА КНИГА!`);
    }
    
    console.log('');
  });
  
  // Рахуємо мультиформатні книги
  db.get(`
    SELECT COUNT(*) as count
    FROM books
    WHERE 
      (CASE WHEN file_url IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN audio_file_id IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN online_link IS NOT NULL THEN 1 ELSE 0 END) > 1
  `, [], (err, row) => {
    if (err) {
      console.error('❌ Помилка підрахунку:', err);
    } else {
      console.log(`\n📊 Всього мультиформатних книг: ${row.count}`);
    }
    
    db.close();
  });
});
