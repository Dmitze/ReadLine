// Admin keyboards

const getAdminMenuKeyboard = () => {
  return {
    inline_keyboard: [
      [{ text: '📋 Перегляд заявок', callback_data: 'view_requests' }],
      [{ text: '➕ Додати книгу', callback_data: 'add_book' }],
      [{ text: '📊 Статистика', callback_data: 'admin_stats' }]
    ]
  };
};

const getRequestActionKeyboard = (requestId) => {
  return {
    inline_keyboard: [
      [{ text: '✅ Підтвердити', callback_data: `approve_${requestId}` }],
      [{ text: '❌ Відхилити', callback_data: `reject_${requestId}` }]
    ]
  };
};

const getGenresKeyboard = (genres) => {
  const keyboard = genres.map(genre => [{ text: genre }]);
  return {
    keyboard,
    one_time_keyboard: true,
    resize_keyboard: true
  };
};

module.exports = {
  getAdminMenuKeyboard,
  getRequestActionKeyboard,
  getGenresKeyboard
};