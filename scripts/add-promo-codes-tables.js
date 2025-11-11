/**
 * Міграція: Додавання таблиць для системи промокодів
 * Запуск: node scripts/add-promo-codes-tables.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/library.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Додавання таблиць для системи промокодів...');

db.serialize(() => {
  // Таблиця промокодів
  db.run(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value REAL NOT NULL DEFAULT 10,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER
    )
  `, (err) => {
    if (err) {
      console.error('❌ Помилка створення таблиці promo_codes:', err);
    } else {
      console.log('✅ Таблиця promo_codes створена');
    }
  });

  // Таблиця використаних промокодів
  db.run(`
    CREATE TABLE IF NOT EXISTS used_promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      promo_code_id INTEGER NOT NULL,
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (promo_code_id) REFERENCES promo_codes (id),
      UNIQUE(user_id, promo_code_id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Помилка створення таблиці used_promo_codes:', err);
    } else {
      console.log('✅ Таблиця used_promo_codes створена');
    }
  });

  // Індекси для оптимізації
  db.run(`CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active)`, (err) => {
    if (err) console.error('❌ Помилка створення індексу idx_promo_codes_active:', err);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_used_promo_codes_user ON used_promo_codes(user_id)`, (err) => {
    if (err) console.error('❌ Помилка створення індексу idx_used_promo_codes_user:', err);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_used_promo_codes_promo ON used_promo_codes(promo_code_id)`, (err) => {
    if (err) console.error('❌ Помилка створення індексу idx_used_promo_codes_promo:', err);
    else console.log('✅ Індекси створені');
  });
});

db.close((err) => {
  if (err) {
    console.error('❌ Помилка закриття БД:', err);
  } else {
    console.log('✅ Міграція завершена успішно!');
    console.log('');
    console.log('📝 Тепер можна використовувати систему промокодів:');
    console.log('   1. Запустіть бота: npm start');
    console.log('   2. Відкрийте /admin');
    console.log('   3. Натисніть "🎁 Керування промокодами"');
  }
});
