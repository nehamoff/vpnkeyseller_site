#!/bin/bash

# Setup SSL Certificate using Let's Encrypt
# Usage: bash scripts/setup-ssl.sh coffeemaniavpn.ru

DOMAIN=${1:-coffeemaniavpn.ru}
EMAIL=${2:-admin@coffeemaniavpn.ru}

echo "Setting up SSL certificate for $DOMAIN..."

# Create certificate
certbot certonly --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email

# Update Nginx config
NGINX_CONFIG="/etc/nginx/sites-available/cafemaniavpn"
sed -i "s|ssl_certificate .*|ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;|g" "$NGINX_CONFIG"
sed -i "s|ssl_certificate_key .*|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;|g" "$NGINX_CONFIG"

# Test and reload
nginx -t && systemctl reload nginx

echo "✓ SSL certificate installed for $DOMAIN"
echo "✓ Auto-renewal enabled via certbot.timer"

# Enable auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer
