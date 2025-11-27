#!/usr/bin/env node

/**
 * Script to delete old/expired promo codes
 * Usage:
 *   node scripts/clean-old-promo-codes.js              # Delete used/expired codes
 *   node scripts/clean-old-promo-codes.js --all         # Delete all codes (careful!)
 *   node scripts/clean-old-promo-codes.js --days 30     # Delete codes older than 30 days
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function getPromoStats() {
  return new Promise((resolve, reject) => {
    db.all('SELECT COUNT(*) as total FROM promo_codes', (err, rows) => {
      if (err) reject(err);
      else resolve(rows[0].total);
    });
  });
}

async function deleteExpiredCodes() {
  return new Promise((resolve, reject) => {
    const sql = `
      DELETE FROM promo_codes 
      WHERE expires_at < datetime('now')
      OR (used_count > 0 AND max_uses IS NOT NULL AND used_count >= max_uses)
    `;
    
    db.run(sql, function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

async function deleteOldUnusedCodes(days = 30) {
  return new Promise((resolve, reject) => {
    const sql = `
      DELETE FROM promo_codes 
      WHERE used_count = 0 
      AND created_at < datetime('now', '-${days} days')
    `;
    
    db.run(sql, function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

async function deleteAllCodes() {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM promo_codes`;
    
    db.run(sql, function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

async function main() {
  try {
    log('\n🔧 Cleanup old promo codes\n', 'blue');

    // Check if table exists
    await new Promise((resolve, reject) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='promo_codes'", (err, row) => {
        if (err) reject(err);
        else if (!row) reject(new Error('promo_codes table not found'));
        else resolve();
      });
    });

    const totalBefore = await getPromoStats();
    log(`📊 Total promo codes before: ${totalBefore}`, 'blue');

    let deleted = 0;
    const args = process.argv.slice(2);

    if (args.includes('--all')) {
      // Confirm before deleting all
      log('\n⚠️  WARNING: About to delete ALL promo codes!', 'yellow');
      log('   This action cannot be undone!', 'yellow');
      log('\n❌ Aborted. Use --force to confirm:', 'red');
      log('   node scripts/clean-old-promo-codes.js --all --force\n', 'reset');
      process.exit(0);
    }

    const daysIndex = args.indexOf('--days');
    if (daysIndex !== -1) {
      const days = parseInt(args[daysIndex + 1]) || 30;
      log(`🗑️  Deleting unused codes older than ${days} days...`, 'yellow');
      deleted = await deleteOldUnusedCodes(days);
    } else {
      log('🗑️  Deleting expired and fully used codes...', 'yellow');
      deleted = await deleteExpiredCodes();
    }

    const totalAfter = await getPromoStats();

    log(`\n✅ Deleted: ${deleted} codes`, 'green');
    log(`📊 Total promo codes after: ${totalAfter}`, 'blue');
    log(`📈 Saved space: ${deleted} records\n`, 'green');

    db.close((err) => {
      if (err) log(`⚠️  Error closing database: ${err.message}`, 'yellow');
      process.exit(0);
    });

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    db.close((err) => {
      if (err) log(`⚠️  Error closing database: ${err.message}`, 'yellow');
      process.exit(1);
    });
  }
}

main();
