// Script to remove requests table from database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || './database/library.db';

console.log('🗑️  Видалення таблиці requests...');
console.log('📁 База даних:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Помилка підключення до БД:', err);
    process.exit(1);
  }
  console.log('✅ Підключено до БД');
});

db.serialize(() => {
  // Перевіряємо чи існує таблиця
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='requests'", (err, row) => {
    if (err) {
      console.error('❌ Помилка перевірки таблиці:', err);
      db.close();
      process.exit(1);
    }
    
    if (!row) {
      console.log('ℹ️  Таблиця requests не існує');
      db.close();
      return;
    }
    
    // Підраховуємо кількість записів
    db.get("SELECT COUNT(*) as count FROM requests", (err, countRow) => {
      if (err) {
        console.error('❌ Помилка підрахунку записів:', err);
        db.close();
        process.exit(1);
      }
      
      console.log(`📊 Знайдено ${countRow.count} записів в таблиці requests`);
      
      // Видаляємо таблицю
      db.run("DROP TABLE requests", (err) => {
        if (err) {
          console.error('❌ Помилка видалення таблиці:', err);
          db.close();
          process.exit(1);
        }
        
        console.log('✅ Таблицю requests успішно видалено!');
        console.log('🎉 Міграція завершена');
        
        db.close((err) => {
          if (err) {
            console.error('❌ Помилка закриття БД:', err);
            process.exit(1);
          }
          console.log('✅ З\'єднання з БД закрито');
        });
      });
    });
  });
});
