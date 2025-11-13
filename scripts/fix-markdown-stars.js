/**
 * Скрипт для заміни Markdown зірочок на HTML теги
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/scenes/searchScene.ts',
  'src/scenes/profileScene.ts',
  'src/scenes/promoAdminScene.ts',
  'src/scenes/rateBookScene.ts',
  'src/scenes/replyFeedbackScene.ts'
];

console.log('🔄 Починаємо заміну Markdown зірочок на HTML теги...\n');

filesToFix.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Замінюємо *ТЕКСТ* на <b>ТЕКСТ</b>
    content = content.replace(/\*([А-ЯІЇЄҐA-Z][А-ЯІЇЄҐA-ZА-Яа-яіїєґa-z\s:]+?)\*/g, '<b>$1</b>');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} - оновлено`);
    } else {
      console.log(`⏭️  ${filePath} - без змін`);
    }
  } catch (error) {
    console.error(`❌ ${filePath} - помилка:`, error.message);
  }
});

console.log('\n✅ Заміна завершена!');
