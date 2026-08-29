# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/web ./apps/web
COPY packages/ui ./packages/ui
COPY packages/shared ./packages/shared
COPY tsconfig.json .
COPY turbo.json .

# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must
# be present during `next build` (pass as Coolify build args / build env vars).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL

# Build
RUN npx turbo build --filter=@creatorplus/web...

# Production stage
FROM node:20-slim AS production

WORKDIR /app
ENV NODE_ENV=production
# Docker sets HOSTNAME to the container id; Next standalone binds to it and
# becomes unreachable behind a reverse proxy. Force 0.0.0.0 so Traefik can
# reach it (fixes 502 Bad Gateway).
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy built files
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "apps/web/server.js"]
