const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/library.db');

db.all('SELECT id, title, file_url, audio_file_id, online_link FROM books ORDER BY id DESC LIMIT 5', [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Останні 5 книг:\n');
    rows.forEach(b => {
      console.log(`ID ${b.id}: ${b.title}`);
      console.log(`  file_url: ${b.file_url || 'NULL'}`);
      console.log(`  audio_file_id: ${b.audio_file_id || 'NULL'}`);
      console.log(`  online_link: ${b.online_link || 'NULL'}\n`);
    });
  }
  db.close();
});
