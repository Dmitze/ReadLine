#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const files = [
  'src/handlers/userHandlers.ts',
  'src/handlers/adminHandlers.ts'
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let originalLength = content.length;

  // Count try blocks before
  const tryCountBefore = (content.match(/\btry\s*\{/g) || []).length;

  // Pattern 1: Basic try-catch at function level
  // Matches: try { ... } catch (error) { ... }
  // Only converts those NOT already wrapped in IIFE
  content = content.replace(
    /\n\s+(try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}\s*)(?=\n\s+[};\)])/g,
    (match, fullBlock) => {
      // Skip if already has IIFE
      if (fullBlock.includes('})().catch')) return match;
      
      // Extract try body and catch body
      const tryBodyMatch = fullBlock.match(/try\s*\{([\s\S]*)\}\s*catch/);
      const catchBodyMatch = fullBlock.match(/catch\s*\(\s*(\w+)\s*\)\s*\{([\s\S]*)\}\s*$/);
      
      if (!tryBodyMatch || !catchBodyMatch) return match;
      
      const tryBody = tryBodyMatch[1];
      const errorVar = catchBodyMatch[1];
      const catchBody = catchBodyMatch[2];
      
      return `\n    (async () => {${tryBody}    })().catch((${errorVar}) => {${catchBody}    });`;
    }
  );

  if (content !== originalLength) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const tryCountAfter = (content.match(/\btry\s*\{/g) || []).length;
    console.log(`✅ ${filePath}: Converted ${tryCountBefore - tryCountAfter} try-catch blocks`);
  } else {
    console.log(`⏭️  ${filePath}: No changes needed (manual review recommended)`);
  }
});

console.log('\n⚠️ Note: Manual review and formatting may be needed for complex cases');
