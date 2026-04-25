# =============================================================================
# Candyshop — CI / local-dev image (all apps, built from source)
# Builds all 7 apps in standalone mode, runs them behind nginx via supervisord.
# Exposes port 80 (nginx) for E2E testing all routes.
# Build: docker build -f docker/ci/Dockerfile -t candyshop-ci .
# Run:   docker run -p 8088:80 candyshop-ci
# =============================================================================

# ── Stage 1: install deps ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/store/package.json ./apps/store/
COPY apps/auth/package.json ./apps/auth/
COPY apps/admin/package.json ./apps/admin/
COPY apps/landing/package.json ./apps/landing/
COPY apps/payments/package.json ./apps/payments/
COPY apps/playground/package.json ./apps/playground/
COPY apps/studio/package.json ./apps/studio/
COPY packages/api/package.json ./packages/api/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/auth/package.json ./packages/auth/
COPY packages/app-components/package.json ./packages/app-components/

RUN pnpm install --frozen-lockfile || \
    (echo "Frozen lockfile install failed in Docker, retrying without frozen lockfile" && \
    pnpm install --no-frozen-lockfile)

COPY . .

# ── Build args baked into bundles at build time ───────────────────────────────
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_STORE_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_PLAYGROUND_URL
ARG NEXT_PUBLIC_LANDING_URL
ARG NEXT_PUBLIC_PAYMENTS_URL
ARG NEXT_PUBLIC_STUDIO_URL
ARG NEXT_PUBLIC_BUILD_HASH=ci
ARG NEXT_PUBLIC_AUTH_HOST_URL
ARG NEXT_PUBLIC_ENABLE_TEST_IDS
ARG NEXT_PUBLIC_ENV_DEBUG

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_AUTH_HOST_URL=$NEXT_PUBLIC_AUTH_HOST_URL
ENV NEXT_PUBLIC_STORE_URL=$NEXT_PUBLIC_STORE_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_PLAYGROUND_URL=$NEXT_PUBLIC_PLAYGROUND_URL
ENV NEXT_PUBLIC_LANDING_URL=$NEXT_PUBLIC_LANDING_URL
ENV NEXT_PUBLIC_PAYMENTS_URL=$NEXT_PUBLIC_PAYMENTS_URL
ENV NEXT_PUBLIC_STUDIO_URL=$NEXT_PUBLIC_STUDIO_URL
ENV NEXT_PUBLIC_BUILD_HASH=$NEXT_PUBLIC_BUILD_HASH
ENV NEXT_PUBLIC_ENABLE_TEST_IDS=$NEXT_PUBLIC_ENABLE_TEST_IDS
ENV STANDALONE=true

# ── Stage 2: build each app ───────────────────────────────────────────────────
FROM deps AS builder
RUN pnpm --filter store run build && \
    pnpm --filter auth-app run build && \
    pnpm --filter admin run build && \
    pnpm --filter landing run build && \
    pnpm --filter payments run build && \
    pnpm --filter playground run build && \
    pnpm --filter studio run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache nginx supervisor netcat-openbsd && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /var/log/nginx /var/log/supervisor /var/run/nginx /run/nginx

# Copy standalone builds for each app
COPY --from=builder /app/apps/store/.next/standalone    /app/store/
COPY --from=builder /app/apps/store/.next/static        /app/store/apps/store/.next/static
COPY --from=builder /app/apps/store/public              /app/store/apps/store/public

COPY --from=builder /app/apps/auth/.next/standalone     /app/auth/
COPY --from=builder /app/apps/auth/.next/static         /app/auth/apps/auth/.next/static
COPY --from=builder /app/apps/auth/public               /app/auth/apps/auth/public

COPY --from=builder /app/apps/admin/.next/standalone    /app/admin/
COPY --from=builder /app/apps/admin/.next/static        /app/admin/apps/admin/.next/static
COPY --from=builder /app/apps/admin/public              /app/admin/apps/admin/public

COPY --from=builder /app/apps/landing/.next/standalone  /app/landing/
COPY --from=builder /app/apps/landing/.next/static      /app/landing/apps/landing/.next/static
COPY --from=builder /app/apps/landing/public            /app/landing/apps/landing/public

COPY --from=builder /app/apps/payments/.next/standalone /app/payments/
COPY --from=builder /app/apps/payments/.next/static     /app/payments/apps/payments/.next/static
COPY --from=builder /app/apps/payments/public           /app/payments/apps/payments/public

COPY --from=builder /app/apps/playground/.next/standalone /app/playground/
COPY --from=builder /app/apps/playground/.next/static     /app/playground/apps/playground/.next/static
COPY --from=builder /app/apps/playground/public           /app/playground/apps/playground/public

COPY --from=builder /app/apps/studio/.next/standalone   /app/studio/
COPY --from=builder /app/apps/studio/.next/static       /app/studio/apps/studio/.next/static
COPY --from=builder /app/apps/studio/public             /app/studio/apps/studio/public

# Copy nginx and supervisord configs from prod (shared config)
COPY docker/prod/nginx.conf /etc/nginx/nginx.conf
COPY docker/prod/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy the in-container health watcher
COPY docker/watcher.mjs /app/watcher.mjs

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
