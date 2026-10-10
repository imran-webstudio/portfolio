#!/bin/sh
set -eu

attempts=0
until npx prisma db push; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    echo "Database was not ready for prisma db push" >&2
    exit 1
  fi
  echo "Waiting for database ($attempts/30)..."
  sleep 2
done

npx tsx prisma/seed.ts
exec npm start
