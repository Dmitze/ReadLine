# Fix logger calls with 3 parameters to 2 parameters
# Pattern: logger.LEVEL(msg, error, {obj}) -> logger.LEVEL(msg, error)

$files = @(
    'src/database/promoCodeFunctions.ts',
    'src/handlers/adminHandlers.ts',
    'src/handlers/userHandlers.ts',
    'src/index.ts',
    'src/middleware/auth.ts',
    'src/scenes/aiAssistantScene.ts',
    'src/scenes/editBookScene.ts',
    'src/scenes/feedbackScene.ts',
    'src/scenes/manageBooksScene.ts',
    'src/scenes/profileScene.ts',
    'src/scenes/promoAdminScene.ts',
    'src/scenes/replyFeedbackScene.ts',
    'src/scenes/searchScene.ts',
    'src/utils/aiRecommendations.ts',
    'src/utils/bookDisplay.ts',
    'src/utils/errorHandler.ts',
    'src/utils/notifications.ts'
)

$pattern = '(logger\.(error|info|warn|debug))\(([^)]*),\s*([^)]*),\s*\{\s*[^}]*\s*\}'
$replacement = '$1($3, $4)'

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $newContent = $content -replace $pattern, $replacement
        Set-Content $file -Value $newContent -NoNewline
        Write-Host "Fixed: $file"
    }
}
