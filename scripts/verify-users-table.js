/**
 * Script to verify users table structure
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/library.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 Checking users table structure...\n');

db.all('PRAGMA table_info(users)', [], (err, columns) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('Users table columns:');
  console.log('─'.repeat(50));
  columns.forEach(col => {
    console.log(`  ✓ ${col.name.padEnd(25)} ${col.type}`);
  });
  console.log('─'.repeat(50));
  
  const columnNames = columns.map(col => col.name.toLowerCase());
  
  // Check required columns
  const required = ['last_active_at', 'user_id', 'has_completed_onboarding'];
  const missing = required.filter(col => !columnNames.includes(col));
  
  if (missing.length === 0) {
    console.log('\n✅ All required columns are present!');
  } else {
    console.log(`\n⚠️  Missing columns: ${missing.join(', ')}`);
  }
  
  db.close();
});

