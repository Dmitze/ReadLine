#!/usr/bin/env node

/**
 * Database Backup Script
 * Створює резервну копію бази даних SQLite
 */

const fs = require('fs');
const path = require('path');

// Завантажуємо змінні оточення
require('dotenv').config();

// Кольори для консолі
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createBackup() {
  try {
    log('🔄 Початок резервного копіювання...', 'blue');

    // Шлях до оригінальної БД
    const dbPath = process.env.DB_PATH || './database/library.db';
    const fullDbPath = path.resolve(dbPath);

    // Перевіряємо чи існує БД
    if (!fs.existsSync(fullDbPath)) {
      log(`❌ База даних не знайдена: ${fullDbPath}`, 'red');
      log('💡 Спочатку запустіть бота щоб створити БД', 'yellow');
      process.exit(1);
    }

    // Створюємо папку для backup якщо не існує
    const backupDir = path.resolve('./backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      log(`📁 Створено папку для backup: ${backupDir}`, 'green');
    }

    // Генеруємо ім'я файлу з timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    
    const backupFileName = `library-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    // Отримуємо розмір файлу
    const stats = fs.statSync(fullDbPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);

    // Копіюємо файл
    fs.copyFileSync(fullDbPath, backupPath);

    // Перевіряємо що копія створена успішно
    if (fs.existsSync(backupPath)) {
      const backupStats = fs.statSync(backupPath);
      const backupSizeInKB = (backupStats.size / 1024).toFixed(2);

      log('', 'reset');
      log('✅ Backup успішно створено!', 'green');
      log('', 'reset');
      log('📊 Деталі:', 'blue');
      log(`   Оригінальна БД: ${fullDbPath}`, 'reset');
      log(`   Розмір: ${fileSizeInKB} KB`, 'reset');
      log('', 'reset');
      log(`   Backup файл: ${backupPath}`, 'reset');
      log(`   Розмір: ${backupSizeInKB} KB`, 'reset');
      log('', 'reset');

      // Показуємо список всіх backup файлів
      const backupFiles = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.db'))
        .sort()
        .reverse();

      if (backupFiles.length > 0) {
        log(`📚 Усього backup файлів: ${backupFiles.length}`, 'yellow');
        log('', 'reset');
        
        if (backupFiles.length > 5) {
          log('⚠️  Рекомендація: У вас більше 5 backup файлів.', 'yellow');
          log('   Видаліть старі backup щоб зберегти місце:', 'yellow');
          log(`   rm ${path.join(backupDir, backupFiles[backupFiles.length - 1])}`, 'reset');
          log('', 'reset');
        }
      }

      // Інструкції для відновлення
      log('💡 Для відновлення з backup:', 'blue');
      log('   1. Зупиніть бота', 'reset');
      log('   2. Скопіюйте backup:', 'reset');
      log(`      cp ${backupPath} ${fullDbPath}`, 'reset');
      log('   3. Запустіть бота', 'reset');
      log('', 'reset');

      process.exit(0);
    } else {
      log('❌ Помилка: backup файл не створено', 'red');
      process.exit(1);
    }

  } catch (error) {
    log('❌ Помилка при створенні backup:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('', 'reset');
      log('Stack trace:', 'yellow');
      log(error.stack, 'reset');
    }
    process.exit(1);
  }
}

// Запускаємо backup
createBackup();
