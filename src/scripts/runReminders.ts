import dotenv from 'dotenv';
import { connectDB } from '../config/database';
import { runReminderService } from '../services/reminderService';

dotenv.config();

const runScript = async () => {
  try {
    await connectDB();
    console.log('Connected to database');
    
    await runReminderService();
    console.log('Reminder service completed');
    
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
};

runScript();