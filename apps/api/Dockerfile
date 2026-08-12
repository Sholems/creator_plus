# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY tsconfig.json .
COPY turbo.json .

# Build
RUN npx turbo build --filter=@creatormarket/api...

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/main"]
