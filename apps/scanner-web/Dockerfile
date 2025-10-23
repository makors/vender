# Multi-stage build for Next.js app (scanner-web)

# 1) Builder image: install deps and build
FROM node:20-alpine AS builder
WORKDIR /app

# Install OS deps
RUN apk add --no-cache libc6-compat

# Copy only scanner-web to speed up Docker builds, but include root config for pnpm/npm if needed
COPY apps/scanner-web/package.json ./apps/scanner-web/package.json
COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY apps/scanner-web ./apps/scanner-web

WORKDIR /app/apps/scanner-web

# Ensure optional folders exist
RUN mkdir -p public

# Install deps and build
RUN npm install --no-audit --no-fund
RUN npm run build

# 2) Runner image: minimal production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

ARG APP_DIR=/app
ARG APP_NAME=scanner-web

# Copy standalone output (ensure server.js ends up at /app/server.js)
COPY --from=builder /app/apps/${APP_NAME}/public/ ${APP_DIR}/public/
COPY --from=builder /app/apps/${APP_NAME}/.next/standalone/ ${APP_DIR}/
COPY --from=builder /app/apps/${APP_NAME}/.next/static/ ${APP_DIR}/.next/static/
COPY --from=builder /app/apps/${APP_NAME}/.next/BUILD_ID ${APP_DIR}/.next/BUILD_ID

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

ENV PORT=3000

# Optional: allow configuring API base via env
# TICKETS_API_URL will be read by the proxy route

CMD ["node", "server.js"]


