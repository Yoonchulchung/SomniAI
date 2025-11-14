# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for Prisma)
RUN npm ci

# Copy Prisma schema first
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create entrypoint script
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'echo "Syncing database schema..."' >> /entrypoint.sh && \
    echo 'npx prisma db push --skip-generate || echo "Database sync failed, continuing..."' >> /entrypoint.sh && \
    echo 'echo "Starting server..."' >> /entrypoint.sh && \
    echo 'exec npm start' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start with entrypoint
ENTRYPOINT ["/entrypoint.sh"]
