/**
 * Script to add has_completed_onboarding column to users table
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/library.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adding has_completed_onboarding column to users table...\n');

db.serialize(() => {
  // Check if column already exists
  db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
    if (err) {
      console.error('❌ Error checking table structure:', err.message);
      db.close();
      process.exit(1);
    }
    
    const columnNames = columns.map(col => col.name.toLowerCase());
    
    if (columnNames.includes('has_completed_onboarding')) {
      console.log('✅ Column has_completed_onboarding already exists');
      db.close();
      return;
    }
    
    // Add the column
    console.log('📝 Adding has_completed_onboarding column...');
    
    // Check if is_completed_onboarding exists to copy from it
    if (columnNames.includes('is_completed_onboarding')) {
      db.run(
        `ALTER TABLE users ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT 0`,
        (err) => {
          if (err) {
            console.error('❌ Error adding column:', err.message);
            db.close();
            process.exit(1);
          }
          
          console.log('✅ Column has_completed_onboarding added');
          console.log('📝 Copying data from is_completed_onboarding...');
          
          db.run(
            `UPDATE users SET has_completed_onboarding = is_completed_onboarding WHERE has_completed_onboarding IS NULL`,
            (err2) => {
              if (err2) {
                console.error('❌ Error copying data:', err2.message);
              } else {
                console.log('✅ Data copied successfully');
              }
              db.close();
            }
          );
        }
      );
    } else {
      db.run(
        `ALTER TABLE users ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT 0`,
        (err) => {
          if (err) {
            console.error('❌ Error adding column:', err.message);
            db.close();
            process.exit(1);
          }
          
          console.log('✅ Column has_completed_onboarding added successfully');
          db.close();
        }
      );
    }
  });
});

db.on('error', (err) => {
  console.error('❌ Database error:', err.message);
  process.exit(1);
});

