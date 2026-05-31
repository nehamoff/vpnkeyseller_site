#!/bin/bash
# Запуск на VPS (62.60.157.108), где PostgreSQL доступен через localhost
set -e

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.production .env
  echo "Создан .env из .env.production — проверьте настройки"
fi

npm install --omit=dev
node index.js
