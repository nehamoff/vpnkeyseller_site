#!/bin/bash
# CaféMania VPN - Команды и шпаргалки для быстрого доступа

# ========================
# 🚀 РАЗВЕРТЫВАНИЕ
# ========================

# Быстрое развертывание (на сервере)
cd /var/www/cafemaniavpn
sudo bash deploy.sh

# Docker развертывание
docker-compose build
docker-compose up -d

# ========================
# ⚙️ КОНФИГУРАЦИЯ
# ========================

# Отредактируйте .env
sudo nano server/.env

# Сгенерируйте JWT SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Копируйте example .env
cp .env.deploy.example server/.env

# ========================
# 🔒 SSL СЕРТИФИКАТ
# ========================

# Получите сертификат (Let's Encrypt)
sudo bash scripts/setup-ssl.sh coffeemaniavpn.ru admin@coffeemaniavpn.ru

# Проверьте что сертификат установлен
sudo openssl x509 -in /etc/letsencrypt/live/coffeemaniavpn.ru/fullchain.pem -text

# Обновите сертификат вручную
sudo certbot renew --force-renewal

# ========================
# 📦 УПРАВЛЕНИЕ ПРИЛОЖЕНИЕМ
# ========================

# PM2 команды
pm2 status                          # Статус всех приложений
pm2 start ecosystem.config.js       # Запуск
pm2 restart cafemaniavpn-api        # Перезагрузка
pm2 stop cafemaniavpn-api           # Остановка
pm2 logs cafemaniavpn-api           # Логи в реальном времени
pm2 save                             # Сохранить конфиг
pm2 startup systemd -u deploy       # Автозагрузка

# Nginx команды
sudo nginx -t                        # Проверка конфига
sudo systemctl start nginx           # Запуск
sudo systemctl restart nginx         # Перезагрузка
sudo systemctl status nginx          # Статус
sudo tail -f /var/log/nginx/cafemaniavpn_error.log  # Ошибки

# PostgreSQL команды
sudo systemctl status postgresql
sudo su - postgres
psql
\dt                                  # Показать таблицы
SELECT * FROM purchases;             #查看购买记录
\q                                   # Выход

# ========================
# 📊 МОНИТОРИНГ И ЛОГИ
# ========================

# Проверьте статус приложения
bash scripts/check-status.sh

# Смотрите логи в реальном времени
bash scripts/watch-logs.sh

# Проверьте backend
curl -I http://localhost:3001/health
curl -I http://localhost:3001/api/

# Проверьте frontend
curl -I http://localhost/
curl -I https://coffeemaniavpn.ru/

# Проверьте БД
psql -U deploy -d cafemaniavpn -h localhost -c "SELECT 1"

# ========================
# 🔄 ОБНОВЛЕНИЕ
# ========================

# Обновите приложение
bash scripts/update.sh

# Пересоберите фронтенд
pnpm run build

# Переустановите зависимости
pnpm install
cd server && pnpm install && cd ..
pip3 install -r server/requirements.txt

# ========================
# 💾 РЕЗЕРВНЫЕ КОПИИ
# ========================

# Создайте backup БД
bash scripts/backup-db.sh

# Ручной backup
pg_dump -U deploy cafemaniavpn | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Восстановите из backup
gunzip < backup_20260602_120000.sql.gz | psql -U deploy -d cafemaniavpn

# ========================
# 🐳 DOCKER КОМАНДЫ
# ========================

# Запустите контейнеры
docker-compose up -d

# Остановите контейнеры
docker-compose down

# Смотрите логи
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f nginx

# Выполните команду в контейнере
docker-compose exec backend npm run dev
docker-compose exec postgres psql -U deploy -d cafemaniavpn

# Перезагрузитe контейнер
docker-compose restart backend
docker-compose restart postgres

# Удалите все контейнеры и volumes
docker-compose down -v

# ========================
# 🧪 ТЕСТИРОВАНИЕ
# ========================

# Тестируйте API регистрации
curl -X POST https://coffeemaniavpn.ru/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Тестируйте API входа
curl -X POST https://coffeemaniavpn.ru/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Инициализируйте БД
cd server && node create-purchases-table.mjs && cd ..

# ========================
# 🔧 TROUBLESHOOTING
# ========================

# Приложение не запускается - проверьте логи
pm2 logs cafemaniavpn-api

# 502 Bad Gateway - проверьте бэкенд
curl http://localhost:3001/health

# Нет подключения к БД
psql -U deploy -d cafemaniavpn -h localhost

# Nginx ошибка
sudo nginx -t
sudo systemctl restart nginx

# SSL не работает
sudo openssl x509 -in /etc/letsencrypt/live/coffeemaniavpn.ru/fullchain.pem -noout -dates

# ========================
# 📝 ИНФОРМАЦИЯ
# ========================

# Версии
node --version
npm --version
python3 --version
psql --version

# Версия приложения (из package.json)
grep '"version"' package.json | head -1

# Git статус
git status
git log --oneline | head -5

# Размер БД
psql -U deploy -d cafemaniavpn -c "SELECT pg_size_pretty(pg_database_size('cafemaniavpn'));"

# Размер приложения
du -sh /var/www/cafemaniavpn

# ========================
# 🚨 КРИТИЧЕСКИЕ
# ========================

# Перезагрузите сервер
sudo reboot

# Остановите все приложения перед обновлением ОС
pm2 stop all

# Запустите все приложения после обновления ОС
pm2 start all

# Очистите логи (осторожно!)
pm2 flush

# Удалите приложение из PM2
pm2 delete cafemaniavpn-api
