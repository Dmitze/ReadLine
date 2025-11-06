// Main user keyboards

const getMainMenuKeyboard = () => {
  return {
    keyboard: [
      ['📖 Перегляд каталогу', '🔍 Пошук книги'],
      ['📋 Мої заявки', 'ℹ️ Допомога']
    ],
    resize_keyboard: true
  };
};

const getGenreKeyboard = (genres) => {
  const keyboard = genres.map(genre => [{ text: genre }]);
  keyboard.push([{ text: '⬅️ Назад' }]);
  
  return {
    keyboard,
    resize_keyboard: true
  };
};

const getBookOrderKeyboard = (bookId) => {
  return {
    inline_keyboard: [
      [{ text: '🎯 Замовити цю книгу', callback_data: `order_${bookId}` }]
    ]
  };
};

const getBackKeyboard = () => {
  return {
    keyboard: [[{ text: '⬅️ Назад' }]],
    resize_keyboard: true
  };
};

module.exports = {
  getMainMenuKeyboard,
  getGenreKeyboard,
  getBookOrderKeyboard,
  getBackKeyboard
};