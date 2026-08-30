# ══════════════════════════════════════════════════════════
# PDHOAN PIPSNOTE — Production Dockerfile
# Next.js 14 App Router + Standalone Output
# ══════════════════════════════════════════════════════════

# ── Stage 1: Dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --ignore-scripts

# ── Stage 2: Builder ───────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build Next.js app (standalone output)
# Env vars for build time (NEXT_PUBLIC_* must be set at build)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Production Runner ─────────────────────────────
FROM node:20-alpine AS runner

# Install system dependencies
RUN apk add --no-cache \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built app from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Media upload local — tao thu muc uploads + cho nextjs (uid 1001) ghi duoc
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start server
CMD ["node", "server.js"]
