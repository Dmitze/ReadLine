const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/library.db');

async function testFormat() {
  const book = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM books WHERE id = 116', (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  const tags = await new Promise((resolve, reject) => {
    db.all('SELECT t.name FROM book_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.book_id = 116', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  console.log('Book:', book);
  console.log('Tags:', tags);
  
  // Test escapeHtml
  const escapeHtml = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/�/g, '');
  };
  
  let caption = `📖 <b>${escapeHtml(book.title)}</b>\n`;
  caption += `👤 <b>Автор:</b> ${escapeHtml(book.author)}\n`;
  caption += `📚 <b>Жанр:</b> ${escapeHtml(book.genre)}\n`;
  
  if (tags.length > 0) {
    const tagNames = tags.map(t => `#${escapeHtml(t.name.replace(/\s+/g, '_'))}`).join(' ');
    caption += `🏷️ <b>Теги:</b> ${tagNames}\n`;
  }
  
  caption += `\n📝 <b>Опис:</b>\n${escapeHtml(book.description)}\n`;
  
  console.log('\n=== FORMATTED CAPTION ===');
  console.log(caption);
  
  db.close();
}

testFormat().catch(console.error);
