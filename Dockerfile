# syntax=docker/dockerfile:1

FROM node:26-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --include=dev est indispensable : l'hébergeur peut poser NODE_ENV=production dans
# l'environnement de build, ce qui pousse npm à ignorer les devDependencies. Or le build a
# besoin de TypeScript, Tailwind et Next lui-même, tous déclarés en devDependencies.
RUN npm ci --include=dev

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# lib/env.ts valide tout l'environnement au chargement, y compris pendant `next build` :
# sans ces valeurs, la collecte des pages échoue sur « Invalid environment variables ».
#
# Les variables NEXT_PUBLIC_* doivent porter leur vraie valeur ici, car Next les inline dans
# le bundle client au moment du build. Les secrets serveur, eux, reçoivent des valeurs de
# remplacement : ils ne servent à rien pendant le build et sont fournis au runtime par
# l'hébergeur. lib/env.ts refuse de démarrer en production si l'une d'elles a survécu.
ARG NEXT_PUBLIC_APP_URL=http://build-placeholder.invalid
ARG NEXT_PUBLIC_APP_NAME=BookList
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=build-placeholder
ARG NEXT_PUBLIC_IS_PREVIEW
ARG NEXT_PUBLIC_BUYMEACOFFEE_SLUG
ARG DATABASE_URL=postgres://build-placeholder@build-placeholder.invalid/build-placeholder
ARG BETTER_AUTH_SECRET=build-placeholder-secret-at-least-32-characters
ARG GOOGLE_CLIENT_ID=build-placeholder
ARG GOOGLE_CLIENT_SECRET=build-placeholder
ARG RESEND_API_KEY=build-placeholder
ARG CONTACT_EMAIL=build-placeholder@build-placeholder.invalid
ARG TURNSTILE_SECRET_KEY=build-placeholder
ARG CRON_SECRET=build-placeholder-cron-secret
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
