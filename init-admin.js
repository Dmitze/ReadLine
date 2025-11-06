// Script to initialize the first admin user
require('dotenv').config();
const { addAdmin } = require('./database/models');

const initAdmin = async () => {
  try {
    if (!process.env.ADMIN_ID) {
      console.log('Please set ADMIN_ID in your .env file');
      process.exit(1);
    }
    
    const adminId = process.env.ADMIN_ID;
    const result = await addAdmin(adminId, 'admin');
    
    if (result) {
      console.log(`✅ Admin with ID ${adminId} successfully added to the database`);
    } else {
      console.log(`ℹ️ Admin with ID ${adminId} already exists in the database`);
    }
  } catch (error) {
    console.error('❌ Error adding admin:', error);
  }
};

initAdmin();