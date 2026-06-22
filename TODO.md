# TODO & Future Tasks

This document outlines pending setup tasks, known issues, and potential future enhancements for the Book Notification Backend.

## 🔴 Critical Setup Tasks

### Gmail/SMTP Configuration
- [ ] **Set up Gmail App Password**
  - Go to Google Account settings → Security → 2-Step Verification
  - Generate an App Password for the application
  - Update `.env` file with `SMTP_USER` and `SMTP_PASSWORD`
  - Reference: https://support.google.com/accounts/answer/185833

- [ ] **Configure Email Settings**
  - Set `SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE` in `.env`
  - Set `EMAIL_FROM` with appropriate sender name and email
  - Test email delivery with `/api/process-emails` endpoint

- [ ] **Email Service Testing**
  - Create test user and author subscription
  - Trigger manual book check to generate notifications
  - Verify emails are sent successfully
  - Check spam folder if emails not received

### API Keys & External Services
- [ ] **Google Books API Key**
  - Obtain API key from Google Cloud Console
  - Enable Google Books API for the project
  - Add key to `.env` as `GOOGLE_BOOKS_API_KEY`
  - Reference: https://developers.google.com/books/docs/v1/using

- [ ] **Onleihe Configuration**
  - Determine correct Onleihe ID for your library
  - Update `.env` with `ONLEIHE_ID`
  - Test Onleihe availability checks

## 🟡 Security & Authentication

### API Authentication & Authorization
- [ ] **Implement User Authentication**
  - Add JWT-based authentication system
  - Create login/register endpoints
  - Store hashed passwords (bcrypt/argon2)
  - Add authentication middleware

- [ ] **Protect API Endpoints**
  - Add authentication middleware to all user-specific routes
  - Implement user ownership validation (users can only access their own data)
  - Add rate limiting to prevent abuse
  - Consider API key authentication for service-to-service calls

- [ ] **Email Verification**
  - Implement email verification flow for new users
  - Send verification email on registration
  - Add `email_verified` field to users table
  - Prevent notifications to unverified emails

- [ ] **Password Reset Flow**
  - Create password reset request endpoint
  - Generate secure reset tokens with expiration
  - Send reset emails with secure links
  - Implement password update endpoint

### Security Enhancements
- [ ] **Input Validation & Sanitization**
  - Add comprehensive input validation (e.g., express-validator)
  - Sanitize all user inputs to prevent injection attacks
  - Validate email formats, ISBNs, etc.

- [ ] **CORS Configuration**
  - Configure CORS properly for production
  - Set `CORS_ORIGIN` in `.env` to specific frontend URL
  - Remove wildcard CORS in production

- [ ] **Environment Variables Security**
  - Ensure `.env` is in `.gitignore`
  - Document all required environment variables
  - Add validation for required env vars on startup

- [ ] **HTTPS/TLS**
  - Configure HTTPS for production deployment
  - Use reverse proxy (nginx/traefik) for SSL termination
  - Enforce HTTPS redirects

## 🟢 Feature Enhancements

### User Experience
- [ ] **User Preferences**
  - Add notification preferences (email frequency, types)
  - Allow users to pause/resume notifications
  - Add timezone preferences for notification timing
  - Implement digest emails (daily/weekly summaries)

- [ ] **Unsubscribe Functionality**
  - Add unsubscribe links to notification emails
  - Create unsubscribe endpoint with token validation
  - Allow users to manage subscriptions via email links

- [ ] **Email Templates**
  - Create more sophisticated HTML email templates
  - Add book cover images to notifications
  - Include direct links to purchase/borrow books
  - Add personalization (user name, reading history)

### Book & Author Management
- [ ] **Enhanced Book Search**
  - Add full-text search across books and authors
  - Implement filters (genre, publication date, availability)
  - Add pagination for large result sets

- [ ] **Author Information**
  - Fetch and store author biographies
  - Add author images/photos
  - Track author social media links

- [ ] **Book Details**
  - Store book descriptions and summaries
  - Add book cover image URLs
  - Track book genres/categories
  - Store page count, language, publisher info

- [ ] **Multiple Book Sources**
  - Support additional book APIs (OpenLibrary, etc.)
  - Implement fallback mechanisms if primary API fails
  - Aggregate data from multiple sources

### Notification System
- [ ] **Notification Channels**
  - Add push notifications (web push, mobile)
  - Implement SMS notifications (Twilio integration)
  - Add webhook support for custom integrations

- [ ] **Smart Notifications**
  - Avoid duplicate notifications for same book
  - Group multiple new books from same author
  - Implement notification throttling/batching

