# 🤝 Гід контрибʼюторам ReadLine

Дякуємо за інтерес до ReadLine! Цей документ описує як внести свій вклад у проєкт.

---

## 📋 Зміст

1. [Кодекс поведінки](#кодекс-поведінки)
2. [Як почати](#як-почати)
3. [Типи контрибʼюцій](#типи-контрибʼюцій)
4. [Процес Pull Request](#процес-pull-request)
5. [Стилізація коду](#стилізація-коду)
6. [Тестування](#тестування)
7. [Документація](#документація)
8. [Коміти](#коміти)
9. [Часті запитання](#часті-запитання)

---

## 🤝 Кодекс поведінки

Цей проєкт та всі його учасники керуються [Кодексом поведінки](./CODE_OF_CONDUCT.md). Беручи участь, ви повинні дотримуватись цього кодексу.

Будь-яке неприйнятне поведінку повинна бути повідомлена на [conduct@readline-bot.dev](mailto:conduct@readline-bot.dev).

---

## 🚀 Як почати

### 1. Форк та клонування

```bash
# Форк репозиторію на GitHub

# Клонуйте ваш форк
git clone https://github.com/YOUR_USERNAME/ReadLine.git
cd ReadLine

# Додайте upstream
git remote add upstream https://github.com/Dmitze/ReadLine.git
```

### 2. Налаштування розробки

```bash
# Встановіть залежності
npm install

# Скопіюйте .env файл
cp .env.example .env

# Відредагуйте .env з вашими даними
# Мінімум: BOT_TOKEN, ADMIN_ID

# Запустіть Redis (Docker)
docker run -d -p 6379:6379 --name readline-redis redis:latest

# Запустіть в режимі розробки
npm run dev:watch
```

### 3. Створіть branch

```bash
# Оновіть main
git fetch upstream
git checkout main
git merge upstream/main

# Створіть feature branch
git checkout -b feature/your-feature-name

# або для bug fix
git checkout -b fix/bug-name
```

---

## 🎯 Типи контрибʼюцій

### 🐛 Звіти про помилки

Знайшли баг? Перевірте спочатку:

1. ✅ [Issues](https://github.com/Dmitze/ReadLine/issues) - чи вже зареєстрована?
2. ✅ [Discussions](https://github.com/Dmitze/ReadLine/discussions) - чи вже обговорювалась?
3. ✅ [SECURITY.md](./SECURITY.md) - чи это security issue?

Якщо не знайшли - створіть нову issue:

**Шаблон Issue:**
```markdown
### Опис проблеми
[Чітко опишіть, що не працює]

### Кроки для відтворення
1. [Перший крок]
2. [Другий крок]
3. [Третій крок]

### Очікувана поведінка
[Що мало б бути]

### Фактична поведінка
[Що насправді відбувається]

### Скріншоти / Логи
[Якщо застосовується]

### Середовище
- OS: [e.g., Windows 11]
- Node версія: [e.g., 18.0.0]
- npm версія: [e.g., 9.0.0]
```

### ✨ Пропозиції функцій

Хочете додати щось нове? Спочатку:

1. 📖 Прочитайте [дорожну карту](./README.md#дорожна-карта)
2. 💬 Обговоріть у [Discussions](https://github.com/Dmitze/ReadLine/discussions/new)
3. 📝 Створіть issue з міткою `enhancement`

**Шаблон пропозиції:**
```markdown
### Опис
[Яку функцію ви пропонуєте?]

### Мотивація
[Чому це потрібно?]

### Рішення
[Як реалізувати?]

### Альтернативи
[Які інші способи?]

### Додаткова інформація
[Посилання, скріншоти, тощо]
```

### 📚 Покращення документації

Документація завжди потребує покращень!

- 🎯 Виправлення опечаток
- 🔄 Уточнення інструкцій
- 📖 Додавання прикладів
- 🌍 Переклади

Просто форк → edit → pull request.

### 🧪 Додавання тестів

Покриття тестами сейчас 70.21%. Допоможіть розширити!

```bash
# Напишіть тест
# src/__tests__/unit/myFeature.test.ts

# Запустіть
npm test -- myFeature.test.ts

# Перевірте покриття
npm run test:coverage
```

### 🔧 Рефакторинг коду

Код можна завжди улучшить:

- 🧹 Видалення дублювання
- ⚡ Оптимізація продуктивності
- 🎨 Покращення читаємості
- 🔐 Безпека та перевірка типів

---

## 🔀 Процес Pull Request

### Перед тим як почати PR

- [ ] Я прочитав та дотримуюсь [Кодексу поведінки](./CODE_OF_CONDUCT.md)
- [ ] Я оновив `main` з `upstream`
- [ ] Я створив feature branch від `main`
- [ ] Я запустив `npm test` локально (134 тести pass)
- [ ] Я запустив `npm run lint:fix` для форматування
- [ ] Я оновив документацію якщо потрібно

### Створення PR

**GitHub PR шаблон:**
```markdown
## Опис
[Що змінює цей PR?]

## Тип змін
- [ ]  Bug fix
- [ ]  New feature
- [ ]  Documentation
- [ ]  Refactoring
- [ ]  Performance
- [ ]  Security

## Пов'язані issues
Closes #issue_number

## Тестування
- [ ] Додав нові тести
- [ ] Всі тести проходять (`npm test`)
- [ ] Перевірив покриття (`npm run test:coverage`)

## Документація
- [ ] Оновив README.md якщо потрібно
- [ ] Оновив JSDoc коментарі
- [ ] Оновив REFACTORING_PROGRESS.md якщо великі зміни

## Чек-лист
- [ ] Код дотримується стилю проєкту
- [ ] Проведено самоаналіз своєї кода
- [ ] Написав коментарі для складних частин
- [ ] Я переніс всі попередження (`noUnusedLocals`, тощо)
- [ ] Я оновив відповідні типи TypeScript
```

### Процес review

Ваш PR буде:

1. **Автоматичні перевірки** (GitHub Actions)
   - ESLint + Prettier
   - TypeScript compilation
   - Jest тести
   - Coverage analysis

2. **Manual review** (maintainers)
   - Код якість
   - Логіка та корректність
   - Безпека
   - Документація

3. **Обговорення** якщо потрібні зміни

4. **Merge** коли все OK

---

## 🎨 Стилізація коду

### ESLint + Prettier

```bash
# Перевірити стиль
npm run lint

# Автовиправлення
npm run lint:fix

# Форматування
npm run format

# Перевірка форматування
npm run format:check
```

### TypeScript strict mode

Весь код повинен компілюватись в strict mode:

```bash
npm run build
```

### Стилю кода

**Навування:**
```typescript
// ✅ ДОБРЕ: camelCase для змінних, UPPER_CASE для констант
const maxBooks = 10;
const CACHE_TTL = 300;

// ✅ ДОБРЕ: PascalCase для класів та інтерфейсів
class BookService { }
interface IRepository { }

// ✅ ДОБРЕ: kebab-case для файлів (крім класів)
// book-service.ts, user-repository.ts
```

**Форматування:**
```typescript
// ✅ ДОБРЕ: JSDoc для публічних функцій
/**
 * Отримати книгу за ID
 * @param id - ID книги
 * @returns Книга або null
 */
function getBook(id: number): Book | null {
  // ...
}

// ✅ ДОБРЕ: Максимум 100 символів у лінії
const longMessage = 
  'This is a very long message that ' +
  'is split across multiple lines';

// ❌ПОГАНО: var, функції без документації
var book;
function getBook() { }
```

### Коментарі

```typescript
// ✅ ДОБРЕ: Пояснення ЧОМУ, а не ЩО
// Кешуємо результат на 5 хвилин, тому що це часто запитується
const CACHE_TTL = 300;

// ✅ ДОБРЕ: TODO/FIXME з поясненням
// TODO: Додати pagination коли перевищимо 1000 книг
// FIXME: query N+1 проблема тут

// ❌ ПОГАНО: Очевидні коментарі
// Збільшити i на 1
i++;
```

---

## 🧪 Тестування

### Запуск тестів

```bash
# Всі тести
npm test

# Watch режим (розробка)
npm run test:watch

# Конкретний файл
npm test -- myFeature.test.ts

# Coverage
npm run test:coverage
```

### Написання тестів

**Структура:**
```typescript
describe('BookService', () => {
  let service: BookService;

  beforeEach(() => {
    service = new BookService();
  });

  it('should get book by id', async () => {
    // Arrange
    const bookId = 1;
    
    // Act
    const book = await service.getBook(bookId);
    
    // Assert
    expect(book).toBeDefined();
    expect(book?.id).toBe(bookId);
  });

  it('should return null for non-existent book', async () => {
    // Arrange
    const bookId = 99999;
    
    // Act
    const book = await service.getBook(bookId);
    
    // Assert
    expect(book).toBeNull();
  });
});
```

### Вимоги до тестів

- Мінімум 80% покриття нового коду
- Тести повинні мати чіткі назви
- Використовувати AAA pattern (Arrange-Act-Assert)
- Мокувати зовнішні залежності
- Тести повинні бути незалежними один від одного

---

## Документація

### JSDoc коментарі

Всі публічні функції та класи повинні мати JSDoc:

```typescript
/**
 * Сервіс для управління книгами
 * @class
 * @example
 * const service = new BookService(repository);
 * const book = await service.getBook(1);
 */
export class BookService {
  /**
   * Отримати книгу за ID
   * @async
   * @param {number} id - ID книги
   * @param {GetBookOptions} options - Опції
   * @returns {Promise<Book | null>} Книга або null
   * @throws {ValidationError} Якщо ID невалідний
   * @example
   * const book = await service.getBook(1);
   */
  async getBook(id: number, options?: GetBookOptions): Promise<Book | null> {
    // ...
  }
}
```

### README та документація

Якщо ви додаєте велику функцію:

1. Оновіть [README.md](./README.md)
2. Оновіть структуру проєкту якщо додали нову папку
3. Додайте приклад використання
4. Додайте посилання на реалізацію

### REFACTORING_PROGRESS.md

Велики PR повинні оновити цей файл:

```markdown
### TASK: Ваша задача
**ID:** REFACTOR-XXX
**Статус:** ВИКОНАНО
**Дата:** 15 листопада 2025

**Опис:** [Опис змін]
**Файли:** [Список файлів]
**Метрики:** [Performance, покриття, тощо]
```

---

## Коміти

### Стиль коміту (Conventional Commits)

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

**Типи:**
- `feat` - Нова функція
- `fix` - Виправлення баду
- `docs` - Документація
- `style` - Форматування (не логіка)
- `refactor` - Рефакторинг (не нова функція)
- `perf` - Оптимізація продуктивності
- `test` - Додавання тестів
- `chore` - Інші зміни (deps, config)
- `ci` - CI/CD зміни

**Приклади:**

```bash
# Нова функція
git commit -m "feat(search): add fuzzy search algorithm

- Додав Levenshtein distance implementation
- Кешування результатів пошуку на 5 хвилин
- Оновив тести"

# Виправлення баду
git commit -m "fix(queue): resolve job timeout issue

Closes #123

- Збільшив timeout з 10с на 30с
- Додав retry logic для невдалих завдань"

# Документація
git commit -m "docs: add deployment guide"

# Просто виправлення опечатки
git commit -m "docs: fix typo in README"
```

### Best Practices

- Один commit = одна логічна зміна
- Пишіть в imperative mood ("add feature", "fix bug")
- Це має бути інформативно та зрозуміло
- Реферуйте issues: `Closes #123` або `Fixes #456`
- Без велики повідомлення для невеликі зміни

---

## Часті запитання

### Q: Як я можу допомогти, якщо я не розробник?

A: Багато способів!
- Підправити документацію
- Повідомити про баги
- Дати feedback на нові функції
- Помогати з перекладом
- Пропонувати ідеї та покращення

### Q: Як мне стати maintainer?

A: Регулярно контрибʼютьте якісний код, допоможіть в review, активно беріть участь. Ми запросимо вас!

### Q: Мій PR було відхилено. Що тепер?

A: Не відчувайте себе погано! Це нормально. Прочитайте feedback, задайте запитання, спробуйте ще раз.

### Q: Коли мій PR буде merged?

A: Зазвичай протягом 3-5 днів залежно від складності. Будіте терпіливі :)

### Q: Я знайшов security issue. Що робити?

A: **НЕ** відкривайте публічний issue. Прочитайте [SECURITY.md](./SECURITY.md).

### Q: Можна я видалення мої контрибʼюції?

A: Всі контрибʼюції - частина проєкту. Якщо у вас є серйозна причина, зв'яжіться з нами.

---

## 🚀 Наступні кроки

1. ✅ Fork репозиторію
2. ✅ Створіть feature branch
3. ✅ Зробіть зміни
4. ✅ Запустіть тести (`npm test`)
5. ✅ Запустіть lint (`npm run lint:fix`)
6. ✅ Закомітьте зміни (Conventional Commits)
7. ✅ Push на ваш форк
8. ✅ Відкрийте Pull Request

---

## Контакт

Якщо у вас є питання:

- Email: [dmitze.dev@gmail.com](mailto:dmitze.dev@gmail.com)
- Discussions: [GitHub Discussions](https://github.com/Dmitze/ReadLine/discussions)
- Issues: [GitHub Issues](https://github.com/Dmitze/ReadLine/issues)

---

**Дякуємо за те, що робите ReadLine краще!** 🙏

*Останнє оновлення: 15 листопада 2025*
