#!/bin/bash

# Update application from git repository

set -e

APP_DIR="/var/www/cafemaniavpn"
cd "$APP_DIR"

echo "🔄 Updating CaféMania VPN..."
echo "========================================="

# Fetch latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
pnpm install > /dev/null 2>&1

cd server
pnpm install > /dev/null 2>&1
pip3 install -r requirements.txt > /dev/null 2>&1
cd ..

# Build frontend
echo "🏗️  Building frontend..."
pnpm run build > /dev/null 2>&1

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart cafemaniavpn-api

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "========================================="
echo "✅ Update completed successfully!"
echo "========================================="
