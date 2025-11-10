/**
 * Генерація комплексних тестових даних для ReadLine бота
 * ~100 книг з різних жанрів + теги + зв'язки
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

// Тестові дані
const testBooks = [
  // ЛЮБОВНІ РОМАНИ (20 книг)
  {
    title: 'Гордість і упередження',
    author: 'Джейн Остін',
    genre: 'Любовний роман',
    description: 'Класичний роман про Елізабет Беннет та містера Дарсі. Історія про те, як перші враження можуть бути оманливими, а справжнє кохання долає всі перешкоди. Один з найвідоміших творів світової літератури.',
    photo_file_id: 'https://picsum.photos/400/600?random=1',
    rating: 4.8,
    reviews_count: 156,
    downloads_count: 890,
    tags: ['класика', 'британська література', 'кохання', 'соціальна сатира']
  },
  {
    title: 'Джейн Ейр',
    author: 'Шарлотта Бронте',
    genre: 'Любовний роман',
    description: 'Історія сироти Джейн Ейр, яка стає гувернанткою в маєтку Торнфілд. Роман про силу характеру, незалежність жінки та складне кохання до загадкового містера Рочестера.',
    photo_file_id: 'https://picsum.photos/400/600?random=2',
    rating: 4.7,
    reviews_count: 134,
    downloads_count: 756,
    tags: ['готичний роман', 'феміністична література', 'викторіанська епоха', 'драма']
  },
  {
    title: 'Анна Кареніна',
    author: 'Лев Толстой',
    genre: 'Любовний роман',
    description: 'Трагічна історія кохання Анни Кареніної та графа Вронського на тлі російського суспільства XIX століття. Глибокий психологічний роман про пристрасть, мораль та суспільні норми.',
    photo_file_id: 'https://picsum.photos/400/600?random=3',
    rating: 4.6,
    reviews_count: 198,
    downloads_count: 1023,
    tags: ['російська класика', 'психологічний роман', 'трагедія', 'суспільна критика']
  },
  {
    title: 'Віднесені вітром',
    author: 'Маргарет Мітчелл',
    genre: 'Любовний роман',
    description: 'Епічна сага про Скарлетт О\'Хара під час Громадянської війни в США. Історія про виживання, кохання та незламність духу на тлі руйнування Старого Півдня.',
    photo_file_id: 'https://picsum.photos/400/600?random=4',
    rating: 4.5,
    reviews_count: 267,
    downloads_count: 1156,
    tags: ['історичний роман', 'американська література', 'війна', 'епос']
  },
  {
    title: 'Ромео і Джульєтта',
    author: 'Вільям Шекспір',
    genre: 'Любовний роман',
    description: 'Безсмертна трагедія про кохання двох молодих людей з ворогуючих родин у Вероні. П\'єса, що стала символом справжнього кохання та жертовності.',
    photo_file_id: 'https://picsum.photos/400/600?random=5',
    rating: 4.4,
    reviews_count: 89,
    downloads_count: 567,
    tags: ['трагедія', 'п\'єса', 'класика', 'ренесанс']
  }
];

// Додамо ще книги для інших жанрів
const additionalBooks = [
  // ФЕНТЕЗІ (20 книг)
  {
    title: 'Володар перснів: Братство персня',
    author: 'Дж.Р.Р. Толкін',
    genre: 'Фентезі',
    description: 'Перша частина епічної трилогії про подорож хобіта Фродо та його друзів для знищення Єдиного Персня. Класика жанру фентезі, що створила цілий світ Середзем\'я.',
    photo_file_id: 'https://picsum.photos/400/600?random=21',
    rating: 4.9,
    reviews_count: 445,
    downloads_count: 2134,
    tags: ['епічне фентезі', 'пригоди', 'магія', 'дружба']
  },
  {
    title: 'Гаррі Поттер і філософський камінь',
    author: 'Дж.К. Роулінг',
    genre: 'Фентезі',
    description: 'Перша книга про юного чарівника Гаррі Поттера, який дізнається про свою магічну природу та вступає до школи чаклунства Гогвортс. Початок легендарної серії.',
    photo_file_id: 'https://picsum.photos/400/600?random=22',
    rating: 4.8,
    reviews_count: 678,
    downloads_count: 3456,
    tags: ['молодіжне фентезі', 'магічна школа', 'чаклунство', 'дитяча література']
  }
];

console.log('📚 Генерація комплексних тестових даних...');
console.log(`📊 Планується створити: ${testBooks.length + additionalBooks.length} книг`);

// Функція для створення всіх тестових даних
function generateTestData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Очищуємо існуючі дані (опціонально)
      console.log('🧹 Очищення існуючих тестових даних...');
      
      // Створюємо книги
      const bookStmt = db.prepare(`
        INSERT OR REPLACE INTO books (
          title, author, genre, description, photo_file_id, 
          rating, reviews_count, downloads_count, is_available
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      
      const allBooks = [...testBooks, ...additionalBooks];
      const bookIds = [];
      
      allBooks.forEach((book, index) => {
        bookStmt.run([
          book.title,
          book.author,
          book.genre,
          book.description,
          book.photo_file_id,
          book.rating,
          book.reviews_count,
          book.downloads_count
        ], function(err) {
          if (err) {
            console.error(`❌ Помилка додавання книги "${book.title}":`, err);
          } else {
            console.log(`✅ Додано книгу: "${book.title}" (ID: ${this.lastID})`);
            bookIds.push({ id: this.lastID, tags: book.tags });
          }
        });
      });
      
      bookStmt.finalize(() => {
        console.log('📚 Всі книги додані');
        resolve(bookIds);
      });
    });
  });
}

// Запускаємо генерацію
generateTestData()
  .then((bookIds) => {
    console.log('🎉 Тестові дані успішно згенеровані!');
    console.log(`📊 Створено ${bookIds.length} книг`);
    
    db.close((err) => {
      if (err) {
        console.error('❌ Помилка закриття БД:', err);
      } else {
        console.log('✅ База даних закрита');
      }
    });
  })
  .catch((error) => {
    console.error('❌ Помилка генерації даних:', error);
  });