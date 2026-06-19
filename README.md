# Book Notification Backend

Keep up to date on your favorite authors.

## Overview

This is the backend service for the Book Notification application. It provides a REST API built with Express.js and TypeScript, using SQLite with Kysely as the database management tool. The service is designed to run in a Docker container with the SQLite database mounted as a volume.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite
- **ORM**: Kysely
- **Container**: Docker

## Project Structure

```
booknotif-backend/
├── src/
│   ├── database/
│   │   ├── db.ts          # Database initialization and connection
│   │   └── types.ts       # Kysely type definitions
│   └── index.ts           # Express server entry point
├── data/                  # SQLite database directory (mounted volume)
├── dist/                  # Compiled JavaScript output
├── Dockerfile             # Docker image configuration
├── docker-compose.yml     # Docker Compose configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Node.js dependencies and scripts
```

## Database Schema

The application includes the following tables:

- **users**: User accounts with email and timestamps
- **authors**: Author information with external IDs
- **books**: Book details linked to authors
- **notifications**: Notification records for users about new books

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose (for containerized deployment)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/niklas1375/booknotif-backend.git
   cd booknotif-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` with hot-reloading enabled.

### Building for Production

```bash
npm run build
npm start
```

## Docker Deployment

### Using Docker Compose (Recommended)

1. Build and start the container:
   ```bash
   docker-compose up -d
   ```

2. View logs:
   ```bash
   docker-compose logs -f
   ```

3. Stop the container:
   ```bash
   docker-compose down
   ```

The SQLite database will be persisted in the `./data` directory on your host machine.

### Using Docker directly

1. Build the image:
   ```bash
   docker build -t booknotif-backend .
   ```

2. Run the container:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v $(pwd)/data:/data \
     --name booknotif-backend \
     booknotif-backend
   ```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - API information

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DB_PATH` - Path to SQLite database file (default: /data/booknotif.db)
- `NODE_ENV` - Environment mode (development/production)

## Scripts

- `npm run dev` - Start development server with hot-reloading
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (not yet implemented)


## License

This project is licensed under the GNU General Public License v3.0 or later (GPL-3.0-or-later).

This means you are free to:
- Use the software for any purpose
- Study how the program works and modify it
- Redistribute copies
- Distribute modified versions

See the [LICENSE.md](LICENSE.md) file for the full license text.

## Copyright

Copyright (C) 2026 niklas1375

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.