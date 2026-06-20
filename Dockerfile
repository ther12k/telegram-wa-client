# syntax=docker/dockerfile:1.7
# ─── Build stage ────────────────────────────────────────────────────────────────
FROM oven/bun:1.3.14 AS build
WORKDIR /app

# Resolve & install deps first (cache-friendly)
COPY package.json bun.lock* ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN bun install --frozen-lockfile || bun install

# Build all workspaces
COPY . .
RUN bun run --filter '@telewa/web' build
RUN bun run --filter '@telewa/server' build
# ─── Runtime stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1.3.14 AS runtime
WORKDIR /app

# Build-time version metadata (override via --build-arg APP_VERSION=<tag>)
ARG APP_VERSION=dev
ARG APP_COMMIT=unknown
ENV APP_VERSION=${APP_VERSION} \
    APP_COMMIT=${APP_COMMIT} \
    NODE_ENV=production \
    PORT=3001

# Drop privileges
RUN groupadd --system --gid 1001 telewa \
 && useradd  --system --uid 1001 --gid telewa --no-create-home telewa

COPY --from=build --chown=telewa:telewa /app/package.json                       ./package.json
COPY --from=build --chown=telewa:telewa /app/node_modules                       ./node_modules
COPY --from=build --chown=telewa:telewa /app/packages/contracts                  ./packages/contracts
COPY --from=build --chown=telewa:telewa /app/apps/server/package.json            ./apps/server/package.json
COPY --from=build --chown=telewa:telewa /app/apps/server/dist                   ./apps/server/dist
COPY --from=build --chown=telewa:telewa /app/apps/web/dist                      ./apps/web/dist

USER telewa
EXPOSE 3001

# Bun baked-in health probe — hits /health/ready without external deps
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "--filter", "@telewa/server", "start"] 
