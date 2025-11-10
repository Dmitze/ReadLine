// Тестовий скрипт для AI-асистента адміна
require('dotenv').config();

const { 
  detectGenreFromDescription, 
  generateTagsFromDescription,
  checkDescriptionQuality,
  isAIEnabled 
} = require('./dist/utils/aiHelper');

async function testAIAdmin() {
  console.log('🤖 Тестування AI-асистента для адмінів\n');
  
  if (!isAIEnabled()) {
    console.log('❌ AI недоступний. Перевірте GEMINI_API_KEY в .env');
    return;
  }
  
  console.log('✅ AI доступний\n');
  
  // Тестові дані
  const testBook = {
    title: 'Кобзар',
    author: 'Тарас Шевченко',
    description: 'Збірка поезій великого українського поета. Твори про любов до України, свободу та справедливість.'
  };
  
  console.log('📖 Тестова книга:');
  console.log(`   Назва: ${testBook.title}`);
  console.log(`   Автор: ${testBook.author}`);
  console.log(`   Опис: ${testBook.description}\n`);
  
  // Тест 1: Визначення жанру
  console.log('🧪 Тест 1: Визначення жанру...');
  try {
    const genre = await detectGenreFromDescription(
      testBook.title,
      testBook.author,
      testBook.description
    );
    console.log(`✅ Визначений жанр: ${genre}\n`);
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}\n`);
  }
  
  // Тест 2: Генерація тегів
  console.log('🧪 Тест 2: Генерація тегів...');
  try {
    const tags = await generateTagsFromDescription(
      testBook.title,
      testBook.description,
      'Поезія'
    );
    console.log(`✅ Згенеровані теги: ${tags.join(', ')}\n`);
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}\n`);
  }
  
  // Тест 3: Перевірка якості опису
  console.log('🧪 Тест 3: Перевірка якості опису...');
  try {
    const quality = await checkDescriptionQuality({
      title: testBook.title,
      author: testBook.author,
      genre: 'Поезія',
      description: testBook.description
    });
    
    console.log(`✅ Оцінка якості: ${quality.score}/100`);
    console.log(`   Повнота: ${quality.isComplete ? 'Так' : 'Ні'}`);
    
    if (quality.issues.length > 0) {
      console.log(`   Проблеми:`);
      quality.issues.forEach(issue => console.log(`   • ${issue}`));
    }
    
    if (quality.suggestions.length > 0) {
      console.log(`   Рекомендації:`);
      quality.suggestions.forEach(suggestion => console.log(`   • ${suggestion}`));
    }
    console.log();
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}\n`);
  }
  
  console.log('✅ Тестування завершено!');
}

testAIAdmin().catch(console.error);
