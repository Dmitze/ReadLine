// Скрипт для відновлення бази даних
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'library.db');
const backupPath = path.join(__dirname, '..', 'data', 'library_backup.db');

console.log('🔧 Перевірка та відновлення бази даних...\n');

// Створити резервну копію
if (fs.existsSync(dbPath)) {
  console.log('📦 Створення резервної копії...');
  fs.copyFileSync(dbPath, backupPath);
  console.log('✅ Резервна копія створена: library_backup.db\n');
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Помилка підключення до БД:', err.message);
    process.exit(1);
  }
  console.log('✅ Підключено до бази даних\n');
});

// Перевірка цілісності
db.get('PRAGMA integrity_check;', (err, row) => {
  if (err) {
    console.error('❌ Помилка перевірки:', err.message);
    console.log('\n🔄 Спроба відновлення...\n');
    
    // Спроба відновлення через експорт/імпорт
    recoverDatabase();
  } else {
    console.log('🔍 Результат перевірки:', row);
    
    if (row.integrity_check === 'ok') {
      console.log('\n✅ База даних в порядку!');
      db.close();
    } else {
      console.log('\n⚠️ Виявлено проблеми. Спроба відновлення...\n');
      recoverDatabase();
    }
  }
});

function recoverDatabase() {
  const recoveredPath = path.join(__dirname, '..', 'data', 'library_recovered.db');
  
  console.log('📋 Експорт даних...');
  
  const recoveredDb = new sqlite3.Database(recoveredPath);
  
  // Отримати схему
  db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
    if (err) {
      console.error('❌ Помилка отримання схеми:', err.message);
      db.close();
      recoveredDb.close();
      return;
    }
    
    console.log(`📊 Знайдено ${tables.length} таблиць`);
    
    // Створити таблиці в новій БД
    let completed = 0;
    tables.forEach((table) => {
      if (table.sql) {
        recoveredDb.run(table.sql, (err) => {
          if (err) {
            console.error(`❌ Помилка створення таблиці: ${err.message}`);
          }
          completed++;
          
          if (completed === tables.length) {
            console.log('✅ Схема відновлена');
            copyData(recoveredDb);
          }
        });
      }
    });
  });
}

function copyData(recoveredDb) {
  console.log('\n📦 Копіювання даних...');
  
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
    if (err) {
      console.error('❌ Помилка:', err.message);
      db.close();
      recoveredDb.close();
      return;
    }
    
    let completed = 0;
    let totalCopied = 0;
    
    tables.forEach((table) => {
      const tableName = table.name;
      
      db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) {
          console.log(`⚠️ Не вдалося скопіювати ${tableName}: ${err.message}`);
          completed++;
        } else {
          if (rows.length > 0) {
            const columns = Object.keys(rows[0]);
            const placeholders = columns.map(() => '?').join(',');
            const insertQuery = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
            
            let inserted = 0;
            rows.forEach((row) => {
              const values = columns.map(col => row[col]);
              recoveredDb.run(insertQuery, values, (err) => {
                if (err) {
                  console.log(`⚠️ Помилка вставки в ${tableName}: ${err.message}`);
                }
                inserted++;
                
                if (inserted === rows.length) {
                  console.log(`✅ ${tableName}: ${rows.length} записів`);
                  totalCopied += rows.length;
                  completed++;
                  
                  if (completed === tables.length) {
                    finishRecovery(recoveredDb, totalCopied);
                  }
                }
              });
            });
          } else {
            console.log(`ℹ️ ${tableName}: порожня таблиця`);
            completed++;
            
            if (completed === tables.length) {
              finishRecovery(recoveredDb, totalCopied);
            }
          }
        }
      });
    });
  });
}

function finishRecovery(recoveredDb, totalCopied) {
  console.log(`\n✅ Відновлено ${totalCopied} записів`);
  
  db.close();
  recoveredDb.close();
  
  console.log('\n🔄 Заміна старої бази на відновлену...');
  
  const dbPath = path.join(__dirname, '..', 'data', 'library.db');
  const recoveredPath = path.join(__dirname, '..', 'data', 'library_recovered.db');
  const oldPath = path.join(__dirname, '..', 'data', 'library_old.db');
  
  // Перейменувати стару БД
  if (fs.existsSync(dbPath)) {
    fs.renameSync(dbPath, oldPath);
  }
  
  // Перейменувати відновлену БД
  fs.renameSync(recoveredPath, dbPath);
  
  console.log('✅ База даних відновлена!');
  console.log('\n📁 Файли:');
  console.log('  - library.db (відновлена база)');
  console.log('  - library_backup.db (резервна копія)');
  console.log('  - library_old.db (стара пошкоджена база)');
  console.log('\n🎉 Готово!');
}
