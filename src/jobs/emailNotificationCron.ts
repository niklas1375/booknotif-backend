import cron from 'node-cron';
import { emailService } from '../services/emailService';

/**
 * Initialize the cron job for processing email notifications
 * Runs every 10 minutes to process pending notifications
 */
export const initEmailNotificationCron = (): void => {
  // Schedule: '*/10 * * * *' means:
  // - minute: every 10 minutes
  // - hour: * (every hour)
  // - day of month: * (every day)
  // - month: * (every month)
  // - day of week: * (every day of the week)
  const cronSchedule = '*/10 * * * *';

  cron.schedule(
    cronSchedule,
    async () => {
      console.log(`[${new Date().toISOString()}] Running email notification processing...`);
      try {
        await emailService.processPendingNotifications();
      } catch (error) {
        console.error('Error in email notification processing:', error);
      }
    },
    {
      timezone: 'Europe/Berlin',
    }
  );

  console.log(`Email notification cron job initialized. Will run every 10 minutes (Europe/Berlin)`);
  
  // Optional: Run immediately on startup for testing
  // Uncomment the following lines if you want to process notifications when the server starts
  // console.log('Running initial email notification processing...');
  // emailService.processPendingNotifications().catch(console.error);
};

/**
 * Manually trigger email notification processing (useful for testing or manual triggers via API)
 */
export const triggerManualEmailProcessing = async (): Promise<void> => {
  console.log('Manual email notification processing triggered');
  await emailService.processPendingNotifications();
};