#!/bin/bash

# Watch application logs in real-time

echo "🔍 Watching CaféMania VPN logs..."
echo "Press Ctrl+C to exit"
echo "========================================="

pm2 logs cafemaniavpn-api
