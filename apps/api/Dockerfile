# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Prisma needs OpenSSL on Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests (better layer caching)
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/email/package.json ./packages/email/
COPY packages/shared/package.json ./packages/shared/

RUN npm install

# Copy source
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/email ./packages/email
COPY packages/shared ./packages/shared
COPY tsconfig.json turbo.json ./

# Generate the Prisma client. Install the CLI globally (the workspace nests
# `prisma` under packages/database, so it isn't on PATH); @prisma/client
# resolves from the root here.
RUN npm install -g prisma@6.19.3 \
    && prisma generate --schema=packages/database/prisma/schema.prisma

# Build API (+ its workspace deps)
RUN npx turbo build --filter=@creatormarket/api...

# Production stage
FROM node:20-slim AS production

WORKDIR /app
ENV NODE_ENV=production

# Prisma needs OpenSSL on Debian slim (runtime query engine + migrate deploy)
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Prisma CLI baked into the image so the startup migrate needs no network fetch.
RUN npm install -g prisma@6.19.3

# App build output + dependencies (includes the generated Prisma client)
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# npm doesn't always hoist workspace deps to the root — some (e.g.
# class-validator, class-transformer) resolve into apps/api/node_modules.
# `node dist/main` only resolves from root node_modules, so merge the nested
# workspace deps into it, otherwise the app crashes with MODULE_NOT_FOUND.
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
# Workspace packages (@creatormarket/database, @creatormarket/shared) — npm
# symlinks them into root node_modules, so the packages must exist in the image
# for those symlinks to resolve at runtime. The database package also carries
# the Prisma schema + migrations that `migrate deploy` runs at startup.
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/email ./packages/email
COPY --from=builder /app/packages/shared ./packages/shared

EXPOSE 3001

# Apply pending migrations, then start the API. Idempotent: `migrate deploy`
# only runs migrations that haven't been applied yet.
CMD ["sh", "-c", "prisma migrate deploy --schema=packages/database/prisma/schema.prisma && node dist/main"]
