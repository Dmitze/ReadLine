/**
 * Complete database reset - deletes all DB files
 */

import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/library.db');
const dbShmPath = path.join(__dirname, '../../database/library.db-shm');
const dbWalPath = path.join(__dirname, '../../database/library.db-wal');
const booksDbPath = path.join(__dirname, '../../database/books.db');

function deleteFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✓ Deleted: ${path.basename(filePath)}`);
      return true;
    }
  } catch (err) {
    console.warn(`✗ Could not delete ${path.basename(filePath)}:`, (err as any).message);
    return false;
  }
  return false;
}

console.log('🔄 Resetting database...');
const files = [dbPath, dbShmPath, dbWalPath, booksDbPath];
let deleted = 0;

for (const file of files) {
  if (deleteFile(file)) {
    deleted++;
  }
}

console.log(`\n✓ Reset complete! Deleted ${deleted} file(s).`);
console.log('📝 Database will be recreated from scratch on next startup.\n');
