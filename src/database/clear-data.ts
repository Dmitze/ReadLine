/**
 * Script to clear all user data from database
 * Keeps only schema, removes all records
 */

import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/library.db');

async function clearAllData() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      const clearSQL = `
        DELETE FROM used_promo_codes;
        DELETE FROM user_activity;
        DELETE FROM search_history;
        DELETE FROM notifications;
        DELETE FROM statistics;
        DELETE FROM feedback;
        DELETE FROM reviews;
        DELETE FROM saved_books;
        DELETE FROM audio_books;
        DELETE FROM book_tags;
        DELETE FROM tags;
        DELETE FROM promo_codes;
        DELETE FROM books;
        DELETE FROM users;
      `;

      db.exec(clearSQL, (err) => {
        if (err) {
          // Ignore errors for non-existent tables
          if (err.message.includes('no such table')) {
            console.log('Some tables do not exist yet (will be created on startup)');
            db.close();
            resolve('Database will be initialized on next startup');
          } else {
            db.close();
            reject(err);
          }
        } else {
          db.close();
          resolve('Data cleared successfully');
        }
      });
    });
  });
}

if (require.main === module) {
  clearAllData()
    .then((msg) => {
      console.log(msg);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error clearing data:', err);
      process.exit(1);
    });
}

export { clearAllData };
