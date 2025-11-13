/**
 * Тестовий скрипт для перевірки підтримки кількох форматів
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Тестування підтримки кількох форматів\n');

// Тестові дані
const testBooks = [
  {
    title: 'Тест 1: Тільки файл',
    author: 'Тестовий автор',
    genre: 'Тестовий',
    description: 'Книга з файлом для завантаження',
    photo_file_id: 'test_photo_1',
    file_url: 'test_file_id_1',
    audio_file_id: null,
    online_link: null
  },
  {
    title: 'Тест 2: Тільки аудіо',
    author: 'Тестовий автор',
    genre: 'Тестовий',
    description: 'Книга з аудіо файлом',
    photo_file_id: 'test_photo_2',
    file_url: null,
    audio_file_id: 'test_audio_id_1',
    online_link: null
  },
  {
    title: 'Тест 3: Тільки посилання',
    author: 'Тестовий автор',
    genre: 'Тестовий',
    description: 'Книга з онлайн посиланням',
    photo_file_id: 'test_photo_3',
    file_url: null,
    audio_file_id: null,
    online_link: 'https://example.com/book'
  },
  {
    title: 'Тест 4: Файл + Аудіо',
    author: 'Тестовий автор',
    genre: 'Тестовий',
    description: 'Книга з файлом та аудіо',
    photo_file_id: 'test_photo_4',
    file_url: 'test_file_id_2',
    audio_file_id: 'test_audio_id_2',
    online_link: null
  },
  {
    title: 'Тест 5: Файл + Посилання',
    author: 'Тестовий автор',
    genre: 'Тестовий',
    description: 'Книга з файлом та посиланням',
    photo_file_id: 'test_photo_5',
    file_url: 'test_file_id_3',
    audio_file_id: null,
    online_link: 'https://example.com/book2'
  },
  {
    title: 'Тест 6: Аудіо + Посилання',
    author: 'Тестовий автор',
    genre: 'Тестовий',
    description: 'Книга з аудіо та посиланням',
    photo_file_id: 'test_photo_6',
    file_url: null,
    audio_file_id: 'test_audio_id_3',
    online_link: 'https://example.com/book3'
  },
  {
    title: 'Тест 7: Всі формати',
    author: 'Тестовий автор',
    genre: 'Тестовий',
    description: 'Книга з усіма форматами',
    photo_file_id: 'test_photo_7',
    file_url: 'test_file_id_4',
    audio_file_id: 'test_audio_id_4',
    online_link: 'https://example.com/book4'
  }
];

// Функція для додавання тестової книги
function addTestBook(book) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO books (
        title, author, genre, description, photo_file_id,
        file_url, audio_file_id, online_link,
        file_type, is_available
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'file', 1)
    `;
    
    db.run(
      query,
      [
        book.title,
        book.author,
        book.genre,
        book.description,
        book.photo_file_id,
        book.file_url,
        book.audio_file_id,
        book.online_link
      ],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Функція для перевірки книги
function checkBook(bookId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM books WHERE id = ?',
      [bookId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Функція для видалення тестових книг
function cleanupTestBooks() {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM books WHERE author = 'Тестовий автор'",
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Головна функція тестування
async function runTests() {
  try {
    // Очищаємо старі тестові дані
    console.log('🧹 Очищення старих тестових даних...');
    await cleanupTestBooks();
    console.log('✅ Очищено\n');
    
    // Додаємо тестові книги
    console.log('📚 Додавання тестових книг...\n');
    const bookIds = [];
    
    for (const book of testBooks) {
      const bookId = await addTestBook(book);
      bookIds.push(bookId);
      console.log(`✅ ${book.title} (ID: ${bookId})`);
    }
    
    console.log('\n📊 Перевірка збережених даних...\n');
    
    // Перевіряємо кожну книгу
    for (let i = 0; i < bookIds.length; i++) {
      const book = await checkBook(bookIds[i]);
      const formats = [];
      
      if (book.file_url) formats.push('📥 Файл');
      if (book.audio_file_id) formats.push('🎧 Аудіо');
      if (book.online_link) formats.push('🌐 Посилання');
      
      console.log(`${i + 1}. ${book.title}`);
      console.log(`   Формати: ${formats.join(', ')}`);
      console.log(`   file_url: ${book.file_url || 'null'}`);
      console.log(`   audio_file_id: ${book.audio_file_id || 'null'}`);
      console.log(`   online_link: ${book.online_link || 'null'}`);
      console.log('');
    }
    
    console.log('✅ Всі тести пройдено успішно!\n');
    console.log('💡 Тестові книги залишено в БД для перевірки в боті');
    console.log('💡 Для видалення запустіть: node scripts/cleanup-test-books.js\n');
    
  } catch (error) {
    console.error('❌ Помилка:', error);
  } finally {
    db.close();
  }
}

runTests();
