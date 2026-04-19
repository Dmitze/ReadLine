const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/library.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adding last_active_at column to users table...\n');

db.serialize(() => {
  db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
    if (err) {
      console.error('❌ Error checking table structure:', err.message);
      db.close();
      process.exit(1);
    }

    const columnNames = columns.map((col) => col.name.toLowerCase());

    if (columnNames.includes('last_active_at')) {
      console.log('✅ Column last_active_at already exists');
      db.close();
      return;
    }

    console.log('📝 Adding last_active_at column...');
    db.run(
      `ALTER TABLE users ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
      (err) => {
        if (err) {
          console.error('❌ Error adding column:', err.message);
          db.close();
          process.exit(1);
        }

        console.log('✅ Column last_active_at added successfully');

        if (!columnNames.includes('user_id')) {
          console.log('📝 Adding user_id column...');

          if (columnNames.includes('telegram_id')) {
            db.run(`ALTER TABLE users ADD COLUMN user_id INTEGER`, (err2) => {
              if (err2) {
                console.error('❌ Error adding user_id column:', err2.message);
              } else {
                db.run(`UPDATE users SET user_id = telegram_id WHERE user_id IS NULL`, (err3) => {
                  if (err3) {
                    console.error('❌ Error copying telegram_id to user_id:', err3.message);
                  } else {
                    console.log('✅ Column user_id added and data copied from telegram_id');
                  }

                  db.run(
                    `CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)`,
                    (err4) => {
                      if (err4) {
                        console.error('❌ Error creating index:', err4.message);
                      } else {
                        console.log('✅ Index on user_id created');
                      }
                      db.close();
                    }
                  );
                });
              }
            });
          } else {
            db.run(`ALTER TABLE users ADD COLUMN user_id INTEGER UNIQUE`, (err2) => {
              if (err2) {
                console.error('❌ Error adding user_id column:', err2.message);
              } else {
                console.log('✅ Column user_id added');
                db.run(`CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)`, (err3) => {
                  if (err3) {
                    console.error('❌ Error creating index:', err3.message);
                  } else {
                    console.log('✅ Index on user_id created');
                  }
                  db.close();
                });
              }
            });
          }
        } else {
          console.log('✅ Column user_id already exists');
          db.close();
        }
      }
    );
  });
});

db.on('error', (err) => {
  console.error('❌ Database error:', err.message);
  process.exit(1);
});
