const { initDatabase } = require('../database/models');

// Initialize database when config is loaded
initDatabase();

module.exports = {
  // Database initialization is handled above
};