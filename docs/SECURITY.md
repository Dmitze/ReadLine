# 🔒 ReadLine Security Documentation

**Comprehensive security measures and best practices**

---

## 📋 Security Overview

ReadLine implements **enterprise-grade security** with multiple layers of protection:

1. **SQL Injection Prevention** ✅
2. **XSS Protection** ✅
3. **Rate Limiting** ✅
4. **Input Validation & Sanitization** ✅
5. **Authentication & Authorization** ✅
6. **Secure Data Storage** ⚠️ (encryption recommended)
7. **CSRF Protection** ⚠️ (for REST API)

---

## 🛡️ Implemented Security Measures

### 1. SQL Injection Prevention

**Implementation:**
- Parameterized queries everywhere
- QueryBuilder with automatic escaping
- SafeQueryExecutor for extra validation
- InputSanitizer for database inputs

**Example:**
```typescript
// ❌ VULNERABLE
db.run(`SELECT * FROM books WHERE title = '${userInput}'`);

// ✅ SAFE
const safeExecutor = new SafeQueryExecutor(db);
await safeExecutor.executeQuery(
  'SELECT * FROM books WHERE title = ?',
  [InputSanitizer.sanitizeForDb(userInput)]
);
```

**Files:**
- `src/database/QueryBuilder.ts` - Safe query construction
- `src/database/SafeQueryExecutor.ts` - Parameter validation
- `src/validation/InputSanitizer.ts` - Input sanitization

---

### 2. XSS (Cross-Site Scripting) Prevention

**Implementation:**
- HTML escaping in all user-facing outputs
- Telegram's native message formatting
- Content Security Policy headers for API

**Example:**
```typescript
// Escape HTML in admin panel
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

await ctx.replyWithHTML(escapeHtml(userInput));
```

**Files:**
- `src/handlers/adminHandlers.ts` - HTML escaping
- `src/middleware/SecurityHeaders.ts` - CSP headers

---

### 3. Rate Limiting

**Implementation:**
- Per-user rate limiting
- Different limits for different actions
- Token bucket algorithm
- Redis-backed for distributed systems

**Limits:**
```typescript
const RATE_LIMITS = {
  MESSAGES: { count: 5, window: 10 },      // 5 msg/10s
  COMMANDS: { count: 10, window: 10 },     // 10 cmd/10s
  CALLBACKS: { count: 10, window: 10 },    // 10 callbacks/10s
  AI_REQUESTS: { count: 5, window: 60 },   // 5 AI req/min
};
```

**Example:**
```typescript
// src/middleware/rateLimit.ts
export const rateLimitMiddleware = () => {
  return async (ctx: AppContext, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    const allowed = await checkRateLimit(userId, 'message');
    
    if (!allowed) {
      await ctx.reply('⚠️ Too many requests. Please wait.');
      return;
    }
    
    await next();
  };
};
```

**Files:**
- `src/middleware/rateLimit.ts` - Rate limit middleware
- `src/middleware/RateLimiter.ts` - Advanced rate limiter
- `src/utils/AICircuitBreaker.ts` - AI rate limiting

---

### 4. Input Validation & Sanitization

**Implementation:**
- Validator class with 25+ rules
- Input sanitization for DB/HTML/URL
- Type checking and format validation
- Length and range constraints

**Validation Rules:**
```typescript
const validator = new Validator();

// String validation
validator.isString(input);
validator.isNotEmpty(input);
validator.minLength(input, 3);
validator.maxLength(input, 500);

// Number validation
validator.isNumber(input);
validator.min(input, 1);
validator.max(input, 100);

// Format validation
validator.isEmail(email);
validator.isUrl(url);
validator.matches(input, /^[a-zA-Z0-9]+$/);
```

**Sanitization:**
```typescript
import { InputSanitizer } from './validation/InputSanitizer';

// Database
const safe = InputSanitizer.sanitizeForDb(userInput);

// HTML
const safeHtml = InputSanitizer.sanitizeHtml(userInput);

// URL
const safeUrl = InputSanitizer.sanitizeUrl(userInput);
```

**Files:**
- `src/validation/Validator.ts` - Validation rules
- `src/validation/InputSanitizer.ts` - Sanitization
- `src/utils/validation.ts` - Helper functions

---

### 5. Authentication & Authorization

**Implementation:**
- Telegram User ID verification
- Admin role management
- Session management
- Command access control

**Admin Check:**
```typescript
async function isAdmin(userId: number): Promise<boolean> {
  const admins = await getAdmins();
  return admins.some(admin => admin.user_id === userId);
}

// In handler
bot.command('admin', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !(await isAdmin(userId))) {
    await ctx.reply('❌ Access denied. Admin only.');
    return;
  }
  
  // Admin logic
});
```

**Files:**
- `src/middleware/auth.ts` - Authentication
- `src/database/models.ts` - Admin management
- `src/handlers/adminHandlers.ts` - Authorization checks

