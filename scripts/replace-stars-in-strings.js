// Скрипт для заміни зірочок *текст* на <b>текст</b> в рядках TypeScript
const fs = require('fs');
const path = require('path');

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function replaceStarsInStrings(content) {
  let modified = content;
  let changes = 0;
  
  // Замінюємо *текст* на <b>текст</b> в рядках
  // Шукаємо патерн: '*текст*' або "*текст*" або `*текст*`
  const patterns = [
    // В одинарних лапках
    /('(?:[^'\\]|\\.)*?\*([А-ЯЁІЇЄҐа-яёіїєґA-Za-z0-9\s\-'!?,:;.]+?)\*(?:[^'\\]|\\.)*?')/g,
    // В подвійних лапках
    /("(?:[^"\\]|\\.)*?\*([А-ЯЁІЇЄҐа-яёіїєґA-Za-z0-9\s\-'!?,:;.]+?)\*(?:[^"\\]|\\.)*?")/g,
    // В бектіках
    /(`(?:[^`\\]|\\.)*?\*([А-ЯЁІЇЄҐа-яёіїєґA-Za-z0-9\s\-'!?,:;.]+?)\*(?:[^`\\]|\\.)*?`)/g
  ];
  
  patterns.forEach(pattern => {
    modified = modified.replace(pattern, (match) => {
      // Замінюємо всі *текст* на <b>текст</b> в цьому рядку
      const replaced = match.replace(/\*([А-ЯЁІЇЄҐа-яёіїєґA-Za-z0-9\s\-'!?,:;.]+?)\*/g, '<b>$1</b>');
      if (replaced !== match) {
        changes++;
      }
      return replaced;
    });
  });
  
  return { modified, changes };
}

function main() {
  console.log('🔍 Шукаю TypeScript файли...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFiles(srcDir);
  
  console.log(`📁 Знайдено ${files.length} файлів\n`);
  
  let totalChanges = 0;
  let modifiedFiles = 0;
  
  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const { modified, changes } = replaceStarsInStrings(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, modified, 'utf8');
      modifiedFiles++;
      totalChanges += changes;
      
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`✅ ${relativePath}: ${changes} рядків змінено`);
    }
  });
  
  console.log(`\n📊 Підсумок:`);
  console.log(`   Оброблено файлів: ${files.length}`);
  console.log(`   Змінено файлів: ${modifiedFiles}`);
  console.log(`   Всього рядків змінено: ${totalChanges}`);
  console.log(`\n✨ Готово!`);
}

main();
