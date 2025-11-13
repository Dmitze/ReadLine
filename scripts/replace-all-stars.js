// Скрипт для заміни всіх зірочок *текст* на <b>текст</b> в TypeScript файлах
const fs = require('fs');
const path = require('path');

// Функція для рекурсивного пошуку файлів
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Пропускаємо node_modules, dist, build
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Функція для заміни зірочок
function replaceStars(content) {
  let modified = content;
  let changes = 0;
  
  // Замінюємо *текст* на <b>текст</b>
  // Але НЕ замінюємо ** (подвійні зірочки) та зірочки в коментарях
  const regex = /(?<![\*\/])(\*)([А-ЯЁІЇЄҐа-яёіїєґA-Za-z0-9\s\-']+?)(\*)(?!\*)/g;
  
  modified = modified.replace(regex, (match, star1, text, star2) => {
    // Перевіряємо чи це не коментар
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes(match) && (line.trim().startsWith('//') || line.trim().startsWith('*'))) {
        return match; // Не замінюємо в коментарях
      }
    }
    
    changes++;
    return `<b>${text}</b>`;
  });
  
  return { modified, changes };
}

// Основна функція
function main() {
  console.log('🔍 Шукаю TypeScript файли...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFiles(srcDir);
  
  console.log(`📁 Знайдено ${files.length} файлів\n`);
  
  let totalChanges = 0;
  let modifiedFiles = 0;
  
  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const { modified, changes } = replaceStars(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, modified, 'utf8');
      modifiedFiles++;
      totalChanges += changes;
      
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`✅ ${relativePath}: ${changes} замін`);
    }
  });
  
  console.log(`\n📊 Підсумок:`);
  console.log(`   Оброблено файлів: ${files.length}`);
  console.log(`   Змінено файлів: ${modifiedFiles}`);
  console.log(`   Всього замін: ${totalChanges}`);
  console.log(`\n✨ Готово!`);
}

main();
