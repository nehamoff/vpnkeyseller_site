#!/bin/bash

# Database backup script
# Usage: bash scripts/backup-db.sh

BACKUP_DIR="/var/backups/cafemaniavpn"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "💾 Creating database backup..."
pg_dump -U deploy cafemaniavpn | gzip > "$BACKUP_DIR/cafemaniavpn_$DATE.sql.gz"

echo "✓ Backup created: $BACKUP_DIR/cafemaniavpn_$DATE.sql.gz"
echo "Size: $(du -h "$BACKUP_DIR/cafemaniavpn_$DATE.sql.gz" | cut -f1)"

# Remove backups older than 30 days
echo "🗑️  Cleaning old backups (older than 30 days)..."
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete

echo "✓ Backup complete"
