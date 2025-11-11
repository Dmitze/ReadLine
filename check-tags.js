const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/library.db');

db.all('SELECT b.id, b.title, bt.tag_id, t.name FROM books b LEFT JOIN book_tags bt ON b.id = bt.book_id LEFT JOIN tags t ON bt.tag_id = t.id WHERE b.title LIKE "%Мисливці%"', (err, rows) => {
  if (err) console.error(err);
  else console.log('Tags:', rows);
  db.close();
});
