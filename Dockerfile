FROM node:20-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm-dev \
    libxkbcommon-dev \
    libgbm-dev \
    libasound-dev \
    libatspi2.0-0 \
    libxshmfence-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Install Playwright browsers
RUN cd backend && npx playwright install chromium

# Copy source code
COPY backend/ ./backend/

# Create generated-images directory
RUN mkdir -p backend/generated-images

# Expose port
EXPOSE 5000

# Start the app
CMD ["sh", "-c", "cd backend && npm start"]
