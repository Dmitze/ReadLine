const { getBookById } = require('../dist/database/models');

async function checkBook(id) {
  const book = await getBookById(id);
  if (!book) {
    console.log(`Book ${id} not found`);
    return;
  }
  
  console.log(`\nBook ID ${id}: ${book.title}`);
  console.log('file_url:', book.file_url);
  console.log('file_url length:', book.file_url?.length);
  console.log('audio_file_id:', book.audio_file_id);
  console.log('audio_file_id length:', book.audio_file_id?.length);
  console.log('online_link:', book.online_link);
}

// Перевіряємо останні книги
Promise.all([
  checkBook(138),
  checkBook(137),
  checkBook(136)
]).then(() => process.exit(0));
