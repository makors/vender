# -----------------------------------------------------------------------------
# Simplified Dockerfile for Vender Scanner Web
# -----------------------------------------------------------------------------

# 1. Builder Stage: Build the Next.js application
FROM oven/bun:1 AS builder

# Set the working directory
WORKDIR /app

# Copy the entire monorepo context
COPY . .

# Install all dependencies
RUN bun install --frozen-lockfile

# Build the specific workspace
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run --filter @vender/scanner-web build


# 2. Runner Stage: Run the standalone Next.js server
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Required for sharp on Alpine Linux
RUN apk add --no-cache libc6-compat

# Copy the standalone server output from the builder
COPY --from=builder /app/apps/scanner-web/.next/standalone ./

# Copy public and static assets
COPY --from=builder /app/apps/scanner-web/public ./apps/scanner-web/public
COPY --from=builder /app/apps/scanner-web/.next/static ./apps/scanner-web/.next/static

# Set the user to a non-root user for security
USER node

# Expose the port
EXPOSE 3000

# The command to run the standalone server (located at apps/scanner-web/server.js)
CMD ["node", "apps/scanner-web/server.js"]