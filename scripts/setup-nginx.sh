#!/bin/bash

# Setup Nginx configuration for CaféMania VPN
# This script creates the Nginx config if it doesn't exist

NGINX_CONFIG="/etc/nginx/sites-available/cafemaniavpn"
DOMAIN=${1:-coffeemaniavpn.ru}

cat > "$NGINX_CONFIG" << 'EOF'
upstream node_backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    listen [::]:80;
    server_name coffeemaniavpn.ru www.coffeemaniavpn.ru;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name coffeemaniavpn.ru www.coffeemaniavpn.ru;

    # SSL Certificate - Update these after running certbot
    ssl_certificate /etc/letsencrypt/live/coffeemaniavpn.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coffeemaniavpn.ru/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Logging
    access_log /var/log/nginx/cafemaniavpn_access.log combined;
    error_log /var/log/nginx/cafemaniavpn_error.log warn;

    # Request size limit
    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    gzip_min_length 1000;

    # Static files (frontend)
    location / {
        root /var/www/cafemaniavpn/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints (backend) — увеличенный таймаут для confirm/Remnawave
    location /api/ {
        proxy_pass http://node_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 15s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF

# Activate the config
ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/cafemaniavpn

echo "✓ Nginx configuration created at $NGINX_CONFIG"
echo "✓ Configuration linked to sites-enabled"
