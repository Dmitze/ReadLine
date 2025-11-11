const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/library.db');

db.all('SELECT id, title, file_type, file_url, file_name FROM books WHERE title LIKE "%Мисливці%"', (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Books found:', rows);
  }
  db.close();
});
