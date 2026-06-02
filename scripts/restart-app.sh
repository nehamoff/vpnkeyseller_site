#!/bin/bash

# Restart application

echo "🔄 Restarting CaféMania VPN application..."

cd /var/www/cafemaniavpn

# Rebuild frontend if needed
if [ "$1" = "--rebuild" ]; then
    echo "📦 Rebuilding frontend..."
    pnpm run build > /dev/null 2>&1
fi

# Restart backend
pm2 restart cafemaniavpn-api

# Wait a moment
sleep 2

# Show status
echo "✓ Application restarted"
pm2 status
