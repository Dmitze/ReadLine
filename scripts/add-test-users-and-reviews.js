/**
 * Додавання тестових користувачів, збережених книг та відгуків
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

// Тестові користувачі
const testUsers = [
  { user_id: 123456789, username: 'book_lover', first_name: 'Олексій', last_name: 'Читач' },
  { user_id: 987654321, username: 'reader_anna', first_name: 'Анна', last_name: 'Книголюб' },
  { user_id: 555666777, username: 'literary_fan', first_name: 'Петро', last_name: 'Літературник' },
  { user_id: 111222333, username: 'bookworm', first_name: 'Марія', last_name: 'Бібліофіл' },
  { user_id: 444555666, username: 'story_seeker', first_name: 'Іван', last_name: 'Оповідач' }
];

// Тестові відгуки
const testReviews = [
  { rating: 5, comment: 'Неймовірна книга! Читав на одному диханні. Рекомендую всім!' },
  { rating: 4, comment: 'Дуже цікаво написано, хоча кінцівка трохи передбачувана.' },
  { rating: 5, comment: 'Класика завжди актуальна. Прекрасний переклад!' },
  { rating: 3, comment: 'Непогано, але очікував більшого від цього автора.' },
  { rating: 4, comment: 'Захоплююча історія з глибокими персонажами.' },
  { rating: 5, comment: 'Одна з найкращих книг, які я читав цього року!' },
  { rating: 4, comment: 'Цікавий сюжет, але місцями затягнуто.' },
  { rating: 5, comment: 'Шедевр! Кожне слово на своєму місці.' },
  { rating: 3, comment: 'Середньо. Є кращі книги в цьому жанрі.' },
  { rating: 4, comment: 'Гарна книга для відпочинку. Легко читається.' }
];

console.log('👥 Додавання тестових користувачів та відгуків...');

async function addTestUsersAndReviews() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      
      // 1. Додаємо користувачів
      console.log('👤 Створення тестових користувачів...');
      const userStmt = db.prepare(`
        INSERT OR REPLACE INTO users (
          user_id, username, first_name, last_name, 
          has_completed_onboarding, favorite_genres
        ) VALUES (?, ?, ?, ?, 1, ?)
      `);
      
      testUsers.forEach(user => {
        const favoriteGenres = JSON.stringify(['Любовний роман', 'Фентезі', 'Детектив']);
        userStmt.run([
          user.user_id, user.username, user.first_name, 
          user.last_name, favoriteGenres
        ], function(err) {
          if (err) {
            console.error(`❌ Помилка створення користувача ${user.username}:`, err);
          } else {
            console.log(`✅ Створено користувача: ${user.first_name} ${user.last_name} (@${user.username})`);
          }
        });
      });
      
      userStmt.finalize(() => {
        console.log('👥 Всі користувачі створені');
        
        // 2. Отримуємо ID книг для створення збережених книг та відгуків
        db.all('SELECT id FROM books LIMIT 20', (err, books) => {
          if (err) {
            console.error('❌ Помилка отримання книг:', err);
            reject(err);
            return;
          }
          
          // 3. Додаємо збережені книги
          console.log('💾 Створення збережених книг...');
          const savedBookStmt = db.prepare(`
            INSERT OR IGNORE INTO saved_books (user_id, book_id) VALUES (?, ?)
          `);
          
          let savedCount = 0;
          testUsers.forEach(user => {
            // Кожен користувач зберігає 3-5 випадкових книг
            const booksToSave = Math.floor(Math.random() * 3) + 3;
            const shuffledBooks = books.sort(() => 0.5 - Math.random()).slice(0, booksToSave);
            
            shuffledBooks.forEach(book => {
              savedBookStmt.run([user.user_id, book.id], function(err) {
                if (err) {
                  console.error(`❌ Помилка збереження книги:`, err);
                } else if (this.changes > 0) {
                  savedCount++;
                  console.log(`✅ Користувач ${user.first_name} зберіг книгу ID:${book.id}`);
                }
              });
            });
          });
          
          savedBookStmt.finalize(() => {
            console.log(`💾 Створено ${savedCount} збережених книг`);
            
            // 4. Додаємо відгуки
            console.log('⭐ Створення відгуків...');
            const reviewStmt = db.prepare(`
              INSERT INTO reviews (
                book_id, user_id, user_name, rating, comment, is_published
              ) VALUES (?, ?, ?, ?, ?, 1)
            `);
            
            let reviewCount = 0;
            testUsers.forEach(user => {
              // Кожен користувач залишає 2-4 відгуки
              const reviewsToAdd = Math.floor(Math.random() * 3) + 2;
              const shuffledBooks = books.sort(() => 0.5 - Math.random()).slice(0, reviewsToAdd);
              
              shuffledBooks.forEach(book => {
                const randomReview = testReviews[Math.floor(Math.random() * testReviews.length)];
                
                reviewStmt.run([
                  book.id, user.user_id, `${user.first_name} ${user.last_name}`,
                  randomReview.rating, randomReview.comment
                ], function(err) {
                  if (err) {
                    console.error(`❌ Помилка створення відгуку:`, err);
                  } else {
                    reviewCount++;
                    console.log(`✅ ${user.first_name} залишив відгук (${randomReview.rating}⭐) для книги ID:${book.id}`);
                  }
                });
              });
            });
            
            reviewStmt.finalize(() => {
              console.log(`⭐ Створено ${reviewCount} відгуків`);
              
              // 5. Оновлюємо рейтинги книг
              console.log('📊 Оновлення рейтингів книг...');
              db.run(`
                UPDATE books SET 
                  rating = (
                    SELECT AVG(CAST(rating AS FLOAT)) 
                    FROM reviews 
                    WHERE book_id = books.id AND is_published = 1
                  ),
                  reviews_count = (
                    SELECT COUNT(*) 
                    FROM reviews 
                    WHERE book_id = books.id AND is_published = 1
                  )
                WHERE id IN (SELECT DISTINCT book_id FROM reviews)
              `, (err) => {
                if (err) {
                  console.error('❌ Помилка оновлення рейтингів:', err);
                } else {
                  console.log('📊 Рейтинги книг оновлені');
                }
                
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

// Запуск
addTestUsersAndReviews()
  .then(() => {
    console.log('🎉 Тестові користувачі та відгуки успішно створені!');
    
    // Перевіряємо результати
    db.get('SELECT COUNT(*) as count FROM users', (err, userRow) => {
      if (!err) console.log(`👥 Користувачів: ${userRow.count}`);
      
      db.get('SELECT COUNT(*) as count FROM saved_books', (err, savedRow) => {
        if (!err) console.log(`💾 Збережених книг: ${savedRow.count}`);
        
        db.get('SELECT COUNT(*) as count FROM reviews', (err, reviewRow) => {
          if (!err) console.log(`⭐ Відгуків: ${reviewRow.count}`);
          
          db.close((err) => {
            if (err) {
              console.error('❌ Помилка закриття БД:', err);
            } else {
              console.log('✅ База даних закрита');
              console.log('🚀 Готово до повноцінного тестування!');
            }
          });
        });
      });
    });
  })
  .catch((error) => {
    console.error('❌ Помилка:', error);
  });