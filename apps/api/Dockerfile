# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests (better layer caching)
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

RUN npm install

# Copy source
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY tsconfig.json turbo.json ./

# Generate the Prisma client (needs the schema, so it runs after source copy)
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build API (+ its workspace deps)
RUN npx turbo build --filter=@creatormarket/api...

# Production stage
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# App build output + dependencies (includes the generated Prisma client & CLI)
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
# Prisma schema + migrations so `migrate deploy` can run at startup
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

EXPOSE 3001

# Apply pending migrations, then start the API. Idempotent: `migrate deploy`
# only runs migrations that haven't been applied yet.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma && node dist/main"]
