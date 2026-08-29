#!/bin/sh
set -eu
echo "=== STARTING ==="
echo "PWD=$(pwd)"
echo "NODE=$(node -v)"
ls -la dist/index.js
ls -la node_modules/.bin/prisma || ls -la node_modules/prisma || true
echo "=== PRISMA MIGRATE ==="
# 60s hard ceiling for migrate
node -e "setTimeout(()=>{console.error('migrate timeout');process.exit(1)},60000)" &
WATCH=$!
./node_modules/.bin/prisma migrate deploy || npx --no-install prisma migrate deploy
kill $WATCH 2>/dev/null || true
echo "=== RUNNING NODE ==="
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=384}"
echo "NODE_OPTIONS=$NODE_OPTIONS"
exec node dist/index.js
