# 🔒 Безпека ReadLine - Політика та процеси

## ⚠️ Звітування про уразливості

**⚠️ ВАЖЛИВО:** Якщо ви знайшли уразливість безпеки, **НЕ** відкривайте публічний issue на GitHub!

Замість цього, будь ласка, повідомте нас конфіденційно:

📧 **Email**: [security@readline-bot.dev](mailto:security@readline-bot.dev)

### Що включити у звіт

Будь ласка, надайте:

- **Опис уразливості** - Чітко опишіть проблему безпеки
- **Кроки для відтворення** - Як відтворити уразливість?
- **Потенційний вплив** - Яка шкода може бути нанесена?
- **Пропозиція виправлення** - Якщо у вас є ідеї
- **Ваші контакти** - Email, GitHub username, тощо

### Наш процес

1. **✅ Квіннання (3 дні)** - Ми підтвердимо отримання звіту
2. **🔍 Аналіз (5-7 днів)** - Перевіримо и валідуємо уразливість
3. **🔧 Виправлення (1-2 тижні)** - Розробимо та протестуємо patch
4. **📢 Розкриття (1 день)** - Після публікації патча
5. **🙏 Признання** - Публічна подяка (якщо ви того бажаєте)

### Timeline

- **30 днів**: Очікуємо визнання
- **60 днів**: Очікуємо виправлення або публікацію
- **90 днів**: Можна розкрити публічно

### Умови

- 🤐 Не розкривайте уразливість публічно до нашої публікації
- 🚫 Не проводіть додаткові експерименти без нашого дозволу
- ✅ Можна розкрити через CVE коли ми публікуємо

---

## 🛡️ Особливості безпеки

### Обеспечение безопасности входных данных

#### Input Validation (Валідація вхідних даних)
- ✅ **25+ правил валідації** через `Validator.ts`
- ✅ **Довжина строк** - min/max перевірки
- ✅ **Формати** - email, URL, phone регулярні вирази
- ✅ **Типи даних** - перевірка на числа, рядки, boolean
- ✅ **Whitelist-based** - тільки дозволені символи

```typescript
// Приклад
const validator = new Validator();
const result = validator.validate(input, {
  title: { required: true, minLength: 2, maxLength: 200 },
  email: { required: true, type: 'email' }
});
```

#### Input Sanitization (Санітизація)
- ✅ **HTML escape** - видалення HTML тегів
- ✅ **SQL escape** - параметризовані запити
- ✅ **URL encode** - безпечні посилання
- ✅ **JSON validation** - структурна перевірка

```typescript
// Приклад
const sanitizer = new InputSanitizer();
const safe = sanitizer.sanitizeForDB(userInput);
```

### Захист від SQL Injection

#### QueryBuilder з параметризацією
```typescript
// ✅ БЕЗПЕЧНО: Параметризовані запити
const query = new QueryBuilder()
  .select('*')
  .from('books')
  .where('author = ?', [userInput])
  .build();

// ❌ НЕБЕЗПЕЧНО: String concatenation
const query = `SELECT * FROM books WHERE author = '${userInput}'`;
```

#### SafeQueryExecutor
- ✅ Валідація параметрів перед виконанням
- ✅ Перевірка на SQL keywords
- ✅ Логування усіх запитів
- ✅ Timeout protection

### Захист від XSS (Cross-Site Scripting)

#### Telegram Native Formatting
```typescript
// ✅ БЕЗПЕЧНО: Telegram markdown
ctx.reply('*Привіт* `користувач`', { parse_mode: 'MarkdownV2' });

// ✅ БЕЗПЕЧНО: Telegram HTML (автоматично escape)
ctx.reply('<b>Привіт</b> користувач', { parse_mode: 'HTML' });
```

#### Output Encoding
- ✅ HTML entities для userInput
- ✅ JSON encoding для API responses
- ✅ URL encoding для посилань

### Rate Limiting (Обмеження частоти запитів)

#### Middleware-level protection
```typescript
const rateLimiter = new RateLimiter({
  windowMs: 10000,        // 10 секунд
  maxRequests: 5,         // максимум 5 запитів
  keyGenerator: (ctx) => ctx.from?.id  // за User ID
});
```

#### Рівні обмеження
- 📨 **Messages**: 5 повідомлень / 10 сек
- 🔘 **Callback queries**: 10 кліків / 10 сек
- 💾 **Commands**: 10 команд / 10 сек
- 🤖 **AI requests**: 60 / 1 хвилина

### DDoS Protection (Захист від DDoS)

#### Circuit Breaker Pattern
```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,     // 5 невдалі запити
  resetTimeout: 60000,     // 1 хвилина перед retry
  monitoringInterval: 5000 // перевірка кожні 5 сек
});
```

#### Graceful Degradation
- ✅ Fallback на кешовані результати
- ✅ Часткові responses у разі zbij
- ✅ Automatic recovery з exponential backoff

### Аутентифікація та авторизація

#### Admin Panel Protection
```typescript
// ✅ Only Telegram User ID based
if (ctx.from?.id !== process.env.ADMIN_ID) {
  return ctx.reply('❌ У вас немає доступу');
}
```

#### Session Management
- ✅ Безпечне управління сеансами
- ✅ Automatic timeout після інактивності
- ✅ Per-user state isolation

### Логування та моніторинг

#### Security Event Logging
```typescript
logger.info('User login', { userId, timestamp, ipAddress });
logger.warn('Failed login attempt', { userId, attempts });
logger.error('Security violation', error, { userId, type: 'sql_injection' });
```

#### Логовані события
- 🔐 Login/Logout
- 👮 Admin actions
- 🚨 Failed validation attempts
- ⚠️ Rate limit violations
- 🔍 Unusual database activity

