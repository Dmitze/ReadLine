const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('👤 Пошук адміністраторів...\n');

db.all('SELECT * FROM users ORDER BY user_id ASC', [], (err, rows) => {
  if (err) {
    console.error('❌ Помилка:', err);
    db.close();
    return;
  }

  if (rows.length === 0) {
    console.log('❌ Адміністраторів не знайдено');
    db.close();
    return;
  }

  console.log(`✅ Знайдено користувачів: ${rows.length}\n`);

  rows.forEach((user, i) => {
    console.log(`${i + 1}. User ID: ${user.user_id}`);
    console.log(`   Ім'я: ${user.first_name || 'Unknown'} ${user.last_name || ''}`);
    console.log(`   Username: ${user.username ? '@' + user.username : 'не встановлено'}`);
    console.log(`   Онбординг: ${user.has_completed_onboarding ? 'Завершено' : 'Не завершено'}`);
    console.log('');
  });

  console.log('💡 Використайте User ID для скрипта reset-user-data.js');

  db.close();
});
