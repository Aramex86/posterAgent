# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production stage - serve static files with vite preview
FROM node:22-alpine

WORKDIR /app

# Copy built files and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 80

CMD ["npx", "vite", "preview", "--port", "80", "--host", "0.0.0.0"]
