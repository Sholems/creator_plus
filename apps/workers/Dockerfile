# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/workers/package.json ./apps/workers/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

RUN npm install

COPY apps/workers ./apps/workers
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY tsconfig.json turbo.json ./

# Prisma client (workers use the database package). Install the CLI globally
# because the workspace nests `prisma` under packages/database.
RUN npm install -g prisma@6.19.3 \
    && prisma generate --schema=packages/database/prisma/schema.prisma

RUN npx turbo build --filter=@creatormarket/workers...

# Production stage
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/workers/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/workers/package.json ./

CMD ["node", "dist/index.js"]
