# 👨‍💻 ReadLine - Developer Guide

**Comprehensive development documentation for ReadLine Telegram Bot**

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Code Quality](#code-quality)
7. [Debugging](#debugging)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Redis** 7+ (for job queue)
- **Git** 2.0+
- **SQLite3** (bundled, but CLI recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/Dmitze/ReadLine.git
cd ReadLine

# Run initialization script (Unix/Linux/macOS)
./scripts/init.sh

# Or manual setup (Windows)
npm install
cp .env.example .env
# Edit .env with your credentials
npm run build
npm run init-admin
```

### Start Development

```bash
# Development with watch mode
npm run dev:watch

# Development with auto-lint
npm run dev:lint

# Full checks + dev
npm run dev:full
```

---

## 🛠 Development Setup

### Environment Variables

Create `.env` file with:

```env
# Required
BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
ADMIN_ID=123456789
DB_PATH=./database/library.db

# Optional AI
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

### Redis Setup

**Docker (recommended):**
```bash
docker run -d -p 6379:6379 --name readline-redis redis:7-alpine
```

**Native:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Windows
# Use Docker or WSL
```

### Database

SQLite database auto-initializes on first run:

```bash
# Manual initialization
npm run build
node dist/index.js  # Creates database schema
npm run init-admin  # Creates admin user
```

---

## 📁 Project Structure

```
ReadLine/
├── src/                        # Source code
│   ├── core/                   # Core architecture
│   │   ├── ServiceContainer.ts # DI Container
│   │   ├── Result.ts           # Result Pattern
│   │   └── types.ts            # Core types
│   ├── services/               # Business logic
│   ├── repositories/           # Data access
│   ├── handlers/               # Telegram handlers
│   ├── scenes/                 # Multi-step dialogs
│   ├── database/               # DB layer
│   ├── utils/                  # Utilities
│   ├── validation/             # Input validation
│   ├── middleware/             # Express/Telegraf middleware
│   └── __tests__/              # Tests
├── scripts/                    # Build scripts
│   ├── init.sh                 # Initialization
│   └── dev.sh                  # Development runner
├── dist/                       # Compiled output
├── database/                   # SQLite DB
├── uploads/                    # User uploads
├── coverage/                   # Test coverage
└── docs/                       # Documentation
```

---

## 🔄 Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/my-new-feature
```

### 2. Make Changes

```typescript
// src/services/MyService.ts
import { Result } from '../core/Result';

export class MyService {
  async doSomething(): Promise<Result<string, Error>> {
    try {
      // Your logic here
      return Result.ok("Success");
    } catch (error) {
      return Result.err(error as Error);
    }
  }
}
```

### 3. Run Tests

```bash
npm test                    # All tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### 4. Lint & Format

```bash
npm run lint                # Check linting
npm run lint:fix            # Auto-fix
npm run format              # Format code
npm run format:check        # Check formatting
```

### 5. Type Check

```bash
npm run typecheck           # TypeScript type check
```

### 6. Build

```bash
npm run build               # Compile TypeScript
```

### 7. Commit

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/my-new-feature
```

### 8. Create Pull Request

- Go to GitHub
- Create PR from your branch to `main`
- Wait for CI checks to pass
- Request review

---

## 🧪 Testing

### Test Structure

```
src/__tests__/
├── unit/               # Unit tests (25 tests)
│   ├── validation.test.ts
│   ├── result.test.ts
│   └── circuitbreaker.test.ts
├── integration/        # Integration tests (24 tests)
│   ├── services.test.ts
│   ├── database.test.ts
│   └── queue.test.ts
└── e2e/               # E2E tests (85 tests)
    ├── scenes.test.ts
    └── dialog-flows.test.ts
```

### Writing Tests

```typescript
// src/__tests__/unit/myservice.test.ts
import { MyService } from '../../services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    const result = await service.doSomething();
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe("Success");
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- myservice.test.ts

# Detect memory leaks
npm run test:detectLeaks
```

---

## ✅ Code Quality

### ESLint Rules

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": "error"
  }
}
```

### Code Style

- Use **Result Pattern** for error handling
- Use **ServiceContainer** for DI
- Follow **Repository Pattern** for data access
- Write **JSDoc** for public methods
- Keep functions **< 50 lines**
- Keep files **< 300 lines**

### Example:

```typescript
/**
 * Gets top N books by rating
 * 
 * @param limit - Number of books to return
 * @returns Result with books array or error
 */
async getTopRated(limit: number): Promise<Result<Book[], Error>> {
  // Implementation
}
```

---

## 🐛 Debugging

### VS Code Configuration

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Bot",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["src/index.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"]
    }
  ]
}
```

### Logging

```typescript
import { logger } from './utils/logger';

logger.debug('Debug message', { context: 'data' });
logger.info('Info message');
logger.warn('Warning', { issue: 'something' });
logger.error('Error', error, { userId: 123 });
```

---

## 📝 Common Tasks

### Add New Scene

```typescript
// src/scenes/myScene.ts
import { Scenes } from 'telegraf';
import { AppContext } from '../types/telegraf';

export const myScene = new Scenes.BaseScene<AppContext>('my_scene');

myScene.enter(async (ctx) => {
  await ctx.reply('Welcome to my scene!');
});

myScene.leave(async (ctx) => {
  await ctx.reply('Leaving scene...');
});

export default myScene;
```

Register in `src/index.ts`:
```typescript
import myScene from './scenes/myScene';

const stage = new Scenes.Stage([
  // ... other scenes
  myScene,
]);
```

### Add New Service

```typescript
// src/services/MyService.ts
import { Result } from '../core/Result';
import { MyRepository } from '../repositories/MyRepository';

export class MyService {
  constructor(private myRepo: MyRepository) {}

  async doSomething(): Promise<Result<Data, Error>> {
    try {
      const data = await this.myRepo.getData();
      return Result.ok(data);
    } catch (error) {
      return Result.err(error as Error);
    }
  }
}
```

Register in ServiceContainer:
```typescript
container.registerSingleton('MyService', () => 
  new MyService(container.resolve('MyRepository'))
);
```

### Add Migration

```typescript
// src/database/migrations.ts
export const migrations: Migration[] = [
  // ... existing
  {
    version: 10,
    name: 'add_new_field',
    up: async (db) => {
      await db.run('ALTER TABLE books ADD COLUMN new_field TEXT');
    },
    down: async (db) => {
      await db.run('ALTER TABLE books DROP COLUMN new_field');
    }
  }
];
```

---

## 🔧 Troubleshooting

### Redis Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Check Redis status
redis-cli ping

# Start Redis
redis-server --daemonize yes

# Or with Docker
docker start readline-redis
```

### Database Locked

```
Error: SQLITE_BUSY: database is locked
```

**Solution:**
```bash
# Close all connections
pkill -f "node dist/index.js"

# Delete lock files
rm -f database/*.db-shm database/*.db-wal

# Restart
npm start
```

### Memory Leaks in Tests

```
Jest did not exit one second after the test run
```

**Solution:**
```bash
# Detect open handles
npm run test:detectLeaks

# Add cleanup in tests
afterAll(async () => {
  await db.close();
  jest.clearAllTimers();
});
```

### TypeScript Errors

```
TS2322: Type 'X' is not assignable to type 'Y'
```

**Solution:**
```bash
# Clean build
npm run clean
npm run build

# Check types
npm run typecheck
```

---

## 📞 Getting Help

- **Documentation:** Check `docs/` folder
- **Issues:** Open GitHub Issue
- **Contact:** dmitze_shivachov@outlook.com
- **Telegram:** @Dmitry_Shiva

---

**Happy Coding! 🚀**

*Last updated: 2025-11-15*
