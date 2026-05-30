FROM node:20-slim

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm-dev \
    libxkbcommon-dev \
    libgbm-dev \
    libasound-dev \
    libatspi2.0-0 \
    libxshmfence-dev \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libpango-1.0-0 \
    libcairo2 \
    libfontconfig1 \
    libfreetype6 \
    libharfbuzz0b \
    libglib2.0-0 \
    libdbus-1-3 \
    libexpat1 \
    libgcc-s1 \
    libnspr4 \
    libwayland-client0 \
    libxcb1 \
    libxext6 \
    libxi6 \
    libxrandr2 \
    libxtst6 \
    fonts-liberation \
    fonts-noto-color-emoji \
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
