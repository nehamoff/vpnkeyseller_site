#!/bin/bash

# Monitor application status and logs

APP_DIR="/var/www/cafemaniavpn"

echo "========================================="
echo "CaféMania VPN - Status Check"
echo "========================================="

# Check PM2 status
echo -e "\n📊 PM2 Status:"
pm2 status

# Check if backend is responding
echo -e "\n🔗 Backend Health:"
curl -s http://localhost:3001/health && echo "✓ Backend is healthy" || echo "✗ Backend is not responding"

# Check if frontend is accessible
echo -e "\n🌐 Nginx Status:"
curl -s -I http://localhost/ | head -1

# Check database connection
echo -e "\n💾 Database Status:"
psql -U deploy -d cafemaniavpn -h localhost -c "SELECT 1" > /dev/null 2>&1 && echo "✓ Database is accessible" || echo "✗ Database connection failed"

# Check SSL certificate
echo -e "\n🔒 SSL Certificate Status:"
certbot certificates 2>/dev/null | grep "coffeemaniavpn.ru" || echo "✗ No SSL certificate found"

# Recent errors
echo -e "\n⚠️  Recent Errors in PM2:"
pm2 logs cafemaniavpn-api --err --lines 5 2>/dev/null || echo "No recent errors"

echo -e "\n========================================="
