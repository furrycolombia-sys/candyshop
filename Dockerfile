# Combined Dockerfile for store + studio + landing + payments + admin + auth + playground apps
# Serves all apps from a single container using nginx as reverse proxy

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Build stage
FROM base AS builder
WORKDIR /app

# Accept build args
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BUILD_HASH
ARG NEXT_PUBLIC_ENABLE_TEST_IDS
ARG NEXT_PUBLIC_PROJECT_ID
ARG NEXT_PUBLIC_TENANT
# Auth / Keycloak build args
ARG AUTH_PROVIDER_MODE=keycloak
ARG NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
# Cross-app navigation
ARG NEXT_PUBLIC_STORE_URL
ARG NEXT_PUBLIC_LANDING_URL
ARG NEXT_PUBLIC_PAYMENTS_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_PLAYGROUND_URL
ARG NEXT_PUBLIC_STUDIO_URL
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_AUTH_HOST_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG SITE_PUBLIC_ORIGIN
# Base path prefix
ARG BASE_PATH_PREFIX=""

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BUILD_HASH=$NEXT_PUBLIC_BUILD_HASH
ENV NEXT_PUBLIC_ENABLE_TEST_IDS=$NEXT_PUBLIC_ENABLE_TEST_IDS
ENV NEXT_PUBLIC_PROJECT_ID=$NEXT_PUBLIC_PROJECT_ID
ENV NEXT_PUBLIC_TENANT=$NEXT_PUBLIC_TENANT
ENV AUTH_PROVIDER_MODE=$AUTH_PROVIDER_MODE
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_STORE_URL=$NEXT_PUBLIC_STORE_URL
ENV NEXT_PUBLIC_LANDING_URL=$NEXT_PUBLIC_LANDING_URL
ENV NEXT_PUBLIC_PAYMENTS_URL=$NEXT_PUBLIC_PAYMENTS_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_PLAYGROUND_URL=$NEXT_PUBLIC_PLAYGROUND_URL
ENV NEXT_PUBLIC_STUDIO_URL=$NEXT_PUBLIC_STUDIO_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_AUTH_HOST_URL=$NEXT_PUBLIC_AUTH_HOST_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV SITE_PUBLIC_ORIGIN=$SITE_PUBLIC_ORIGIN
ENV BASE_PATH_PREFIX=$BASE_PATH_PREFIX

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .env.example ./
COPY config ./config
COPY apps/store/package.json ./apps/store/
COPY apps/studio/package.json ./apps/studio/
COPY apps/landing/package.json ./apps/landing/
COPY apps/payments/package.json ./apps/payments/
COPY apps/admin/package.json ./apps/admin/
COPY apps/auth/package.json ./apps/auth/
COPY apps/playground/package.json ./apps/playground/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/app-components/package.json ./packages/app-components/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy shared scripts (load-root-env.js used by next.config.ts)
COPY scripts ./scripts

# Copy source files
COPY apps/store ./apps/store
COPY apps/studio ./apps/studio
COPY apps/landing ./apps/landing
COPY apps/payments ./apps/payments
COPY apps/admin ./apps/admin
COPY apps/auth ./apps/auth
COPY apps/playground ./apps/playground
COPY packages/api ./packages/api
COPY packages/auth ./packages/auth
COPY packages/app-components ./packages/app-components
COPY packages/ui ./packages/ui
COPY packages/shared ./packages/shared

# Build all apps with standalone output for Docker deployment
ENV STANDALONE=true
RUN pnpm --filter store build
RUN pnpm --filter studio build
RUN pnpm --filter landing build
RUN pnpm --filter payments build
RUN pnpm --filter admin build
RUN pnpm --filter auth-app build
RUN pnpm --filter playground build

# Production stage
FROM node:22-alpine AS runner
RUN apk add --no-cache nginx supervisor

WORKDIR /app

ENV NODE_ENV=production
ENV STANDALONE=true

# Runtime env vars (not inherited from builder stage)
ARG AUTH_PROVIDER_MODE=keycloak
ARG NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NEXT_PUBLIC_STORE_URL
ARG NEXT_PUBLIC_LANDING_URL
ARG NEXT_PUBLIC_PAYMENTS_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_PLAYGROUND_URL
ARG NEXT_PUBLIC_STUDIO_URL
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_AUTH_HOST_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG SITE_PUBLIC_ORIGIN
ENV AUTH_PROVIDER_MODE=$AUTH_PROVIDER_MODE
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_STORE_URL=$NEXT_PUBLIC_STORE_URL
ENV NEXT_PUBLIC_LANDING_URL=$NEXT_PUBLIC_LANDING_URL
ENV NEXT_PUBLIC_PAYMENTS_URL=$NEXT_PUBLIC_PAYMENTS_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_PLAYGROUND_URL=$NEXT_PUBLIC_PLAYGROUND_URL
ENV NEXT_PUBLIC_STUDIO_URL=$NEXT_PUBLIC_STUDIO_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_AUTH_HOST_URL=$NEXT_PUBLIC_AUTH_HOST_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV SITE_PUBLIC_ORIGIN=$SITE_PUBLIC_ORIGIN

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy store app standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/store/.next/standalone ./store
COPY --from=builder --chown=nextjs:nodejs /app/apps/store/.next/static ./store/apps/store/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/store/public ./store/apps/store/public

# Copy studio app standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/studio/.next/standalone ./studio
COPY --from=builder --chown=nextjs:nodejs /app/apps/studio/.next/static ./studio/apps/studio/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/studio/public ./studio/apps/studio/public

# Copy landing app standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing/.next/standalone ./landing
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing/.next/static ./landing/apps/landing/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing/public ./landing/apps/landing/public

# Copy payments app standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/payments/.next/standalone ./payments
COPY --from=builder --chown=nextjs:nodejs /app/apps/payments/.next/static ./payments/apps/payments/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/payments/public ./payments/apps/payments/public

# Copy admin app standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./admin
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./admin/apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./admin/apps/admin/public

# Copy auth app standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/auth/.next/standalone ./auth
COPY --from=builder --chown=nextjs:nodejs /app/apps/auth/.next/static ./auth/apps/auth/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/auth/public ./auth/apps/auth/public

# Copy playground app standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/playground/.next/standalone ./playground
COPY --from=builder --chown=nextjs:nodejs /app/apps/playground/.next/static ./playground/apps/playground/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/playground/public ./playground/apps/playground/public

# Copy nginx and supervisor configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

# Create nginx pid and log directories
RUN mkdir -p /var/run/nginx /var/log/nginx /var/log/supervisor && \
    chown -R nextjs:nodejs /var/run/nginx /var/log/nginx /var/log/supervisor /etc/nginx

EXPOSE 80

# Supervisor must run as root to manage nginx (port 80) and spawn node processes as nextjs user.
# Node processes run as non-root (user=nextjs in supervisord.conf).
# nosemgrep: dockerfile.security.missing-user.missing-user
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
