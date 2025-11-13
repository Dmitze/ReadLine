/**
 * Скрипт для заміни зірочок (*текст*) на HTML теги (<b>текст</b>)
 * ТІЛЬКИ в українському тексті
 */

const fs = require('fs');
const path = require('path');

// Файли які треба виправити
const filesToFix = [
  'src/utils/bookDisplay.ts',
  'src/scenes/settingsScene.ts',
  'src/scenes/searchScene.ts',
  'src/scenes/replyFeedbackScene.ts',
  'src/scenes/rateBookScene.ts',
  'src/scenes/promoAdminScene.ts',
  'src/index.ts',
  'src/scenes/profileScene.ts',
  'src/handlers/userHandlers.ts',
  'src/handlers/adminHandlers.ts'
];

// Регулярний вираз для пошуку *УКРАЇНСЬКОГО ТЕКСТУ*
// Шукаємо зірочку, потім українські літери (великі), потім будь-які символи до наступної зірочки
const ukrainianTextPattern = /\*([А-ЯІЇЄҐ][А-ЯІЇЄҐа-яіїєґ\s'-]+)\*/g;

let totalReplacements = 0;

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Файл не знайдено: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let replacements = 0;
  
  // Замінюємо *ТЕКСТ* на <b>ТЕКСТ</b>
  content = content.replace(ukrainianTextPattern, (match, text) => {
    replacements++;
    return `<b>${text}</b>`;
  });
  
  if (replacements > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath}: ${replacements} замін`);
    totalReplacements += replacements;
  } else {
    console.log(`ℹ️  ${filePath}: змін не потрібно`);
  }
});

console.log(`\n🎉 Готово! Всього замін: ${totalReplacements}`);
