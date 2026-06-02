# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production stage - serve static files with serve
FROM node:22-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist

# Install serve globally
RUN npm install -g serve

EXPOSE 80

CMD ["serve", "-s", "dist/client", "-l", "80"]
