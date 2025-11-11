/**
 * Скрипт для очищення даних користувача 906087418
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

const userId = 906087418;

console.log('🔄 Очищення даних користувача...\n');

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
      console.log('   1. Перезапустити бота');
      console.log('   2. Натиснути /start');
      console.log('   3. Пройти онбординг заново');
      console.log('   4. Протестувати промокоди');

      db.close();
    }
  );
});
