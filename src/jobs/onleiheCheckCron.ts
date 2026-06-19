import cron from 'node-cron';
import { onleiheCheckService } from '../services/onleiheCheckService';

/**
 * Initialize the cron job for checking Onleihe availability
 * Runs daily at 6:00 AM
 */
export const initOnleiheCheckCron = (): void => {
  // Schedule: '0 6 * * *' means:
  // - minute: 0
  // - hour: 6
  // - day of month: * (every day)
  // - month: * (every month)
  // - day of week: * (every day of the week)
  const cronSchedule = '0 6 * * *';

  cron.schedule(
    cronSchedule,
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled Onleihe availability check...`);
      try {
        await onleiheCheckService.checkOnleiheAvailability();
      } catch (error) {
        console.error('Error in scheduled Onleihe check:', error);
      }
    },
    {
      timezone: 'Europe/Berlin', // Adjust timezone as needed
    }
  );

  console.log(`Onleihe check cron job initialized. Will run daily at 6:00 AM (Europe/Berlin)`);
  
  // Optional: Run immediately on startup for testing
  // Uncomment the following lines if you want to run the check when the server starts
  // console.log('Running initial Onleihe check...');
  // onleiheCheckService.checkOnleiheAvailability().catch(console.error);
};

/**
 * Manually trigger an Onleihe availability check (useful for testing or manual triggers via API)
 */
export const triggerManualOnleiheCheck = async (): Promise<void> => {
  console.log('Manual Onleihe check triggered');
  await onleiheCheckService.checkOnleiheAvailability();
};