/**
 * Скрипт для перевірки структури таблиці books
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Перевірка структури таблиці books...\n');

db.all(`PRAGMA table_info(books)`, [], (err, columns) => {
  if (err) {
    console.error('❌ Помилка:', err);
    db.close();
    return;
  }
  
  console.log('Колонки в таблиці books:\n');
  
  columns.forEach(col => {
    console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  console.log('\n');
  
  // Перевіряємо чи є потрібні поля
  const hasAudioFileId = columns.some(col => col.name === 'audio_file_id');
  const hasOnlineLink = columns.some(col => col.name === 'online_link');
  
  if (!hasAudioFileId) {
    console.log('❌ Поле audio_file_id ВІДСУТНЄ!');
  } else {
    console.log('✅ Поле audio_file_id є');
  }
  
  if (!hasOnlineLink) {
    console.log('❌ Поле online_link ВІДСУТНЄ!');
  } else {
    console.log('✅ Поле online_link є');
  }
  
  db.close();
});
