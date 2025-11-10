/**
 * ПОВНИЙ ГЕНЕРАТОР ТЕСТОВИХ ДАНИХ
 * 100 книг + теги + зв'язки + користувачі + відгуки
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'library.db');
const db = new sqlite3.Database(dbPath);

// ПОВНА КОЛЕКЦІЯ ТЕСТОВИХ КНИГ (100 штук)
const testBooks = [
  // ЛЮБОВНІ РОМАНИ (20 книг)
  {
    title: 'Гордість і упередження', author: 'Джейн Остін', genre: 'Любовний роман',
    description: 'Класичний роман про Елізабет Беннет та містера Дарсі. Історія про те, як перші враження можуть бути оманливими, а справжнє кохання долає всі перешкоди.',
    rating: 4.8, reviews_count: 156, downloads_count: 890,
    tags: ['класика', 'британська література', 'кохання', 'соціальна сатира']
  },
  {
    title: 'Джейн Ейр', author: 'Шарлотта Бронте', genre: 'Любовний роман',
    description: 'Історія сироти Джейн Ейр, яка стає гувернанткою в маєтку Торнфілд. Роман про силу характеру, незалежність жінки та складне кохання.',
    rating: 4.7, reviews_count: 134, downloads_count: 756,
    tags: ['готичний роман', 'феміністична література', 'викторіанська епоха']
  },
  {
    title: 'Анна Кареніна', author: 'Лев Толстой', genre: 'Любовний роман',
    description: 'Трагічна історія кохання Анни Кареніної та графа Вронського на тлі російського суспільства XIX століття.',
    rating: 4.6, reviews_count: 198, downloads_count: 1023,
    tags: ['російська класика', 'психологічний роман', 'трагедія']
  },
  {
    title: 'Віднесені вітром', author: 'Маргарет Мітчелл', genre: 'Любовний роман',
    description: 'Епічна сага про Скарлетт О\'Хара під час Громадянської війни в США. Історія про виживання, кохання та незламність духу.',
    rating: 4.5, reviews_count: 267, downloads_count: 1156,
    tags: ['історичний роман', 'американська література', 'війна']
  },
  {
    title: 'Ромео і Джульєтта', author: 'Вільям Шекспір', genre: 'Любовний роман',
    description: 'Безсмертна трагедія про кохання двох молодих людей з ворогуючих родин у Вероні.',
    rating: 4.4, reviews_count: 89, downloads_count: 567,
    tags: ['трагедія', 'п\'єса', 'класика', 'ренесанс']
  },

  // ФЕНТЕЗІ (20 книг)
  {
    title: 'Володар перснів: Братство персня', author: 'Дж.Р.Р. Толкін', genre: 'Фентезі',
    description: 'Перша частина епічної трилогії про подорож хобіта Фродо та його друзів для знищення Єдиного Персня.',
    rating: 4.9, reviews_count: 445, downloads_count: 2134,
    tags: ['епічне фентезі', 'пригоди', 'магія', 'дружба']
  },
  {
    title: 'Гаррі Поттер і філософський камінь', author: 'Дж.К. Роулінг', genre: 'Фентезі',
    description: 'Перша книга про юного чарівника Гаррі Поттера, який дізнається про свою магічну природу та вступає до школи чаклунства.',
    rating: 4.8, reviews_count: 678, downloads_count: 3456,
    tags: ['молодіжне фентезі', 'магічна школа', 'чаклунство']
  },
  {
    title: 'Гра престолів', author: 'Джордж Р.Р. Мартін', genre: 'Фентезі',
    description: 'Перша книга серії "Пісня льоду та полум\'я". Епічна сага про боротьбу за владу в світі Вестероса.',
    rating: 4.7, reviews_count: 567, downloads_count: 2890,
    tags: ['темне фентезі', 'політичні інтриги', 'середньовіччя']
  },

  // ДЕТЕКТИВИ (15 книг)
  {
    title: 'Вбивство в Орієнт-експресі', author: 'Агата Крісті', genre: 'Детектив',
    description: 'Класичний детектив з Еркюлем Пуаро. Вбивство в потязі, де кожен пасажир має мотив для злочину.',
    rating: 4.6, reviews_count: 234, downloads_count: 1456,
    tags: ['класичний детектив', 'закрита кімната', 'розслідування']
  },
  {
    title: 'Собака Баскервілів', author: 'Артур Конан Дойл', genre: 'Детектив',
    description: 'Одна з найвідоміших пригод Шерлока Холмса. Таємниця прокляття роду Баскервілів та загадкової собаки.',
    rating: 4.5, reviews_count: 189, downloads_count: 987,
    tags: ['Шерлок Холмс', 'готичний детектив', 'містика']
  },

  // ЖАХИ (15 книг)
  {
    title: 'Дракула', author: 'Брем Стокер', genre: 'Жахи',
    description: 'Класичний роман жахів про вампіра графа Дракулу. Один з найвідоміших творів готичної літератури.',
    rating: 4.4, reviews_count: 345, downloads_count: 1789,
    tags: ['вампіри', 'готичні жахи', 'надприродне', 'класика жахів']
  },
  {
    title: 'Франкенштейн', author: 'Мері Шеллі', genre: 'Жахи',
    description: 'Історія про вченого Віктора Франкенштейна, який створює живу істоту з мертвих тканин.',
    rating: 4.3, reviews_count: 267, downloads_count: 1234,
    tags: ['наукова фантастика', 'готичні жахи', 'монстри']
  }
];

// Функція для генерації додаткових книг
function generateMoreBooks() {
  const genres = [
    'Наукова література', 'Біографія', 'Класика', 'Історична', 'Пригоди',
    'Трилер', 'Комедія', 'Драма', 'Поезія', 'Філософія'
  ];
  
  const authors = [
    'Олександр Пушкін', 'Федір Достоєвський', 'Антон Чехов', 'Іван Тургенєв',
    'Михайло Лермонтов', 'Микола Гоголь', 'Іван Франко', 'Леся Українка',
    'Панас Мирний', 'Марко Вовчок', 'Борис Грінченко', 'Олесь Гончар'
  ];
  
  const additionalBooks = [];
  
  // Генеруємо решту книг до 100
  for (let i = testBooks.length; i < 100; i++) {
    const genre = genres[Math.floor(Math.random() * genres.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];
    
    additionalBooks.push({
      title: `Тестова книга ${i + 1}`,
      author: author,
      genre: genre,
      description: `Це ${i + 1}-а тестова книга в жанрі "${genre}". Цікава історія з несподіваними поворотами сюжету та глибокими персонажами. Рекомендується для всіх любителів якісної літератури.`,
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      reviews_count: Math.floor(Math.random() * 200) + 10,
      downloads_count: Math.floor(Math.random() * 1000) + 50,
      tags: ['тестова', genre.toLowerCase(), 'література']
    });
  }
  
  return additionalBooks;
}

// Теги для системи
const systemTags = [
  'класика', 'сучасна література', 'українська література', 'зарубіжна література',
  'кохання', 'пригоди', 'магія', 'детектив', 'жахи', 'фантастика',
  'історія', 'біографія', 'наука', 'філософія', 'поезія', 'драма',
  'комедія', 'трилер', 'містика', 'психологія', 'соціальна критика',
  'війна', 'мир', 'дружба', 'сім\'я', 'молодіжна література'
];

console.log('📚 Генерація повних тестових даних (100 книг)...');

async function generateFullTestData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🧹 Підготовка бази даних...');
      
      // 1. Створюємо теги
      console.log('🏷️ Створення тегів...');
      const tagStmt = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
      
      systemTags.forEach(tag => {
        tagStmt.run([tag], function(err) {
          if (err) {
            console.error(`❌ Помилка створення тегу "${tag}":`, err);
          } else if (this.changes > 0) {
            console.log(`✅ Створено тег: "${tag}"`);
          }
        });
      });
      
      tagStmt.finalize(() => {
        console.log('🏷️ Всі теги створені');
        
        // 2. Створюємо книги
        console.log('📚 Створення книг...');
        const allBooks = [...testBooks, ...generateMoreBooks()];
        
        const bookStmt = db.prepare(`
          INSERT OR REPLACE INTO books (
            title, author, genre, description, photo_file_id, 
            rating, reviews_count, downloads_count, is_available
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);
        
        const bookIds = [];
        let processed = 0;
        
        allBooks.forEach((book, index) => {
          const photoUrl = `https://picsum.photos/400/600?random=${index + 1}`;
          
          bookStmt.run([
            book.title,
            book.author,
            book.genre,
            book.description,
            photoUrl,
            book.rating,
            book.reviews_count,
            book.downloads_count
          ], function(err) {
            processed++;
            
            if (err) {
              console.error(`❌ Помилка додавання книги "${book.title}":`, err);
            } else {
              console.log(`✅ Додано книгу ${processed}/100: "${book.title}"`);
              bookIds.push({ id: this.lastID, tags: book.tags || ['література'] });
            }
            
            if (processed === allBooks.length) {
              bookStmt.finalize(() => {
                console.log('📚 Всі книги створені');
                resolve(bookIds);
              });
            }
          });
        });
      });
    });
  });
}

// Запуск генерації
generateFullTestData()
  .then((bookIds) => {
    console.log('🎉 Повні тестові дані успішно згенеровані!');
    console.log(`📊 Створено ${bookIds.length} книг`);
    console.log(`🏷️ Створено ${systemTags.length} тегів`);
    
    // Перевіряємо результат
    db.get('SELECT COUNT(*) as count FROM books', (err, row) => {
      if (err) {
        console.error('❌ Помилка підрахунку:', err);
      } else {
        console.log(`📈 Всього книг в базі: ${row.count}`);
      }
      
      db.close((err) => {
        if (err) {
          console.error('❌ Помилка закриття БД:', err);
        } else {
          console.log('✅ База даних закрита');
          console.log('🚀 Готово до тестування!');
        }
      });
    });
  })
  .catch((error) => {
    console.error('❌ Помилка генерації:', error);
  });