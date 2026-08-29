# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Prisma needs OpenSSL on Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY apps/workers/package.json ./apps/workers/
COPY packages/database/package.json ./packages/database/
COPY packages/email/package.json ./packages/email/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

RUN npm install

COPY apps/workers ./apps/workers
COPY packages/database ./packages/database
COPY packages/email ./packages/email
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY tsconfig.json turbo.json ./

# Prisma client (workers use the database package). Install the CLI globally
# because the workspace nests `prisma` under packages/database.
RUN npm install -g prisma@6.19.3 \
    && prisma generate --schema=packages/database/prisma/schema.prisma

RUN npx turbo build --filter=@creatorplus/workers...

# Production stage
FROM node:20-slim AS production

WORKDIR /app
ENV NODE_ENV=production

# Prisma needs OpenSSL on Debian slim (runtime query engine)
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/workers/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/workers/package.json ./
# Workspace packages — same symlink resolution as the API image.
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/email ./packages/email
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/config ./packages/config

CMD ["node", "dist/index.js"]
