// Скрипт для исправления неправильных тегов в базе данных
// Удаляет теги с пробелами и добавляет правильные однослівні теги

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🏷️ Исправление системы тегов...\n');

// Используем promise-based подход для правильного порядка операций
const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

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
    // Шаг 1: Создаем таблицы если их еще нет
    console.log('📋 Проверка таблиц...');
    
    await runAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица tags готова');

    await runAsync(`
      CREATE TABLE IF NOT EXISTS book_tags (
        book_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (book_id, tag_id),
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Таблица book_tags готова\n');

    // Шаг 2: Показываем текущие теги с пробелами
    console.log('📋 Текущие теги с пробелами (неправильные):');
    const wrongTags = await allAsync('SELECT id, name FROM tags WHERE name LIKE "% %" ORDER BY name');
    
    if (wrongTags && wrongTags.length > 0) {
      wrongTags.forEach(tag => {
        console.log(`  - "${tag.name}" (id: ${tag.id})`);
      });
    } else {
      console.log('  ✅ Неправильных тегов не найдено!');
    }

    // Шаг 3: Удаляем теги с пробелами
    console.log('\n🗑️ Удаляем неправильные теги с пробелами...');
    const deleteResult = await runAsync('DELETE FROM tags WHERE name LIKE "% %"');
    console.log(`✅ Удалено ${deleteResult.changes} неправильных тегов`);

    // Шаг 4: Добавляем новые правильные теги
    console.log('\n➕ Добавляем новые правильные теги...');
    const baseTags = [
      // Жанри
      'Класика',
      'Фентезі',
      'Детектив',
      'Романтика',
      'Пригоди',
      'Фантастика',
      'Трилер',
      'Жахи',
      'Комедія',
      'Драма',
      
      // Спеціалізовані жанри
      'Психологія',
      'Філософія',
      'Історія',
      'Наука',
      'Бізнес',
      'Саморозвиток',
      
      // Цільова аудиторія
      'Діти',
      'Підлітки',
      'Дорослі',
      'Молодь',
      
      // Популярність
      'Бестселер',
      'Новинка',
      'Рекомендовано',
      'ТОП10',
      
      // Стиль
      'Простий',
      'Складний',
      'Гумористичний',
      'Драматичний',
      'Романтичний',
      
      // Походження
      'Українська',
      'Іноземна',
      'Сучасна',
      'Класична',
      'Переклад',
      
      // Теми
      'Дружба',
      'Сім\'я',
      'Кохання',
      'Успіх',
      'Природа',
      'Подорож',
      'Таємниця',
      'Справедливість',
      'Мужність',
      'Відповідальність',
      
      // Інше
      'Ілюстрована',
      'Графічний_роман',
      'Поезія',
      'Антологія',
      'Спінофф',
      'Серія'
    ];

    let addedCount = 0;
    for (const tag of baseTags) {
      try {
        await runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tag]);
        console.log(`✅ Додано: "${tag}"`);
        addedCount++;
      } catch (err) {
        console.log(`⚠️  Пропущено: "${tag}" (вже існує)`);
      }
    }

    // Шаг 5: Показываем итоговую статистику
    console.log('\n📊 Статистика тегов:');
    const stats = await allAsync('SELECT COUNT(*) as count FROM tags');
    console.log(`  📌 Всього тегів: ${stats[0].count}`);

    const wrongStats = await allAsync('SELECT COUNT(*) as count FROM tags WHERE name LIKE "% %"');
    console.log(`  ⚠️  Неправильних тегів: ${wrongStats[0].count}`);

    console.log('\n✨ Міграція завершена успішно!');
    
  } catch (err) {
    console.error('\n❌ Помилка:', err.message);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Помилка закриття БД:', err.message);
      }
      process.exit(0);
    });
  }
})();
