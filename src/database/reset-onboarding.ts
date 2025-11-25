/**
 * Reset onboarding for a user
 * Allows testing onboarding flow again
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '../../database/library.db');

async function initializeDatabase() {
  return new Promise<void>((resolve, reject) => {
    // Перевіряємо чи файл БД існує
    if (!fs.existsSync(dbPath)) {
      console.log('⚠️ БД не існує. Спочатку запустіть бота: npm start');
      reject(new Error('Database file not found'));
      return;
    }

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Перевіряємо чи таблиця users існує
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
        (err, row) => {
          if (!row) {
            console.log('⚠️ Таблиця users не знайдена. БД не ініціалізована.');
            console.log('Запустіть бота спочатку: npm start');
            db.close();
            reject(new Error('users table not found'));
            return;
          }
          db.close();
          resolve();
        }
      );
    });
  });
}

async function resetOnboarding(telegramId: number) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      const resetSQL = `
        UPDATE users SET 
          is_completed_onboarding = 0,
          favorite_genres = NULL,
          content_types = NULL
        WHERE telegram_id = ?;
      `;

      db.run(resetSQL, [telegramId], function (err) {
        if (err) {
          db.close();
          reject(err);
        } else {
          // Також отримаємо інформацію про користувача для перевірки
          db.get(
            'SELECT telegram_id, username, is_completed_onboarding FROM users WHERE telegram_id = ?',
            [telegramId],
            (err, row: any) => {
              db.close();
              if (err) {
                reject(err);
              } else if (!row) {
                resolve({
                  message: `⚠️ Користувач ${telegramId} не знайдений в БД`,
                  changedRows: 0,
                  found: false
                });
              } else {
                resolve({
                  message: `✅ Онбординг скинутий для @${row.username || telegramId}`,
                  changedRows: this.changes,
                  found: true,
                  user: row
                });
              }
            }
          );
        }
      });
    });
  });
}

// Get telegram_id from command line argument
const telegramId = parseInt(process.argv[2], 10);

if (!telegramId || isNaN(telegramId)) {
  console.error('❌ Помилка: Передайте telegram_id як аргумент');
  console.error('Використання: npm run reset-onboarding -- <telegram_id>');
  console.error('Приклад: npm run reset-onboarding -- 906087418');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔍 Перевіряю БД...');
    await initializeDatabase();
    
    console.log(`🔄 Скидаю онбординг для ${telegramId}...`);
    const result: any = await resetOnboarding(telegramId);
    
    console.log(result.message);
    
    if (!result.found) {
      console.warn('⚠️ Користувач не знайдений в БД');
      console.log('\n💡 Може, ви ще не входили в бота?');
      console.log('Напишіть /start в боту першим разом, потім повторіть команду.');
    } else {
      console.log('✅ Успішно!');
      console.log('📝 Тепер при вході в бота (/start) користувач побачить онбординг заново!');
    }
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Помилка:', err.message || err);
    console.log('\n💡 Можливі рішення:');
    console.log('1. Запустіть бота спочатку: npm start');
    console.log('2. Напишіть /start в боту');
    console.log('3. Потім повторіть: npm run reset-onboarding -- 906087418');
    process.exit(1);
  }
})();
