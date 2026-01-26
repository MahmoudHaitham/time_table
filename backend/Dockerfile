# Backend Dockerfile - Multi-stage build
# Stage 1: Build TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (Python, make, g++ for native modules)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build || true && ls -la dist/

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies (Python, make, g++ for native modules)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose backend port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server.js"]