---

### 6. Circuit Breaker Pattern

**Implementation:**
- Protection against cascading failures
- Automatic recovery
- Metrics and monitoring

**States:**
- **CLOSED** - Normal operation
- **OPEN** - Failing, reject immediately
- **HALF_OPEN** - Testing recovery

**Example:**
```typescript
const aiBreaker = new AICircuitBreaker({
  threshold: 5,        // Open after 5 failures
  timeout: 60000,      // 60s timeout
  resetTimeout: 30000  // Try recovery after 30s
});

const result = await aiBreaker.execute(async () => {
  return await geminiAPI.call(prompt);
});
```

**Files:**
- `src/utils/CircuitBreaker.ts` - Base circuit breaker
- `src/utils/AICircuitBreaker.ts` - AI-specific breaker

---

### 7. Secure Data Storage

**Current Status:** ⚠️ **Needs improvement**

**Implemented:**
- WAL mode for SQLite (concurrency)
- Regular backups
- Access control via file permissions

**TODO:**
- [ ] Encrypt sensitive data (API keys, tokens)
- [ ] Encrypt database at rest
- [ ] Implement key rotation
- [ ] Use environment variables for secrets

**Recommendation:**
```typescript
// Install encryption library
npm install crypto-js

// Encrypt sensitive data
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.ENCRYPTION_KEY!;

function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
}

function decrypt(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

---

## ⚠️ Known Vulnerabilities & TODO

### Critical Priority

1. **Encryption of sensitive data** ❌
   - API keys in database
   - User tokens
   - Admin credentials
   
2. **CSRF Protection for REST API** ❌
   - Add CSRF tokens
   - Validate Origin header
   - Use SameSite cookies

3. **Secrets in .env** ⚠️
   - Currently in plaintext
   - Should use vault (HashiCorp Vault, AWS Secrets Manager)

### High Priority

4. **Input validation gaps** ⚠️
   - Some handlers skip validation
   - Need audit of all user inputs

5. **Rate limiting bypass** ⚠️
   - User can change Telegram account
   - Consider IP-based limiting

6. **Error messages expose internals** ⚠️
   - Stack traces in some error responses
   - Should log internally, show generic message

---

## 🚨 Security Incident Response

### If SQL Injection Found

1. **Immediate:**
   - Take affected service offline
   - Review audit logs
   - Patch vulnerability

2. **Within 24 hours:**
   - Notify users if data compromised
   - Reset credentials
   - Document incident

3. **Follow-up:**
   - Add tests to prevent regression
   - Audit similar code
   - Update this document

### If Data Breach

1. **Immediate:**
   - Isolate compromised system
   - Change all credentials
   - Enable 2FA

2. **Within 72 hours:**
   - Notify affected users (GDPR requirement)
   - Report to authorities if required
   - Engage security audit

---

## 🔍 Security Audit Checklist

### Before Production

- [ ] All user inputs validated
- [ ] All DB queries use parameterized statements
- [ ] No secrets in source code
- [ ] Rate limiting enabled
- [ ] HTTPS for REST API
- [ ] Security headers configured
- [ ] Error messages sanitized
- [ ] Sensitive data encrypted
- [ ] Backup and recovery tested
- [ ] Penetration testing completed

### Monthly

- [ ] Update dependencies (`npm audit`)
- [ ] Review access logs
- [ ] Test backup restoration
- [ ] Verify rate limits working
- [ ] Check for new CVEs

### Quarterly

- [ ] Full security audit
- [ ] Penetration testing
- [ ] Review and update this document

---

## 🛠️ Security Tools

### Recommended Tools

1. **npm audit** - Dependency vulnerabilities
   ```bash
   npm audit
   npm audit fix
   ```

2. **Snyk** - Continuous security monitoring
   ```bash
   npm install -g snyk
   snyk test
   ```

3. **ESLint Security Plugin** - Code analysis
   ```bash
   npm install eslint-plugin-security --save-dev
   ```

4. **SQLMap** - SQL injection testing
   ```bash
   sqlmap -u "http://api.example.com/books?id=1"
   ```

5. **OWASP ZAP** - Web application security scanner

---

## 📞 Reporting Security Issues

**DO NOT** open public GitHub issue for security vulnerabilities!

### Responsible Disclosure

1. Email: dmitze_shivachov@outlook.com
2. Subject: [SECURITY] ReadLine Vulnerability
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)

### Response Timeline

- **24 hours** - Initial response
- **7 days** - Assessment and plan
- **30 days** - Fix and deploy
- **90 days** - Public disclosure (if agreed)

---

## 📚 Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **OWASP Cheat Sheets:** https://cheatsheetseries.owasp.org/
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/
- **Telegram Bot Security:** https://core.telegram.org/bots/security

---

*Last updated: 2025-11-15*
*Security is an ongoing process. This document should be reviewed and updated regularly.*
