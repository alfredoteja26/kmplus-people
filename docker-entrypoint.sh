#!/bin/sh
set -e

echo "[entrypoint] Waiting for database to be reachable..."

# Push the Prisma schema to the database (idempotent, no migrations dir needed).
# RUN_DB_PUSH / RUN_DB_SEED can be set to "false" to skip on subsequent boots.
if [ "${RUN_DB_PUSH:-true}" = "true" ]; then
  echo "[entrypoint] prisma db push"
  npx prisma db push --skip-generate --accept-data-loss
fi

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "[entrypoint] prisma db seed"
  npx prisma db seed || echo "[entrypoint] seed skipped/failed (continuing)"
fi

echo "[entrypoint] Starting app: $*"
exec "$@"
