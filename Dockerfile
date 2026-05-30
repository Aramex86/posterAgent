FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Copy source code
COPY backend/ ./backend/

# Create generated-images directory
RUN mkdir -p backend/generated-images

# Expose port
EXPOSE 5000

# Start the app
CMD ["sh", "-c", "cd backend && npm start"]
