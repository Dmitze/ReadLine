/**
 * Скрипт для додавання тестової книги з кількома форматами
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('📚 Додаємо тестову книгу з кількома форматами...\n');

const bookData = {
  title: 'ТЕСТ Мультиформатна книга',
  author: 'Тестовий автор',
  genre: 'Тест',
  description: 'Це тестова книга з файлом, аудіо та посиланням',
  photo_file_id: 'default_book_cover',
  file_url: 'TEST_FILE_ID_12345',
  audio_file_id: 'TEST_AUDIO_ID_67890',
  online_link: 'https://example.com/test-book',
  file_type: 'file',
  file_name: 'test.pdf'
};

db.run(`
  INSERT INTO books (
    title, author, genre, description, photo_file_id,
    file_url, audio_file_id, online_link,
    file_type, file_name, is_available
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
`, [
  bookData.title,
  bookData.author,
  bookData.genre,
  bookData.description,
  bookData.photo_file_id,
  bookData.file_url,
  bookData.audio_file_id,
  bookData.online_link,
  bookData.file_type,
  bookData.file_name
], function(err) {
  if (err) {
    console.error('❌ Помилка:', err);
  } else {
    console.log('✅ Книга додана з ID:', this.lastID);
    
    // Перевіряємо що додалося
    db.get('SELECT * FROM books WHERE id = ?', [this.lastID], (err, book) => {
      if (err) {
        console.error('❌ Помилка читання:', err);
      } else {
        console.log('\n📖 Додана книга:');
        console.log('  Title:', book.title);
        console.log('  file_url:', book.file_url);
        console.log('  audio_file_id:', book.audio_file_id);
        console.log('  online_link:', book.online_link);
        
        const formats = [];
        if (book.file_url) formats.push('📄 Файл');
        if (book.audio_file_id) formats.push('🎧 Аудіо');
        if (book.online_link) formats.push('🌐 Посилання');
        
        console.log('\n✅ Формати:', formats.join(', '));
        console.log('\n🎯 Тепер перевір в боті - має показати ВСІ ТРИ кнопки!');
      }
      db.close();
    });
  }
});
