# syntax=docker/dockerfile:1

########################################
# 1. Dependencies (with dev deps for build)
########################################
FROM node:20-alpine AS deps
WORKDIR /app
# libc compat + openssl needed by Prisma engines on Alpine
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall runs `prisma generate`, so schema must be present
RUN npm ci

########################################
# 2. Build the Next.js standalone output
########################################
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is only needed at runtime, a dummy keeps `next build` happy
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

########################################
# 3. Production runtime (Node, standalone)
########################################
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# App listens on this port inside the container
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user (node image already ships a `node` user)
# Standalone server bundle
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Prisma schema + generated client + CLI, needed for db push/seed at startup
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
# tsx + seed sources so `prisma db seed` works in the runtime image
COPY --from=build /app/node_modules/tsx ./node_modules/tsx
COPY --from=build /app/node_modules/.bin ./node_modules/.bin
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
