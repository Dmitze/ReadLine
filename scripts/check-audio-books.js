const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/library.db');

console.log('🔍 Перевірка аудіокниг в БД...\n');

// Перевіряємо всі книги з file_type = 'audio'
db.all('SELECT * FROM books WHERE file_type = "audio"', [], (err, rows) => {
  if (err) {
    console.error('❌ Помилка:', err);
    db.close();
    return;
  }
  
  console.log(`📊 Всього аудіокниг: ${rows.length}\n`);
  
  rows.forEach((book) => {
    console.log(`📖 "${book.title}"`);
    console.log(`   is_available: ${book.is_available}`);
  });
  console.log('');
});

// Перевіряємо аудіокниги які доступні
db.all('SELECT * FROM books WHERE file_type = "audio" AND is_available = 1', [], (err, rows) => {
  if (err) {
    console.error('❌ Помилка:', err);
    db.close();
    return;
  }
  
  console.log(`📊 Знайдено ${rows.length} книг з file_type = "audio"\n`);
  
  if (rows.length > 0) {
    rows.forEach((book, index) => {
      console.log(`${index + 1}. "${book.title}" by ${book.author}`);
      console.log(`   ID: ${book.id}`);
      console.log(`   file_type: ${book.file_type}`);
      console.log(`   file_url: ${book.file_url ? 'Є' : 'Немає'}`);
      console.log(`   audio_file_id: ${book.audio_file_id || 'NULL'}`);
      console.log('');
    });
  }
  
  // Перевіряємо книги з audio_file_id
  db.all('SELECT * FROM books WHERE audio_file_id IS NOT NULL', [], (err2, rows2) => {
    if (err2) {
      console.error('❌ Помилка:', err2);
      db.close();
      return;
    }
    
    console.log(`📊 Знайдено ${rows2.length} книг з audio_file_id\n`);
    
    if (rows2.length > 0) {
      rows2.forEach((book, index) => {
        console.log(`${index + 1}. "${book.title}" by ${book.author}`);
        console.log(`   ID: ${book.id}`);
        console.log(`   audio_file_id: ${book.audio_file_id}`);
        console.log('');
      });
    }
    
    // Шукаємо книгу "Людина у пошуках"
    db.all('SELECT * FROM books WHERE title LIKE "%Людина%"', [], (err3, rows3) => {
      if (err3) {
        console.error('❌ Помилка:', err3);
      } else {
        console.log(`📚 Книги з "Людина" в назві: ${rows3.length}\n`);
        if (rows3.length > 0) {
          rows3.forEach((book) => {
            console.log(`📖 "${book.title}"`);
            console.log(`   ID: ${book.id}`);
            console.log(`   file_type: ${book.file_type}`);
            console.log(`   file_url: ${book.file_url ? book.file_url.substring(0, 50) + '...' : 'NULL'}`);
            console.log(`   audio_file_id: ${book.audio_file_id || 'NULL'}`);
            console.log('');
          });
        }
      }
      
      db.close();
    });
  });
});
