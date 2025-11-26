# Скрипт для очистки и пересоздания БД

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Очистка и пересоздание БД               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Закрыть все процессы Node.js
Write-Host "1️⃣  Закрываю процессы Node.js..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Write-Host "   ✓ Закрыты" -ForegroundColor Green

# 2. Удалить файлы БД
Write-Host ""
Write-Host "2️⃣  Удаляю файлы БД..." -ForegroundColor Yellow
$dbPath = ".\database\library.db"
$dbShmPath = ".\database\library.db-shm"
$dbWalPath = ".\database\library.db-wal"

if (Test-Path $dbPath) { Remove-Item $dbPath -Force -ErrorAction SilentlyContinue }
if (Test-Path $dbShmPath) { Remove-Item $dbShmPath -Force -ErrorAction SilentlyContinue }
if (Test-Path $dbWalPath) { Remove-Item $dbWalPath -Force -ErrorAction SilentlyContinue }

Write-Host "   ✓ Файлы удалены" -ForegroundColor Green

# 3. Запустить бота
Write-Host ""
Write-Host "3️⃣  Запускаю бота (БД создастся автоматически)..." -ForegroundColor Yellow
Write-Host ""
npm start

Write-Host ""
Write-Host "✅ БД пересоздана!" -ForegroundColor Green
