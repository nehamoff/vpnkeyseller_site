# 🚀 Развертывание CaféMania VPN на Debian Production

Полное руководство по развертыванию приложения на сервере Debian с доменом **coffeemaniavpn.ru**

## 📋 Содержание

1. [Требования](#требования)
2. [1. Подготовка сервера](#1-подготовка-сервера)
3. [2. Установка зависимостей](#2-установка-зависимостей)
4. [3. Настройка PostgreSQL](#3-настройка-postgresql)
5. [4. Загрузка кода](#4-загрузка-кода)
6. [5. Конфигурация приложения](#5-конфигурация-приложения)
7. [6. Сборка фронтенда](#6-сборка-фронтенда)
8. [7. Настройка Nginx](#7-настройка-nginx)
9. [8. SSL сертификат](#8-ssl-сертификат)
10. [9. PM2 для бэкенда](#9-pm2-для-бэкенда)
11. [10. Тестирование](#10-тестирование)

---

## Требования

- Сервер Debian 11/12
- Минимум 2GB RAM
- Минимум 20GB disk space
- SSH доступ
- Свежий доменный имя: **coffeemaniavpn.ru**
- DNS A-запись указывает на IP сервера

---

## 1. Подготовка сервера

```bash
# Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# Обновите систему
apt update && apt upgrade -y

# Создайте непривилегированного пользователя
adduser deploy
usermod -aG sudo deploy

# Переключитесь на нового пользователя
su - deploy
```

---

## 2. Установка зависимостей

```bash
# Node.js 20 LTS (используется для бэкенда и построения фронтенда)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# npm - автоматически устанавливается с Node.js
node --version    # v20.x.x
npm --version     # 10.x.x

# pnpm (используется в проекте)
npm install -g pnpm

# PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15

# Python 3 (для интеграции Remnawave)
sudo apt install -y python3 python3-pip python3-venv

# Nginx
sudo apt install -y nginx

# PM2 (процесс менеджер для Node.js)
sudo npm install -g pm2

# Certbot (для Let's Encrypt SSL)
sudo apt install -y certbot python3-certbot-nginx

# Git (для клонирования репозитория)
sudo apt install -y git

# Curl и другие утилиты
sudo apt install -y curl wget
```

---

## 3. Настройка PostgreSQL

```bash
# Переключитесь на пользователя postgres
sudo su - postgres

# Запустите psql
psql

# Создайте базу данных
CREATE DATABASE cafemaniavpn;

# Создайте пользователя с пароль
CREATE USER deploy WITH PASSWORD 'SECURE_PASSWORD_HERE';

# Дайте права
ALTER ROLE deploy SET client_encoding TO 'utf8';
ALTER ROLE deploy SET default_transaction_isolation TO 'read committed';
ALTER ROLE deploy SET default_transaction_deferrable TO on;
ALTER ROLE deploy SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE cafemaniavpn TO deploy;

# Выход
\q

# Выход из postgres
exit

# Проверьте подключение (как пользователь deploy)
psql -U deploy -d cafemaniavpn -h localhost
\q
```

---

## 4. Загрузка кода

```bash
# Создайте директорию приложения
sudo mkdir -p /var/www/cafemaniavpn
sudo chown deploy:deploy /var/www/cafemaniavpn

# Перейдите в директорию
cd /var/www/cafemaniavpn

# Клонируйте репозиторий (замените на вашу ссылку)
# git clone https://github.com/yourusername/cafemaniavpn.git .

# ИЛИ загрузьте вручную через SCP/SFTP:
# На локальной машине:
# scp -r . deploy@YOUR_SERVER_IP:/var/www/cafemaniavpn/
```

---

## 5. Конфигурация приложения

### 5.1 Создайте .env файлы

**Основной .env в корне проекта:**

```bash
# /var/www/cafemaniavpn/.env
NODE_ENV=production
FRONTEND_URL=https://coffeemaniavpn.ru
```

**Backend .env:**

```bash
# /var/www/cafemaniavpn/server/.env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://deploy:SECURE_PASSWORD_HERE@localhost:5432/cafemaniavpn
JWT_SECRET=generate-long-random-string-here
FRONTEND_URL=https://coffeemaniavpn.ru

# Remnawave Python Integration
REMNAWAVE_BASE_URL=https://panel.coffemaniavpn.online/
REMNAWAVE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # из вашей конфигурации
REMNAWAVE_ADMIN_LOGIN=admin
REMNAWAVE_ADMIN_PASSWORD=your-password

# Email (если используется)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
ADMIN_EMAIL=admin@coffeemaniavpn.ru

# Telegram (если используется)
TELEGRAM_BOT_TOKEN=your-bot-token

# Тестовый режим (false в production)
TEST_MODE=false
```

Сгенерируйте безопасный JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5.2 Установите зависимости

```bash
cd /var/www/cafemaniavpn

# Установите зависимости фронтенда
pnpm install

# Установите зависимости бэкенда
cd server
pnpm install

# Установите Python зависимости
pip3 install -r requirements.txt

cd ..
```

### 5.3 Инициализируйте базу данных

```bash
cd /var/www/cafemaniavpn/server

# Создайте таблицы
node create-purchases-table.mjs

# Убедитесь что таблицы созданы
psql -U deploy -d cafemaniavpn -h localhost -c "\dt"
```

---

## 6. Сборка фронтенда

```bash
cd /var/www/cafemaniavpn

# Постройте фронтенд для production
pnpm run build

# Проверьте что dist создан
ls -la dist/

# Результат должен содержать index.html и другие assets
```

---

## 7. Настройка Nginx

### 7.1 Создайте конфигурацию Nginx

```bash
sudo nano /etc/nginx/sites-available/cafemaniavpn
```

Вставьте:

```nginx
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

    # SSL будет настроено после
    # ssl_certificate /etc/letsencrypt/live/coffeemaniavpn.ru/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/coffeemaniavpn.ru/privkey.pem;

    # SSL параметры
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Логи
    access_log /var/log/nginx/cafemaniavpn_access.log;
    error_log /var/log/nginx/cafemaniavpn_error.log;

    # Размер тела запроса
    client_max_body_size 20M;

    # Статические файлы фронтенда
    location / {
        root /var/www/cafemaniavpn/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API бэкенда
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
        proxy_read_timeout 60s;
    }

    # Health check endpoint (опционально)
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### 7.2 Активируйте конфигурацию

```bash
# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/cafemaniavpn /etc/nginx/sites-enabled/

# Тестируйте конфигурацию
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl restart nginx
```

---

## 8. SSL сертификат (Let's Encrypt)

```bash
# Получите сертификат через Certbot
sudo certbot certonly --nginx -d coffeemaniavpn.ru -d www.coffeemaniavpn.ru

# Следуйте инструкциям (согласитесь с условиями и введите email)

# Проверьте что сертификат создан
sudo ls -la /etc/letsencrypt/live/coffeemaniavpn.ru/

# Обновите Nginx конфигурацию - раскомментируйте SSL строки
sudo nano /etc/nginx/sites-available/cafemaniavpn

# Найдите и раскомментируйте:
# ssl_certificate /etc/letsencrypt/live/coffeemaniavpn.ru/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/coffeemaniavpn.ru/privkey.pem;

# Тестируйте и перезагрузите
sudo nginx -t
sudo systemctl restart nginx

# Настройте auto-renewal (Certbot обычно это делает автоматически)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 9. PM2 для бэкенда

### 9.1 Создайте PM2 конфигурацию

```bash
sudo nano /var/www/cafemaniavpn/ecosystem.config.js
```

Вставьте:

```javascript
module.exports = {
  apps: [
    {
      name: "cafemaniavpn-api",
      script: "index.js",
      cwd: "/var/www/cafemaniavpn/server",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      },
      error_file: "/var/log/pm2/cafemaniavpn-error.log",
      out_file: "/var/log/pm2/cafemaniavpn-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "500M",
      watch: false,
      ignore_watch: ["node_modules", "dist"],
      node_args: "--max-old-space-size=512"
    }
  ]
};
```

### 9.2 Запустите приложение через PM2

```bash
cd /var/www/cafemaniavpn

# Запустите с конфигурацией
pm2 start ecosystem.config.js

# Проверьте статус
pm2 status
pm2 logs cafemaniavpn-api

# Сохраните конфигурацию
pm2 save

# Установите PM2 для автозагрузки
sudo pm2 startup systemd -u deploy --hp /home/deploy
sudo systemctl start pm2-deploy
```

---

## 10. Тестирование

### 10.1 Проверьте приложение

```bash
# Проверьте что бэкенд работает
curl -I http://localhost:3001/health

# Проверьте что фронтенд работает на Nginx
curl -I http://localhost/

# Проверьте HTTPS
curl -I https://coffeemaniavpn.ru/
```

### 10.2 Логи

```bash
# Логи PM2
pm2 logs cafemaniavpn-api

# Логи Nginx
sudo tail -f /var/log/nginx/cafemaniavpn_error.log
sudo tail -f /var/log/nginx/cafemaniavpn_access.log

# Логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### 10.3 Тестирование API

```bash
# Регистрация пользователя
curl -X POST https://coffeemaniavpn.ru/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Вход
curl -X POST https://coffeemaniavpn.ru/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 11. Дополнительные конфигурации

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Резервные копии PostgreSQL

```bash
# Создайте скрипт резервной копии
sudo nano /usr/local/bin/backup-cafemaniavpn.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/cafemaniavpn"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U deploy cafemaniavpn | gzip > $BACKUP_DIR/cafemaniavpn_$DATE.sql.gz
# Удаляйте старые резервные копии (старше 30 дней)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

```bash
# Сделайте исполняемым
sudo chmod +x /usr/local/bin/backup-cafemaniavpn.sh

# Добавьте в crontab (ежедневно в 2AM)
sudo crontab -e
# Добавьте: 0 2 * * * /usr/local/bin/backup-cafemaniavpn.sh
```

### Мониторинг

```bash
# Установите PM2 мониторинг (опционально)
pm2 install pm2-logrotate
pm2 install pm2-auto-pull

# Или используйте Monit
sudo apt install -y monit
```

---

## 12. Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи PM2
pm2 logs cafemaniavpn-api

# Проверьте .env переменные
cat /var/www/cafemaniavpn/server/.env

# Проверьте подключение к БД
psql -U deploy -d cafemaniavpn -h localhost -c "SELECT 1"
```

### Nginx возвращает 502 Bad Gateway

```bash
# Проверьте что бэкенд работает
curl http://localhost:3001/health

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/cafemaniavpn_error.log

# Перезагрузите приложение через PM2
pm2 restart cafemaniavpn-api
```

### SSL не работает

```bash
# Проверьте сертификат
sudo openssl x509 -in /etc/letsencrypt/live/coffeemaniavpn.ru/fullchain.pem -text -noout

# Проверьте что Nginx конфиг правильный
sudo nginx -t

# Обновите сертификат вручную
sudo certbot renew --force-renewal
```

---

## ✅ Checklist После Развертывания

- [ ] SSH доступ работает
- [ ] PostgreSQL запущена и содержит таблицы
- [ ] Node.js зависимости установлены
- [ ] Python зависимости установлены
- [ ] Фронтенд собран в dist/
- [ ] Nginx конфиг проверен (nginx -t)
- [ ] SSL сертификат установлен
- [ ] PM2 запустил приложение
- [ ] https://coffeemaniavpn.ru доступен в браузере
- [ ] API endpoints работают
- [ ] Логи в PM2 чистые (нет ошибок)
- [ ] Резервные копии БД настроены
- [ ] Firewall правильно настроен

---

## 📞 Команды для управления

```bash
# PM2
pm2 start ecosystem.config.js
pm2 restart cafemaniavpn-api
pm2 stop cafemaniavpn-api
pm2 logs cafemaniavpn-api

# Nginx
sudo systemctl start nginx
sudo systemctl restart nginx
sudo systemctl status nginx

# PostgreSQL
sudo systemctl start postgresql
sudo systemctl restart postgresql
sudo systemctl status postgresql

# Certbot
sudo certbot renew
sudo systemctl status certbot.timer
```

---

**Приложение готово к production! 🚀**
