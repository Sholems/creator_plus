# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/

RUN npm install

COPY apps/admin ./apps/admin
COPY packages/ui ./packages/ui
COPY packages/shared ./packages/shared
COPY tsconfig.json turbo.json ./

# NEXT_PUBLIC_* must be present at build time (baked into the client bundle)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npx turbo build --filter=@creatormarket/admin...

# Production stage
FROM node:20-slim AS production

WORKDIR /app
ENV NODE_ENV=production
# Force bind to all interfaces (Docker sets HOSTNAME to the container id, which
# makes Next standalone unreachable behind a reverse proxy → 502).
ENV HOSTNAME=0.0.0.0
ENV PORT=3002

COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

EXPOSE 3002

CMD ["node", "apps/admin/server.js"]
