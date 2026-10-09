#!/bin/sh
set -e

# Schema changes only: boot once with RUN_DB_PUSH=true (uses DIRECT_URL), then set it back to false.
# Production is never seeded from here; seeding mails a set-password link to every seeded login.
if [ "${RUN_DB_PUSH:-false}" = "true" ]; then
  echo "[entrypoint] prisma db push"
  npx prisma db push --skip-generate
  echo "[entrypoint] lock down the Supabase Data API (RLS on every table)"
  npx prisma db execute --schema prisma/schema.prisma --file prisma/supabase-lockdown.sql
fi

echo "[entrypoint] Starting app: $*"
exec "$@"
