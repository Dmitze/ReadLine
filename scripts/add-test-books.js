/**
 * Скрипт для додавання тестових книг в базу даних
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

const testBooks = [
  {
    title: 'Кобзар',
    author: 'Тарас Шевченко',
    genre: 'Поезія',
    description: 'Збірка поезій великого українського поета Тараса Шевченка. Включає найвідоміші твори: "Заповіт", "Думи мої", "Катерина" та інші.',
    photo_file_id: 'default_book_cover',
    is_available: 1,
    rating: 4.8,
    reviews_count: 15,
    downloads_count: 120
  },
  {
    title: 'Лісова пісня',
    author: 'Леся Українка',
    genre: 'Драма',
    description: 'Драма-феєрія про кохання лісової мавки та людини. Один з найкращих творів української літератури.',
    photo_file_id: 'default_book_cover',
    is_available: 1,
    rating: 4.6,
    reviews_count: 8,
    downloads_count: 85
  },
  {
    title: 'Тіні забутих предків',
    author: 'Михайло Коцюбинський',
    genre: 'Повість',
    description: 'Повість про трагічне кохання Івана та Марічки в Карпатах. Шедевр української прози.',
    photo_file_id: 'default_book_cover',
    is_available: 1,
    rating: 4.7,
    reviews_count: 12,
    downloads_count: 95
  },
  {
    title: 'Захар Беркут',
    author: 'Іван Франко',
    genre: 'Історична повість',
    description: 'Історична повість про боротьбу карпатських горян проти монгольської навали в XIII столітті.',
    photo_file_id: 'default_book_cover',
    is_available: 1,
    rating: 4.5,
    reviews_count: 6,
    downloads_count: 70
  },
  {
    title: 'Енеїда',
    author: 'Іван Котляревський',
    genre: 'Поема',
    description: 'Перший твір новою українською літературною мовою. Травестійна поема на основі "Енеїди" Вергілія.',
    photo_file_id: 'default_book_cover',
    is_available: 1,
    rating: 4.3,
    reviews_count: 4,
    downloads_count: 55
  },
  {
    title: 'Дракула',
    author: 'Брем Стокер',
    genre: 'Жахи',
    description: 'Класичний роман жахів про вампіра графа Дракулу. Один з найвідоміших творів готичної літератури.',
    photo_file_id: 'default_book_cover',
    is_available: 1,
    rating: 4.4,
    reviews_count: 18,
    downloads_count: 200
  },
  {
    title: 'Гордість і упередження',
    author: 'Джейн Остін',
    genre: 'Любовний роман',
    description: 'Класичний любовний роман про Елізабет Беннет та містера Дарсі. Шедевр англійської літератури.',
    photo_file_id: 'default_book_cover',
    is_available: 1,
    rating: 4.6,
    reviews_count: 25,
    downloads_count: 180
  }
];

console.log('📚 Додавання тестових книг...');

db.serialize(() => {
  // Спочатку очищуємо таблицю (опціонально)
  // db.run('DELETE FROM books');
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO books (
      title, author, genre, description, photo_file_id, 
      is_available, rating, reviews_count, downloads_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  testBooks.forEach((book, index) => {
    stmt.run([
      book.title,
      book.author,
      book.genre,
      book.description,
      book.photo_file_id,
      book.is_available,
      book.rating,
      book.reviews_count,
      book.downloads_count
    ], function(err) {
      if (err) {
        console.error(`❌ Помилка додавання книги "${book.title}":`, err);
      } else {
        console.log(`✅ Додано книгу: "${book.title}" (ID: ${this.lastID})`);
      }
    });
  });
  
  stmt.finalize();
  
  // Перевіряємо результат
  db.get('SELECT COUNT(*) as count FROM books', (err, row) => {
    if (err) {
      console.error('❌ Помилка підрахунку книг:', err);
    } else {
      console.log(`📊 Всього книг в базі: ${row.count}`);
    }
    
    db.close((err) => {
      if (err) {
        console.error('❌ Помилка закриття БД:', err);
      } else {
        console.log('✅ База даних закрита');
        console.log('🎉 Тестові книги успішно додані!');
      }
    });
  });
});