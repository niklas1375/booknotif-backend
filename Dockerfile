FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Install TypeScript and build dependencies
RUN npm install --save-dev typescript @types/node @types/express @types/cors && \
    npm run build && \
    npm prune --production

# Create data directory for SQLite database
RUN mkdir -p /data

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/booknotif.db

# Start the application
CMD ["node", "dist/index.js"]