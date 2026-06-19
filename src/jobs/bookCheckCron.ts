import cron from 'node-cron';
import { bookCheckService } from '../services/bookCheckService';

/**
 * Initialize the cron job for checking new books
 * Runs daily at 5:00 AM
 */
export const initBookCheckCron = (): void => {
  // Schedule: '0 5 * * *' means:
  // - minute: 0
  // - hour: 5
  // - day of month: * (every day)
  // - month: * (every month)
  // - day of week: * (every day of the week)
  const cronSchedule = '0 5 * * *';

  cron.schedule(
    cronSchedule,
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled book check...`);
      try {
        await bookCheckService.checkForNewBooks();
      } catch (error) {
        console.error('Error in scheduled book check:', error);
      }
    },
    {
      timezone: 'Europe/Berlin', // Adjust timezone as needed
    }
  );

  console.log(`Book check cron job initialized. Will run daily at 5:00 AM (Europe/Berlin)`);
  
  // Optional: Run immediately on startup for testing
  // Uncomment the following lines if you want to run the check when the server starts
  // console.log('Running initial book check...');
  // bookCheckService.checkForNewBooks().catch(console.error);
};

/**
 * Manually trigger a book check (useful for testing or manual triggers via API)
 */
export const triggerManualBookCheck = async (): Promise<void> => {
  console.log('Manual book check triggered');
  await bookCheckService.checkForNewBooks();
};