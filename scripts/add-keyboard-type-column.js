const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database/library.db';

console.log('🔧 Додавання колонки keyboard_type до таблиці users...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Помилка підключення до БД:', err.message);
    process.exit(1);
  }

  console.log('✅ Підключено до БД');

  db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
    if (err) {
      console.error('❌ Помилка перевірки структури:', err.message);
      db.close();
      process.exit(1);
    }

    const hasKeyboardType = columns.some((col) => col.name === 'keyboard_type');

    if (hasKeyboardType) {
      console.log('✅ Колонка keyboard_type вже існує');

      console.log('\n📊 Структура таблиці users:');
      columns.forEach((col) => {
        console.log(`   - ${col.name} (${col.type})`);
      });

      console.log('\n✅ Міграція завершена успішно!');
      db.close();
    } else {
      db.run(
        `
        ALTER TABLE users ADD COLUMN keyboard_type TEXT DEFAULT 'mobile'
      `,
        [],
        (err) => {
          if (err) {
            console.error('❌ Помилка додавання колонки:', err.message);
            db.close();
            process.exit(1);
          }

          console.log('✅ Колонка keyboard_type успішно додана');
          console.log('   Значення за замовчуванням: mobile');

          db.all(`PRAGMA table_info(users)`, [], (err, updatedColumns) => {
            if (err) {
              console.error('❌ Помилка отримання структури:', err.message);
            } else {
              console.log('\n📊 Структура таблиці users:');
              updatedColumns.forEach((col) => {
                console.log(`   - ${col.name} (${col.type})`);
              });
            }

            console.log('\n✅ Міграція завершена успішно!');
            db.close();
          });
        }
      );
    }
  });
});
