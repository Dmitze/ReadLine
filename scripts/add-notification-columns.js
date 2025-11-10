// Міграція: додавання колонок для системи сповіщень
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database/library.db';

console.log('🔔 Додавання колонок для системи сповіщень...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Помилка підключення до БД:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Підключено до БД');
  
  // Перевіряємо чи існують колонки
  db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
    if (err) {
      console.error('❌ Помилка перевірки структури:', err.message);
      db.close();
      process.exit(1);
    }
    
    const columnNames = columns.map(col => col.name);
    const columnsToAdd = [];
    
    if (!columnNames.includes('notification_frequency')) {
      columnsToAdd.push({
        name: 'notification_frequency',
        sql: `ALTER TABLE users ADD COLUMN notification_frequency TEXT DEFAULT 'weekly'`
      });
    }
    
    if (!columnNames.includes('notifications_enabled')) {
      columnsToAdd.push({
        name: 'notifications_enabled',
        sql: `ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1`
      });
    }
    
    if (!columnNames.includes('last_notification_at')) {
      columnsToAdd.push({
        name: 'last_notification_at',
        sql: `ALTER TABLE users ADD COLUMN last_notification_at DATETIME`
      });
    }
    
    if (!columnNames.includes('notification_time')) {
      columnsToAdd.push({
        name: 'notification_time',
        sql: `ALTER TABLE users ADD COLUMN notification_time TEXT DEFAULT '10:00'`
      });
    }
    
    if (columnsToAdd.length === 0) {
      console.log('✅ Всі колонки вже існують');
      
      // Показуємо структуру таблиці
      console.log('\n📊 Структура таблиці users:');
      columns.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
      
      console.log('\n✅ Міграція завершена успішно!');
      db.close();
      return;
    }
    
    console.log(`📝 Потрібно додати ${columnsToAdd.length} колонок\n`);
    
    // Додаємо колонки послідовно
    let completed = 0;
    
    const addNextColumn = () => {
      if (completed >= columnsToAdd.length) {
        // Всі колонки додано
        console.log('\n✅ Всі колонки успішно додано');
        
        // Показуємо оновлену структуру
        db.all(`PRAGMA table_info(users)`, [], (err, updatedColumns) => {
          if (err) {
            console.error('❌ Помилка отримання структури:', err.message);
          } else {
            console.log('\n📊 Оновлена структура таблиці users:');
            updatedColumns.forEach(col => {
              console.log(`   - ${col.name} (${col.type})`);
            });
          }
          
          console.log('\n✅ Міграція завершена успішно!');
          db.close();
        });
        return;
      }
      
      const column = columnsToAdd[completed];
      console.log(`   Додаю колонку: ${column.name}...`);
      
      db.run(column.sql, [], (err) => {
        if (err) {
          console.error(`   ❌ Помилка додавання ${column.name}:`, err.message);
          db.close();
          process.exit(1);
        }
        
        console.log(`   ✅ Колонка ${column.name} додана`);
        completed++;
        addNextColumn();
      });
    };
    
    addNextColumn();
  });
});
