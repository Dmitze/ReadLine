/**
 * Script to add users table for tracking onboarding status
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/library.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 Adding users table...');

db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      has_completed_onboarding BOOLEAN DEFAULT 0,
      favorite_genres TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating users table:', err);
    } else {
      console.log('✅ Users table created successfully');
    }
  });

  // Create index on user_id for faster lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)
  `, (err) => {
    if (err) {
      console.error('❌ Error creating index:', err);
    } else {
      console.log('✅ Index on user_id created');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('❌ Error closing database:', err);
  } else {
    console.log('✅ Database closed');
    console.log('🎉 Users table setup complete!');
  }
});
