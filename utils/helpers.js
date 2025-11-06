// Format book caption for display
const formatBookCaption = (book) => {
  let caption = `📖 *${book.title}*\n`;
  caption += `👤 Автор: ${book.author}\n`;
  caption += `📚 Жанр: ${book.genre}\n`;
  caption += `📝 Опис: ${book.description}\n`;
  caption += `📍 Статус: ${book.is_available ? 'Доступна' : 'Недоступна'}`;
  
  return caption;
};

// Format request info for admin
const formatRequestInfo = (request, book) => {
  let info = `📋 Заявка #${request.id}\n`;
  info += `📖 Книга: ${book.title}\n`;
  info += `👤 ПІБ: ${request.full_name}\n`;
  info += `🎯 Підрозділ: ${request.unit}\n`;
  info += `📞 Телефон: ${request.phone}\n`;
  info += `📅 Дата: ${request.created_at}`;
  
  return info;
};

module.exports = {
  formatBookCaption,
  formatRequestInfo
};