---

## 🔐 Конфідентність даних

### Дані що зберігаються
- 👤 Telegram User ID, username (необхідне)
- 📚 Книги та метаморфрозиція (публічне)
- ⭐ Відгуки та рейтинги (публічне)
- 💾 Збережені книги (приватне)
- 🎧 Прогрес прослуховування (приватне)

### Дані що НЕ зберігаються
- ❌ Паролі (не потрібні - Telegram auth)
- ❌ Email адреси (якщо не надані явно)
- ❌ Локація чи інші персональні дані
- ❌ Логи повідомлень (крім помилок)

### Encryption в дорозі
```typescript
// Всі Telegram запити за HTTPS/TLS
// Redis password-protected
// Database доступний тільки локально
```

---

## 🚀 Безпечний розвиток

### Code Review процес
- ✅ 2+ review перед merge
- ✅ Security-focused review
- ✅ Static analysis (ESLint, TypeScript)
- ✅ Dependency scanning

### Dependency Management
```bash
# Регулярні оновлення
npm audit
npm audit fix

# Перевірка вразливостей
npm outdated
```

### Типобезпечність
- ✅ **TypeScript strict mode** - знаходить типові баги
- ✅ **noImplicitAny** - вся змінні типізовані
- ✅ **strictNullChecks** - контроль null/undefined

### Testing для безпеки
- ✅ **Input validation tests** - перевірка всіх валідаторів
- ✅ **SQL injection tests** - спроба inject запитів
- ✅ **XSS tests** - спроба inject скриптів
- ✅ **Rate limit tests** - перевірка обмежень

---

## 🔄 Безпечне развертывание

### Production Checklist

```bash
# ✅ Перед deployment
npm test              # 134 тести pass
npm run lint         # ESLint чистий
npm run build        # TypeScript успішно компілюється
npm audit            # Немає high vulnerabilities
```

### Environment Variables
```env
# ✅ Сувора валідація
BOT_TOKEN=xxx        # обов'язковий, мінімум 20 символів
ADMIN_ID=123         # обов'язковий, числовий
GEMINI_API_KEY=xxx   # опціональний, мінімум 20 символів
REDIS_HOST=safe      # обов'язковий при Redis
REDIS_PORT=6379      # обов'язковий при Redis

# ❌ Ніколи не коміте .env
.env
.env.local
.env.*.local
```

### Database Security
```sql
-- ✅ Індекси для швидкості (не сповільнює)
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_reviews_book ON reviews(book_id);

-- ✅ Foreign keys для консистентності
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ✅ Constraints для валідації
CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5);
CONSTRAINT chk_length CHECK (LENGTH(title) BETWEEN 2 AND 200);
```

### API Rate Limiting
```
Користувач (за User ID):
- 5 повідомлень / 10 сек
- 10 callback queries / 10 сек
- 60 AI запитів / 1 хвилина

Глобально:
- 1000 requests / сек max
- Auto-ban на 1 годину при перевищенні
```

---

## 🔔 Incident Response

### Якщо виникла проблема безпеки

1. **🚨 Немедленно вимкнути** - Зупинити скомпрометований сервіс
2. **📊 Проаналізувати** - Який вплив? Які дані порушено?
3. **🔧 Виправити** - Розробити та протестувати патч
4. **📢 Повідомити** - Користувачів та аффектед сторін
5. **📝 Документувати** - Для майбутньої профілактики

### Процедура

```
INCIDENT DECLARED
        ↓
Disable feature / rollback
        ↓
Internal investigation
        ↓
Root cause found
        ↓
Patch developed & tested
        ↓
Deploy to production
        ↓
User notification
        ↓
Post-mortem analysis
        ↓
RESOLVED
```

---

## 📚 Ресурси безпеки

### OWASP Top 10
1. ✅ Broken Access Control - Role-based admin access
2. ✅ Cryptographic Failures - HTTPS only
3. ✅ Injection - Параметризовані запити
4. ✅ Insecure Design - Security by design
5. ✅ Misconfiguration - Proper defaults
6. ✅ Vulnerable Components - Updated deps
7. ✅ Authentication Failures - Session management
8. ✅ Software & Data Integrity - Code review
9. ✅ Logging & Monitoring - Security logging
10. ✅ Server-Side Template Injection - Telegram escaping

### Посилання
- [OWASP Top 10](https://owasp.org/Top10/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Telegram Bot Security](https://core.telegram.org/bots/api-security)
- [NodeJS Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## 🤝 Безпека спільноти

### Давайте безпечний код

```typescript
// ✅ ДОБРЕ
const book = await bookRepository.findById(id);
if (!book) return null;

// ❌ ПОГАНО
const book = await db.raw(`SELECT * FROM books WHERE id = ${id}`);
```

### Лучше безпечного

- ✅ Спрашивайте у maintainers перед великими змінами
- ✅ Перегляньте вже закритих security issues
- ✅ Повідомляйте про потенційні проблеми рано

---

## 📋 Контакт та Поддержка

### Security Team
- 📧 [security@readline-bot.dev](mailto:security@readline-bot.dev)
- 🔐 PGP Key: [запросіть у team]

### Issues або запитання?
- 💬 [GitHub Discussions - Security](https://github.com/Dmitze/ReadLine/discussions)
- 🐛 [GitHub Issues](https://github.com/Dmitze/ReadLine/issues) (тільки публічні)

---

**Дякуємо за допомогу в розробленні ReadLine безпечним проектом!**

*Останнє оновлення: 15 листопада 2025*

---

## 🎖️ Визнання дослідників безпеки

Дякуємо цим людям за повідомлення про уразливості:

*(Список буде оновлюватись)*

- [Відправте нам свій звіт](mailto:security@readline-bot.dev)
