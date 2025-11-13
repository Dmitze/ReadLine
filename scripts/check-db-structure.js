const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/library.db');

console.log('🔍 Перевірка структури таблиці books...\n');

db.all("PRAGMA table_info(books)", [], (err, columns) => {
  if (err) {
    console.error('❌ Помилка:', err);
    db.close();
    return;
  }
  
  console.log('📊 Колонки таблиці books:\n');
  
  const importantFields = ['file_url', 'audio_file_id', 'online_link', 'file_type', 'file_name'];
  
  columns.forEach(col => {
    const isImportant = importantFields.includes(col.name);
    const marker = isImportant ? '✅' : '  ';
    console.log(`${marker} ${col.name} (${col.type})`);
  });
  
  console.log('\n📝 Перевірка наявності потрібних полів:');
  
  const hasFileUrl = columns.some(col => col.name === 'file_url');
  const hasAudioFileId = columns.some(col => col.name === 'audio_file_id');
  const hasOnlineLink = columns.some(col => col.name === 'online_link');
  
  console.log(`${hasFileUrl ? '✅' : '❌'} file_url - для файлу книги`);
  console.log(`${hasAudioFileId ? '✅' : '❌'} audio_file_id - для аудіо`);
  console.log(`${hasOnlineLink ? '✅' : '❌'} online_link - для посилання`);
  
  if (hasFileUrl && hasAudioFileId && hasOnlineLink) {
    console.log('\n✅ Всі потрібні поля присутні! Можна продовжувати.');
  } else {
    console.log('\n❌ Потрібно запустити міграцію!');
  }
  
  db.close();
});
