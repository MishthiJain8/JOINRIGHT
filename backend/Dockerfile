# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeapp -u 1001

# Create necessary directories
RUN mkdir -p uploads recordings logs
RUN chown -R nodeapp:nodejs uploads recordings logs

# Copy application code
COPY . .

# Remove development files
RUN rm -rf .env .env.* *.md

# Change to app user
USER nodeapp

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]