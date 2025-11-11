const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/library.db');

// Виправляємо книги з аудіо файлами
db.run(`UPDATE books SET file_type = 'audio' WHERE file_name LIKE '%.mp3' OR file_name LIKE '%.m4a' OR file_name LIKE '%.ogg'`, (err) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('✅ Fixed audio books!');
    
    // Перевіряємо результат
    db.all('SELECT id, title, file_type FROM books WHERE file_type = "audio"', (err, rows) => {
      if (err) {
        console.error(err);
      } else {
        console.log('Audio books:', rows);
      }
      db.close();
    });
  }
});
