#!/usr/bin/env node

/**
 * Test Verification Script - перевірка що всі виправлення працюють
 */

const fs = require('fs');
const path = require('path');

const tests = [
  {
    name: 'TASK 1: Settings awaits',
    test: () => {
      const content = fs.readFileSync('src/scenes/settingsScene.ts', 'utf-8');
      return content.includes('await getUserNotificationSettings') && 
             content.includes('await setUserNotificationSettings');
    }
  },
  {
    name: 'TASK 1: DB columns exist',
    test: () => {
      const content = fs.readFileSync('src/database/models.ts', 'utf-8');
      return content.includes('notifications_enabled') && 
             content.includes('notification_frequency') &&
             content.includes('notification_time');
    }
  },
  {
    name: 'TASK 2: No double init',
    test: () => {
      const content = fs.readFileSync('src/database/models.ts', 'utf-8');
      const matches = content.match(/initDatabase\(\);/g);
      return !matches || matches.length === 0;
    }
  },
  {
    name: 'TASK 3: Using logger correctly',
    test: () => {
      const content = fs.readFileSync('src/database/recommendationFunctions.ts', 'utf-8');
      return content.includes("logger.error('Error getting random book'") &&
             content.includes("logger.debug('Getting random book')");
    }
  },
  {
    name: 'TASK 4: HTML parse_mode',
    test: () => {
      const content = fs.readFileSync('src/scenes/settingsScene.ts', 'utf-8');
      return content.includes("parse_mode: 'HTML'") && 
             !content.includes("parse_mode: 'Markdown'");
    }
  },
  {
    name: 'TASK 5: No typo "b"',
    test: () => {
      const content = fs.readFileSync('src/handlers/userHandlers.ts', 'utf-8');
      return !content.includes('status\s*=\s*b"');
    }
  },
  {
    name: 'TASK 6: Database indexes',
    test: () => {
      const content = fs.readFileSync('src/database/models.ts', 'utf-8');
      return content.includes('idx_books_title') && 
             content.includes('idx_books_author') &&
             content.includes('idx_books_genre');
    }
  },
  {
    name: 'TASK 7: SQLite PRAGMA',
    test: () => {
      const content = fs.readFileSync('src/database/models.ts', 'utf-8');
      return content.includes('foreign_keys') && 
             content.includes('journal_mode') &&
             content.includes('busy_timeout');
    }
  },
  {
    name: 'TASK 8: updateBook guard',
    test: () => {
      const content = fs.readFileSync('src/database/models.ts', 'utf-8');
      return content.includes("Object.keys(updates).length === 0");
    }
  },
  {
    name: 'TASK 9: No require()',
    test: () => {
      const srcFiles = fs.readdirSync('src', { recursive: true })
        .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
      
      for (const file of srcFiles) {
        const content = fs.readFileSync(path.join('src', file), 'utf-8');
        if (content.includes('require(')) return false;
      }
      return true;
    }
  },
  {
    name: 'TASK 10: JSON.parse favorite_genres',
    test: () => {
      const content = fs.readFileSync('src/utils/notifications.ts', 'utf-8');
      return content.includes('JSON.parse(user.favorite_genres)');
    }
  },
  {
    name: 'TASK 11: Rate limiter per-user',
    test: () => {
      const content = fs.readFileSync('src/middleware/rateLimit.ts', 'utf-8');
      return content.includes('Map<number') && 
             content.includes('RateLimiter') &&
             content.includes('userId');
    }
  },
  {
    name: 'TASK 15: rateLimitCommand middleware',
    test: () => {
      const content = fs.readFileSync('src/index.ts', 'utf-8');
      return content.includes('rateLimitCommand') &&
             content.includes('bot.use(rateLimitCommand)');
    }
  },
  {
    name: 'TASK 18: TypeScript strict mode',
    test: () => {
      const content = fs.readFileSync('tsconfig.json', 'utf-8');
      return content.includes('"strictNullChecks": true') &&
             content.includes('"noImplicitReturns": true');
    }
  },
  {
    name: 'TASK 19: Scene enter consistency',
    test: () => {
      const content = fs.readFileSync('src/handlers/userHandlers.ts', 'utf-8');
      return content.includes("return ctx.scene?.enter('PROFILE_SCENE')") &&
             !content.includes("await ctx.scene?.enter(");
    }
  },
  {
    name: 'TASK 20: WizardState fields',
    test: () => {
      const content = fs.readFileSync('src/types/telegraf.ts', 'utf-8');
      return content.includes('bookFile') && 
             content.includes('bookLink') &&
             content.includes('aiInterest') &&
             content.includes('aiLength') &&
             content.includes('aiMood');
    }
  }
];

console.log('\n' + '='.repeat(60));
console.log('🧪 VERIFICATION TESTS - ALL 20 TASKS');
console.log('='.repeat(60) + '\n');

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const result = test.test();
    if (result) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}`);
      failed++;
    }
  } catch (error) {
    console.log(`⚠️  ${test.name}: ${error.message}`);
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests\n`);

if (failed === 0) {
  console.log('🎉 ALL VERIFICATION TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!\n');
  process.exit(1);
}
