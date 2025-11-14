// Скрипт для додавання таблиць тегів
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🏷️ Додавання таблиць для системи тегів...');

db.serialize(() => {
  // Таблиця тегів
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Помилка створення таблиці tags:', err);
    } else {
      console.log('✅ Таблиця tags створена');
    }
  });

  // Таблиця зв'язків книг та тегів
  db.run(`
    CREATE TABLE IF NOT EXISTS book_tags (
      book_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (book_id, tag_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Помилка створення таблиці book_tags:', err);
    } else {
      console.log('✅ Таблиця book_tags створена');
    }
  });

  // Додаємо базові теги - однослівні (максимум 2 слова без пробілів)
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

  const stmt = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  
  baseTags.forEach(tag => {
    stmt.run(tag, (err) => {
      if (err) {
        console.error(`❌ Помилка додавання тегу "${tag}":`, err);
      } else {
        console.log(`✅ Тег "${tag}" додано`);
      }
    });
  });
  
  stmt.finalize();

  console.log('\n✅ Міграція завершена!');
  console.log('📊 Створено:');
  console.log('  - Таблиця tags');
  console.log('  - Таблиця book_tags');
  console.log(`  - ${baseTags.length} базових тегів`);
});

db.close();
