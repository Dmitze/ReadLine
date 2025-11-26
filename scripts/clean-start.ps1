# Clean Start Script for Warrior's Library Bot
# Очищує БД, компілює, та стартує бота

Write-Host "🧹 Очищення проекту..."

# 1. Зупиняємо всі Node процеси
taskkill /IM node.exe /F 2>$null | Out-Null
Start-Sleep -Milliseconds 500

# 2. Видаляємо файли БД
Remove-Item ".\database\library.db*" -Force -ErrorAction SilentlyContinue
Remove-Item ".\database\books.db" -Force -ErrorAction SilentlyContinue
Write-Host "✓ Старі файли БД видалені"

# 3. Видаляємо dist і node_modules кеш
Remove-Item ".\dist" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✓ dist очищено"

# 4. Встановлюємо залежності (якщо потрібно)
# npm install

# 5. Компілюємо TS
Write-Host "🏗️ Компіляція TypeScript..."
npm run build

# 6. Запускаємо бота
Write-Host "🚀 Запуск бота..."
npm start
