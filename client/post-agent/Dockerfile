# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production stage - run SSR server
FROM node:22-alpine

WORKDIR /app

# Copy built files and server entry
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-entry.js ./
COPY --from=builder /app/package*.json ./

EXPOSE 80

CMD ["node", "server-entry.js"]
