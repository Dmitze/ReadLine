const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

(async () => {
  try {
    console.log('🔍 Проверка системы тегов...\n');

    const allTags = await allAsync('SELECT COUNT(*) as count FROM tags');
    console.log(`📌 Всього тегів: ${allTags[0].count}`);

    const wrongTags = await allAsync(
      'SELECT id, name FROM tags WHERE name LIKE "% %" ORDER BY name'
    );
    console.log(`⚠️  Теги с пробелами: ${wrongTags.length}`);
    if (wrongTags.length > 0) {
      console.log('❌ ОШИБКА! Найдены неправильные теги:');
      wrongTags.forEach((tag) => {
        console.log(`  - "${tag.name}" (id: ${tag.id})`);
      });
    } else {
      console.log('✅ Нет тегов с пробелами');
    }

    console.log('\n📋 Все теги в БД:');
    const tags = await allAsync('SELECT id, name FROM tags ORDER BY name');
    tags.forEach((tag) => {
      console.log(`  ${tag.id}. "${tag.name}"`);
    });

    console.log('\n✅ Проверка завершена!');
  } catch (err) {
    console.error('❌ Помилка:', err.message);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Помилка закриття БД:', err.message);
      }
      process.exit(0);
    });
  }
})();
