/**
 * Тест обробника промокодів
 */

console.log('🧪 Тестування обробника промокодів...\n');

// Симулюємо контекст
const mockCtx = {
  from: { id: 906087418 },
  reply: async (text, options) => {
    console.log('📤 Відповідь бота:');
    console.log(text);
    if (options && options.reply_markup) {
      console.log('\n🔘 Кнопки:', JSON.stringify(options.reply_markup, null, 2));
    }
    console.log('');
  }
};

// Імпортуємо функції
const path = require('path');
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'library.db');
process.env.DB_PATH = dbPath;

async function testPromoCode() {
  try {
    const {
      hasUserReceivedPromoCode,
      getAvailablePromoCodesCount,
      getAvailablePromoCode,
      markPromoCodeAsUsed
    } = require('../dist/database/promoCodeFunctions');

    const userId = 906087418;

    console.log('1️⃣ Перевірка чи користувач вже отримував промокод...');
    const hasReceived = await hasUserReceivedPromoCode(userId);
    console.log(`   Результат: ${hasReceived ? 'Так' : 'Ні'}\n`);

    if (hasReceived) {
      console.log('❌ Користувач вже отримував промокод');
      return;
    }

    console.log('2️⃣ Перевірка кількості доступних промокодів...');
    const availableCount = await getAvailablePromoCodesCount();
    console.log(`   Доступно: ${availableCount}\n`);

    if (availableCount === 0) {
      console.log('❌ Промокодів немає');
      return;
    }

    console.log('3️⃣ Отримання промокоду для користувача...');
    const promoCode = await getAvailablePromoCode(userId);
    console.log(`   Промокод: ${promoCode ? promoCode.code : 'null'}\n`);

    if (!promoCode) {
      console.log('❌ Не вдалося отримати промокод');
      return;
    }

    console.log('4️⃣ Позначення промокоду як використаного...');
    await markPromoCodeAsUsed(userId, promoCode.id);
    console.log('   ✅ Промокод позначено як використаний\n');

    console.log('✅ ТЕСТ ПРОЙДЕНО УСПІШНО!');
    console.log(`\n🎉 Промокод для користувача: ${promoCode.code}`);

  } catch (error) {
    console.error('❌ ПОМИЛКА:', error);
  }
}

testPromoCode();
