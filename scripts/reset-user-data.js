/**
 * Скрипт для очищення даних користувача
 * Видаляє: збережені книги, відгуки, історію прослуховування, використані промокоди
 * Залишає: книги, адмін права, промокоди
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔄 Скрипт очищення даних користувача\n');

rl.question('Введіть ваш Telegram User ID: ', (userId) => {
  if (!userId || isNaN(userId)) {
    console.error('❌ Невірний User ID');
    rl.close();
    db.close();
    return;
  }

  console.log(`\n📊 Перевірка даних для User ID: ${userId}\n`);

  // Перевіряємо що існує
  db.serialize(() => {
    // Перевірка користувача
    db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
      if (err) {
        console.error('❌ Помилка:', err);
        rl.close();
        db.close();
        return;
      }

      if (!user) {
        console.error('❌ Користувача не знайдено');
        rl.close();
        db.close();
        return;
      }

      console.log(`✅ Користувач знайдений: ${user.first_name || 'Unknown'}`);
      console.log(`   Адмін: ${user.is_admin ? 'Так' : 'Ні'}`);

      // Підрахунок даних
      db.get('SELECT COUNT(*) as count FROM saved_books WHERE user_id = ?', [userId], (err, saved) => {
        if (err) console.error('Помилка підрахунку збережених книг:', err);
        else console.log(`   Збережених книг: ${saved.count}`);
      });

      db.get('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?', [userId], (err, reviews) => {
        if (err) console.error('Помилка підрахунку відгуків:', err);
        else console.log(`   Відгуків: ${reviews.count}`);
      });

      db.get('SELECT COUNT(*) as count FROM used_promo_codes WHERE user_id = ?', [userId], (err, promos) => {
        if (err) console.error('Помилка підрахунку промокодів:', err);
        else console.log(`   Використаних промокодів: ${promos ? promos.count : 0}`);
      });

      console.log('\n⚠️  УВАГА! Буде видалено:');
      console.log('   • Збережені книги');
      console.log('   • Відгуки');
      console.log('   • Історія прослуховування');
      console.log('   • Використані промокоди');
      console.log('   • Онбординг буде скинутий');
      console.log('\n✅ Залишиться:');
      console.log('   • Всі книги в каталозі');
      console.log('   • Адмін права');
      console.log('   • Промокоди в системі');

      rl.question('\nПродовжити? (yes/no): ', (answer) => {
        if (answer.toLowerCase() !== 'yes') {
          console.log('❌ Скасовано');
          rl.close();
          db.close();
          return;
        }

        console.log('\n🔄 Очищення даних...\n');

        db.serialize(() => {
          // Видаляємо збережені книги
          db.run('DELETE FROM saved_books WHERE user_id = ?', [userId], function(err) {
            if (err) console.error('❌ Помилка видалення збережених книг:', err);
            else console.log(`✅ Видалено збережених книг: ${this.changes}`);
          });

          // Видаляємо відгуки
          db.run('DELETE FROM reviews WHERE user_id = ?', [userId], function(err) {
            if (err) console.error('❌ Помилка видалення відгуків:', err);
            else console.log(`✅ Видалено відгуків: ${this.changes}`);
          });

          // Видаляємо історію прослуховування
          db.run('DELETE FROM listening_progress WHERE user_id = ?', [userId], function(err) {
            if (err) console.error('❌ Помилка видалення історії прослуховування:', err);
            else console.log(`✅ Видалено історію прослуховування: ${this.changes}`);
          });

          // Видаляємо використані промокоди
          db.run('DELETE FROM used_promo_codes WHERE user_id = ?', [userId], function(err) {
            if (err) console.error('❌ Помилка видалення промокодів:', err);
            else console.log(`✅ Видалено використаних промокодів: ${this.changes}`);
          });

          // Скидаємо онбординг та улюблені жанри
          db.run(
            'UPDATE users SET has_completed_onboarding = 0, favorite_genres = NULL WHERE user_id = ?',
            [userId],
            function(err) {
              if (err) console.error('❌ Помилка скидання онбордингу:', err);
              else console.log(`✅ Онбординг скинутий`);

              console.log('\n✅ Очищення завершено!');
              console.log('\n💡 Тепер ви можете:');
              console.log('   1. Перезапустити бота: npm start');
              console.log('   2. Натиснути /start');
              console.log('   3. Пройти онбординг заново');

              rl.close();
              db.close();
            }
          );
        });
      });
    });
  });
});
