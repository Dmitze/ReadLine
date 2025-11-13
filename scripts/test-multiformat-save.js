/**
 * Тест збереження мультиформатної книги
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Тестуємо збереження мультиформатної книги...\n');

// Симулюємо дані які мають зберегтися
const testData = {
  title: 'ТЕСТ Автоматичний',
  author: 'Тестовий Автор',
  genre: 'Тест',
  description: 'Автоматичний тест збереження',
  photo_file_id: 'test_photo',
  file_url: 'TEST_FILE_123',
  audio_file_id: 'TEST_AUDIO_456',
  online_link: 'https://test.com/book',
  file_type: 'file',
  file_name: 'test.pdf'
};

console.log('📝 Дані для збереження:');
console.log('  file_url:', testData.file_url);
console.log('  audio_file_id:', testData.audio_file_id);
console.log('  online_link:', testData.online_link);
console.log('');

db.run(`
  INSERT INTO books (
    title, author, genre, description, photo_file_id,
    file_url, audio_file_id, online_link,
    file_type, file_name, is_available
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
`, [
  testData.title,
  testData.author,
  testData.genre,
  testData.description,
  testData.photo_file_id,
  testData.file_url,
  testData.audio_file_id,
  testData.online_link,
  testData.file_type,
  testData.file_name
], function(err) {
  if (err) {
    console.error('❌ Помилка збереження:', err);
    db.close();
    return;
  }
  
  const bookId = this.lastID;
  console.log('✅ Книга збережена з ID:', bookId);
  
  // Перевіряємо що збереглося
  db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, book) => {
    if (err) {
      console.error('❌ Помилка читання:', err);
    } else {
      console.log('\n📖 Перевірка збережених даних:');
      console.log('  file_url:', book.file_url, book.file_url === testData.file_url ? '✅' : '❌');
      console.log('  audio_file_id:', book.audio_file_id, book.audio_file_id === testData.audio_file_id ? '✅' : '❌');
      console.log('  online_link:', book.online_link, book.online_link === testData.online_link ? '✅' : '❌');
      
      if (book.file_url && book.audio_file_id && book.online_link) {
        console.log('\n🎉 ВСІ ТРИ ПОЛЯ ЗБЕРЕЖЕНІ ПРАВИЛЬНО!');
        console.log('📊 Тепер перевір в боті - має показати 3 кнопки');
      } else {
        console.log('\n❌ ПОМИЛКА: Не всі поля збереглися');
      }
    }
    db.close();
  });
});
