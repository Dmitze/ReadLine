/**
 * Тестовий скрипт для перевірки промокодів
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Перевірка промокодів...\n');

// Перевірка таблиць
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='promo_codes'", (err, row) => {
  if (err) {
    console.error('❌ Помилка перевірки таблиці promo_codes:', err);
  } else if (row) {
    console.log('✅ Таблиця promo_codes існує');
    
    // Перевірка промокодів
    db.all('SELECT * FROM promo_codes', (err, rows) => {
      if (err) {
        console.error('❌ Помилка читання промокодів:', err);
      } else {
        console.log(`\n📊 Всього промокодів: ${rows.length}\n`);
        
        if (rows.length > 0) {
          rows.forEach((row, i) => {
            console.log(`${i + 1}. Код: ${row.code}`);
            console.log(`   ID: ${row.id}`);
            console.log(`   Активний: ${row.is_active ? 'Так' : 'Ні'}`);
            console.log(`   Створено: ${row.created_at}`);
            console.log('');
          });
        } else {
          console.log('⚠️ Промокодів немає в базі даних!');
          console.log('\n💡 Додайте промокод через адмін-панель:');
          console.log('   1. Запустіть бота');
          console.log('   2. Відкрийте /admin');
          console.log('   3. Натисніть "🎁 Керування промокодами"');
          console.log('   4. Натисніть "➕ Додати промокод"');
        }
        
        // Перевірка використаних промокодів
        db.all('SELECT * FROM used_promo_codes', (err, usedRows) => {
          if (err) {
            console.error('❌ Помилка читання використаних промокодів:', err);
          } else {
            console.log(`\n📊 Використано промокодів: ${usedRows.length}\n`);
            
            if (usedRows.length > 0) {
              usedRows.forEach((row, i) => {
                console.log(`${i + 1}. User ID: ${row.user_id}, Promo ID: ${row.promo_code_id}`);
              });
            }
          }
          
          // Перевірка доступних промокодів
          const query = `
            SELECT COUNT(*) as count
            FROM promo_codes pc
            WHERE pc.is_active = 1
            AND pc.id NOT IN (SELECT promo_code_id FROM used_promo_codes)
          `;
          
          db.get(query, [], (err, row) => {
            if (err) {
              console.error('❌ Помилка підрахунку доступних промокодів:', err);
            } else {
              console.log(`\n✅ Доступних промокодів: ${row.count}\n`);
            }
            
            db.close();
          });
        });
      }
    });
  } else {
    console.error('❌ Таблиця promo_codes не існує!');
    console.log('\n💡 Запустіть міграцію:');
    console.log('   node scripts/add-promo-codes-tables.js');
    db.close();
  }
});
