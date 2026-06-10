#!/bin/bash
set -e

APP_NAME="cocomadigital"
APP_DIR="/www/wwwroot/cocomadigital.com"

# aaPanel Node.js 20 path
export PATH="/www/server/nodejs/v20.11.0/bin:$PATH"

echo "Deployment started..."
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

cd "$APP_DIR"

git config --global --add safe.directory "$APP_DIR"

echo "Pulling latest code..."
git fetch origin
git checkout main
git reset --hard origin/main

echo "Cleaning old build artifacts and dependencies..."
rm -rf .next build node_modules package-lock.json

echo "Installing dependencies (fresh install for correct platform binaries)..."
npm install --legacy-peer-deps

echo "Creating production build..."
npm run build

echo "Reloading PM2 process..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo "Deployment finished!"