- [ ] **Notification History**
  - Add read/unread status for notifications
  - Allow users to mark notifications as read
  - Implement notification archiving

### Onleihe Integration
- [ ] **Enhanced Onleihe Features**
  - Track loan periods and return dates
  - Notify when borrowed books are due
  - Check waitlist position for unavailable books
  - Support multiple Onleihe libraries per user

- [ ] **Availability Predictions**
  - Track historical availability patterns
  - Predict when books might become available
  - Notify users of predicted availability windows

## 🔵 Technical Improvements

### Code Quality & Testing
- [ ] **Unit Tests**
  - Write tests for services (emailService, bookCheckService, etc.)
  - Test database operations
  - Mock external API calls

- [ ] **Integration Tests**
  - Test API endpoints end-to-end
  - Test cron job execution
  - Test email sending flow

- [ ] **Error Handling**
  - Implement global error handler middleware
  - Add structured logging (Winston/Pino)
  - Implement error tracking (Sentry)

- [ ] **Code Documentation**
  - Add JSDoc comments to all functions
  - Document API endpoints (OpenAPI/Swagger)
  - Create architecture documentation

### Performance & Scalability
- [ ] **Database Optimization**
  - Add database indexes for frequently queried fields
  - Implement connection pooling
  - Consider migration to PostgreSQL for production

- [ ] **Caching**
  - Cache Google Books API responses
  - Cache Onleihe availability checks
  - Implement Redis for distributed caching

- [ ] **Background Jobs**
  - Move to proper job queue (Bull/BullMQ)
  - Implement job retry logic with exponential backoff
  - Add job monitoring and alerting

- [ ] **API Rate Limiting**
  - Implement rate limiting per user/IP
  - Add request throttling for external APIs
  - Handle API quota limits gracefully

### Monitoring & Operations
- [ ] **Health Checks**
  - Add detailed health check endpoint
  - Monitor database connectivity
  - Check external API availability
  - Monitor email service status

- [ ] **Metrics & Analytics**
  - Track notification delivery rates
  - Monitor API response times
  - Track user engagement metrics
  - Implement application performance monitoring (APM)

- [ ] **Logging**
  - Implement structured logging
  - Add log levels (debug, info, warn, error)
  - Set up log aggregation (ELK stack, CloudWatch)
  - Add request/response logging

- [ ] **Backup & Recovery**
  - Implement automated database backups
  - Test backup restoration procedures
  - Document disaster recovery plan

### DevOps & Deployment
- [ ] **CI/CD Pipeline**
  - Set up automated testing on commits
  - Implement automated deployments
  - Add code quality checks (linting, formatting)

- [ ] **Container Orchestration**
  - Create Kubernetes manifests
  - Set up horizontal pod autoscaling
  - Implement rolling updates

- [ ] **Environment Management**
  - Set up staging environment
  - Implement environment-specific configurations
  - Use secrets management (Vault, AWS Secrets Manager)

## 📋 Documentation Tasks

- [ ] **API Documentation**
  - Create OpenAPI/Swagger specification
  - Document all endpoints with examples
  - Add authentication requirements
  - Document error responses

- [ ] **Setup Guide**
  - Create detailed setup instructions
  - Document Gmail app password setup
  - Add troubleshooting section
  - Create video walkthrough

- [ ] **User Guide**
  - Document how to use the API
  - Create example API calls (curl, Postman)
  - Explain notification system
  - Add FAQ section

- [ ] **Developer Guide**
  - Document code architecture
  - Explain database schema
  - Add contribution guidelines
  - Document coding standards

## 🎯 Future Considerations

### Advanced Features
- [ ] Reading lists and collections
- [ ] Book recommendations based on preferences
- [ ] Social features (share books, reviews)
- [ ] Integration with Goodreads/LibraryThing
- [ ] Mobile app development
- [ ] Browser extension for quick subscriptions
- [ ] Multi-language support (i18n)
- [ ] Dark mode for email templates

### Business Features
- [ ] User analytics dashboard
- [ ] Admin panel for system management
- [ ] Subscription tiers (free/premium)
- [ ] Affiliate links for book purchases
- [ ] Library partnership integrations

---

## Priority Legend
- 🔴 **Critical**: Must be completed before production deployment
- 🟡 **High**: Important for security and user experience
- 🟢 **Medium**: Enhances functionality and usability
- 🔵 **Low**: Nice to have, improves quality of life

## Notes
- Review and update this document regularly
- Mark items as complete with `[x]` when finished
- Add new items as they are identified
- Link to relevant issues/PRs when available