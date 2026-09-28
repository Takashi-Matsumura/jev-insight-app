# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
# better-sqlite3 のプリビルドが無い場合にソースからビルドするため
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 起動時に lib/db/index.ts が適用するマイグレーション（トレース対象外のため明示的にコピー）
COPY --from=builder /app/drizzle ./drizzle

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
