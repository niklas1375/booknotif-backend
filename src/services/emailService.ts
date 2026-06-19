import nodemailer from 'nodemailer';
import { getDatabase } from '../database/db';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Book Notifications <noreply@booknotif.com>';

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASSWORD ? {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      } : undefined,
    });
  }

  /**
   * Send an email
   */
  private async sendEmail(data: EmailData): Promise<void> {
    await this.transporter.sendMail({
      from: EMAIL_FROM,
      to: data.to,
      subject: data.subject,
      html: data.html,
    });
  }

  /**
   * Generate HTML template for new book notification
   */
  private generateNewBookEmail(
    _userName: string,
    authorName: string,
    bookTitle: string,
    publishedDate: string | null,
    isbn: string | null
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
    .book-info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50; }
    .book-title { font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
    .book-detail { margin: 8px 0; color: #555; }
    .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 New Book Alert!</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Great news! <strong>${authorName}</strong> has published a new book:</p>
      
      <div class="book-info">
        <div class="book-title">${bookTitle}</div>
        ${publishedDate ? `<div class="book-detail">📅 Published: ${publishedDate}</div>` : ''}
        ${isbn ? `<div class="book-detail">🔢 ISBN: ${isbn}</div>` : ''}
      </div>
      
      <p>Happy reading!</p>
    </div>
    <div class="footer">
      <p>You're receiving this because you subscribed to ${authorName}'s new releases.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate HTML template for Onleihe availability notification
   */
  private generateOnleiheAvailableEmail(
    _userName: string,
    authorName: string,
    bookTitle: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
    .book-info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #2196F3; }
    .book-title { font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
    .author { color: #555; margin-bottom: 15px; }
    .cta { background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
    .warning { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Available on Onleihe!</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>The book you've been waiting for is now available on Onleihe:</p>
      
      <div class="book-info">
        <div class="book-title">${bookTitle}</div>
        <div class="author">✍️ by ${authorName}</div>
      </div>
      
      <div class="warning">
        ⚠️ <strong>Don't wait too long!</strong> The book might get borrowed by someone else.
      </div>
      
      <p>Happy reading!</p>
    </div>
    <div class="footer">
      <p>You're receiving this because you subscribed to notifications for this book.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send new book notification email
   */
  async sendNewBookNotification(
    userEmail: string,
    userName: string,
    authorName: string,
    bookTitle: string,
    publishedDate: string | null,
    isbn: string | null
  ): Promise<void> {
    const html = this.generateNewBookEmail(userName, authorName, bookTitle, publishedDate, isbn);
    await this.sendEmail({
      to: userEmail,
      subject: `New book by ${authorName}!`,
      html,
    });
  }

  /**
   * Send Onleihe availability notification email
   */
  async sendOnleiheAvailableNotification(
    userEmail: string,
    userName: string,
    authorName: string,
    bookTitle: string
  ): Promise<void> {
    const html = this.generateOnleiheAvailableEmail(userName, authorName, bookTitle);
    await this.sendEmail({
      to: userEmail,
      subject: `${bookTitle} is now available on Onleihe!`,
      html,
    });
  }

  /**
   * Process pending notifications and send emails
   */
  async processPendingNotifications(): Promise<void> {
    console.log('Processing pending email notifications...');

    try {
      const db = getDatabase();

      // Get all pending notifications with user and book details
      const pendingNotifications = await db
        .selectFrom('notifications')
        .innerJoin('users', 'notifications.user_id', 'users.id')
        .innerJoin('authors', 'notifications.author_id', 'authors.id')
        .leftJoin('books', 'notifications.book_id', 'books.id')
        .select([
          'notifications.id',
          'notifications.notification_type',
          'users.email as user_email',
          'authors.name as author_name',
          'books.title as book_title',
          'books.published_date',
          'books.isbn',
        ])
        .where('notifications.status', '=', 'pending')
        .execute();

      console.log(`Found ${pendingNotifications.length} pending notifications`);

      for (const notification of pendingNotifications) {
        try {
          // Send appropriate email based on notification type
          if (notification.notification_type === 'new_book' && notification.book_title) {
            await this.sendNewBookNotification(
              notification.user_email,
              notification.user_email.split('@')[0], // Simple username from email
              notification.author_name,
              notification.book_title,
              notification.published_date,
              notification.isbn
            );
          } else if (notification.notification_type === 'onleihe_available' && notification.book_title) {
            await this.sendOnleiheAvailableNotification(
              notification.user_email,
              notification.user_email.split('@')[0], // Simple username from email
              notification.author_name,
              notification.book_title
            );
          }

          // Mark as sent
          await db
            .updateTable('notifications')
            .set({
              status: 'sent',
              sent_at: new Date().toISOString() as any,
            })
            .where('id', '=', notification.id)
            .execute();

          console.log(`Sent ${notification.notification_type} notification to ${notification.user_email}`);
        } catch (error) {
          // Mark as failed with error message
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await db
            .updateTable('notifications')
            .set({
              status: 'failed',
              error_message: errorMessage,
            })
            .where('id', '=', notification.id)
            .execute();

          console.error(`Failed to send notification ${notification.id}:`, error);
        }
      }

      console.log('Email notification processing completed');
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }
}

export const emailService = new EmailService();