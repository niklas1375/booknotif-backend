import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database/db';
import { initBookCheckCron, triggerManualBookCheck } from './jobs/bookCheckCron';
import { initOnleiheCheckCron, triggerManualOnleiheCheck } from './jobs/onleiheCheckCron';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Book Notification API' });
});

// Manual trigger endpoint for book check (useful for testing)
app.post('/api/check-books', async (_req: Request, res: Response) => {
  try {
    await triggerManualBookCheck();
    res.json({ message: 'Book check triggered successfully' });
  } catch (error) {
    console.error('Error triggering book check:', error);
    res.status(500).json({ error: 'Failed to trigger book check' });
  }
});

// Manual trigger endpoint for Onleihe check (useful for testing)
app.post('/api/check-onleihe', async (_req: Request, res: Response) => {
  try {
    await triggerManualOnleiheCheck();
    res.json({ message: 'Onleihe check triggered successfully' });
  } catch (error) {
    console.error('Error triggering Onleihe check:', error);
    res.status(500).json({ error: 'Failed to trigger Onleihe check' });
  }
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully');

    // Initialize cron jobs
    initBookCheckCron();
    initOnleiheCheckCron();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();