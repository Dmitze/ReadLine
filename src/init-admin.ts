// Script to initialize the first admin user
import dotenv from 'dotenv';
import { addAdmin } from './database/models';

dotenv.config();

declare var process : {
  env: {
    ADMIN_ID?: string
  },
  exit: (code: number) => void
};

const initAdmin = async () => {
  try {
    if (!process.env.ADMIN_ID) {
      console.log('Please set ADMIN_ID in your .env file');
      process.exit(1);
    }
    
    // Validate admin ID
    const adminIdStr = process.env.ADMIN_ID;
    const adminId = parseInt(adminIdStr!);
    
    if (isNaN(adminId) || adminId <= 0) {
      console.log('❌ Invalid ADMIN_ID. Please provide a valid positive integer.');
      process.exit(1);
    }
    
    console.log(`Initializing admin user with ID: ${adminId}`);
    const result = await addAdmin(adminId, 'admin');
    
    if (result) {
      console.log(`✅ Admin with ID ${adminId} successfully added to the database`);
    } else {
      console.log(`ℹ️ Admin with ID ${adminId} already exists in the database`);
    }
    
    console.log('✅ Admin initialization completed successfully');
  } catch (error) {
    console.error('❌ Error adding admin:', error);
    process.exit(1);
  }
};

initAdmin();