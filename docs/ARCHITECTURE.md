# 🏗️ ReadLine Architecture

**Multi-layered enterprise architecture for Telegram Bot**

See full architecture documentation in main README.md

## Quick Overview

- **Presentation:** Handlers + Scenes
- **Business Logic:** Services (5 services)
- **Data Access:** Repositories (8 repos)
- **Infrastructure:** SQLite + Redis + Gemini AI

## Design Patterns

1. **Repository Pattern** - Data access abstraction
2. **Result Pattern** - Type-safe error handling
3. **Dependency Injection** - ServiceContainer
4. **Circuit Breaker** - Failure protection
5. **Query Builder** - SQL injection prevention

For detailed docs, see README.md and DEEP_ANALYSIS_REPORT.md
