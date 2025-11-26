# Скрипт для очистки всех книг, подкастов и отзывов

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Очистка всех книг и подкастов           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Остановить PM2
Write-Host "1️⃣  Останавливаю PM2..." -ForegroundColor Yellow
pm2 stop ReadLine
Start-Sleep -Seconds 1
Write-Host "   ✓ PM2 остановлен" -ForegroundColor Green

# 2. Удалить файлы БД
Write-Host ""
Write-Host "2️⃣  Удаляю БД..." -ForegroundColor Yellow
$dbPath = ".\database\library.db"
$dbShmPath = ".\database\library.db-shm"
$dbWalPath = ".\database\library.db-wal"

if (Test-Path $dbPath) { Remove-Item $dbPath -Force -ErrorAction SilentlyContinue }
if (Test-Path $dbShmPath) { Remove-Item $dbShmPath -Force -ErrorAction SilentlyContinue }
if (Test-Path $dbWalPath) { Remove-Item $dbWalPath -Force -ErrorAction SilentlyContinue }

Write-Host "   ✓ БД удалена" -ForegroundColor Green

# 3. Запустить PM2
Write-Host ""
Write-Host "3️⃣  Запускаю PM2 (БД создастся автоматически)..." -ForegroundColor Yellow
npm run build
pm2 start ecosystem.config.js
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ БД очищена и перезагружена!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Статус:" -ForegroundColor Green
pm2 list
