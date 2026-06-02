#!/bin/bash

# CaféMania VPN - Production Deployment Script
# Usage: bash deploy.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции логирования
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Проверьте что скрипт запущен как root или sudo
if [[ $EUID -ne 0 ]]; then
   log_error "Этот скрипт должен запущен как root (используйте sudo)"
fi

APP_DIR="/var/www/cafemaniavpn"
cd "$APP_DIR" || log_error "Не удалось перейти в $APP_DIR"

log_info "========================================="
log_info "CaféMania VPN - Развертывание"
log_info "========================================="

# Шаг 1: Установка системных зависимостей
log_info "Шаг 1/5: Установка системных зависимостей..."

apt-get update -qq
apt-get install -y -qq \
    curl wget git build-essential \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx \
    postgresql postgresql-contrib \
    2>&1 | grep -v "^Get:" | grep -v "^Fetched" || true

log_info "✓ Системные зависимости установлены"

# Шаг 2: Установка Node.js и npm инструментов
log_info "Шаг 2/5: Установка Node.js инструментов..."

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs 2>&1 | grep -v "^Get:" || true
fi

npm install -g pnpm pm2 > /dev/null 2>&1

log_info "Node.js версия: $(node --version)"
log_info "✓ Node.js инструменты установлены"

# Шаг 3: Установка зависимостей приложения
log_info "Шаг 3/5: Установка зависимостей приложения..."

pnpm install --frozen-lockfile > /dev/null 2>&1

cd "$APP_DIR/server"
pnpm install --frozen-lockfile > /dev/null 2>&1

pip3 install -r requirements.txt > /dev/null 2>&1

cd "$APP_DIR"
log_info "✓ Зависимости приложения установлены"

# Шаг 4: Конфигурация окружения
log_info "Шаг 4/5: Конфигурация окружения..."

if [ ! -f "$APP_DIR/server/.env" ]; then
    log_warn ".env файл не найден. Скопируем пример и отредактируйте его."
    cp "$APP_DIR/.env.deploy.example" "$APP_DIR/server/.env"
    log_warn "⚠️  ВАЖНО: Отредактируйте $APP_DIR/server/.env с реальными значениями!"
    log_warn "Затем перезапустите скрипт развертывания"
    exit 0
fi

log_info "✓ Окружение сконфигурировано"

# Шаг 5: Инициализация БД и сборка
log_info "Шаг 5/5: Инициализация БД и сборка фронтенда..."

# Инициализируйте БД (если не инициализирована)
cd "$APP_DIR/server"
node create-purchases-table.mjs > /dev/null 2>&1 || true

# Пересоберите фронтенд
cd "$APP_DIR"
pnpm run build > /dev/null 2>&1

log_info "✓ БД инициализирована и фронтенд собран"

# Шаг 6: Конфигурация Nginx
log_info "Шаг 6/6: Конфигурация Nginx..."

if [ ! -f /etc/nginx/sites-available/cafemaniavpn ]; then
    bash "$APP_DIR/scripts/setup-nginx.sh"
    log_info "✓ Nginx сконфигурирован"
else
    log_info "✓ Nginx конфигурация уже существует"
fi

# Тестируйте Nginx конфиг
nginx -t > /dev/null 2>&1 || log_error "Nginx конфиг ошибка!"

# Перезагрузите Nginx
systemctl restart nginx > /dev/null 2>&1

log_info "✓ Nginx перезагружен"

# Шаг 7: PM2 конфигурация
log_info "Запуск приложения через PM2..."

cd "$APP_DIR"
pm2 delete cafemaniavpn-api > /dev/null 2>&1 || true
pm2 start ecosystem.config.js > /dev/null 2>&1

# Сохраните PM2 конфиг
pm2 save > /dev/null 2>&1
pm2 startup systemd -u deploy --hp /home/deploy > /dev/null 2>&1 || true

log_info "✓ Приложение запущено через PM2"

# Шаг 8: SSL (если необходимо)
if [ "$SETUP_SSL" = "true" ]; then
    log_info "Настройка SSL сертификата..."
    bash "$APP_DIR/scripts/setup-ssl.sh"
fi

# Завершение
log_info "========================================="
log_info "✅ Развертывание завершено!"
log_info "========================================="
log_info "Приложение доступно на: https://coffeemaniavpn.ru"
log_info "Проверьте логи: pm2 logs cafemaniavpn-api"
log_info "Статус: pm2 status"
log_info "========================================="
