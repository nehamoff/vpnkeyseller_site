# 🐳 Развертывание на Docker

Альтернативный способ развертывания используя Docker и Docker Compose.

## Требования

- Docker 20.10+
- Docker Compose 2.0+
- Минимум 2GB RAM
- 20GB свободного места

## Установка Docker на Debian

```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER

# Установите Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверьте версии
docker --version
docker-compose --version
```

## Быстрый старт

### 1. Подготовка

```bash
cd /var/www/cafemaniavpn

# Скопируйте example .env
cp .env.deploy.example .env

# Отредактируйте .env с реальными значениями
nano .env
```

### 2. Сборка и запуск

```bash
# Постройте образы
docker-compose build

# Запустите контейнеры
docker-compose up -d

# Проверьте статус
docker-compose ps

# Проверьте логи
docker-compose logs -f backend
```

### 3. Инициализация БД

```bash
# Создайте таблицы (выполнится автоматически через init script)
docker-compose exec backend node create-purchases-table.mjs
```

### 4. SSL сертификат

```bash
# Для первого запуска используйте self-signed сертификат (временно)
mkdir -p docker/ssl
openssl req -x509 -newkey rsa:4096 -keyout docker/ssl/privkey.pem \
    -out docker/ssl/fullchain.pem -days 365 -nodes

# Получите реальный сертификат (внутри контейнера)
docker-compose exec nginx certbot certonly --standalone \
    -d coffeemaniavpn.ru -d www.coffeemaniavpn.ru \
    --email admin@coffeemaniavpn.ru --agree-tos --no-eff-email

# Скопируйте сертификат в volume
docker-compose exec -T postgres cp /etc/letsencrypt/live/coffeemaniavpn.ru/* /docker/ssl/
```

## Управление контейнерами

```bash
# Просмотр логов
docker-compose logs backend      # Логи бэкенда
docker-compose logs postgres     # Логи БД
docker-compose logs nginx        # Логи Nginx

# Последние N строк
docker-compose logs --tail=100 backend

# Просмотр в реальном времени
docker-compose logs -f backend

# Выполнение команд в контейнере
docker-compose exec backend npm run dev
docker-compose exec postgres psql -U deploy -d cafemaniavpn

# Перезагрузка
docker-compose restart backend
docker-compose restart postgres

# Остановка всех контейнеров
docker-compose down

# Полное удаление (включая volumes)
docker-compose down -v
```

## Важные переменные окружения

Отредактируйте `.env`:

```env
# Database
DB_PASSWORD=change-me-to-secure-password

# JWT
JWT_SECRET=change-me-to-long-random-string

# Remnawave
REMNAWAVE_TOKEN=your-token
REMNAWAVE_ADMIN_PASSWORD=your-password

# Test mode (false в production)
TEST_MODE=false
```

## Резервные копии БД в Docker

```bash
# Создание backup
docker-compose exec postgres pg_dump -U deploy cafemaniavpn | \
    gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Восстановление из backup
gunzip < backup_20260602_120000.sql.gz | \
    docker-compose exec -T postgres psql -U deploy -d cafemaniavpn
```

## Обновление приложения

```bash
# Pull новый код
git pull origin main

# Пересоберите образы
docker-compose build

# Перезапустите контейнеры
docker-compose up -d
```

## Масштабирование (несколько backend инстансов)

```bash
# docker-compose.yml - измените backend сервис:
services:
  backend:
    deploy:
      replicas: 3  # Запустите 3 инстанса
```

```bash
# Затем пересоберите
docker-compose up -d
```

## Troubleshooting

### Контейнер не запускается

```bash
# Проверьте логи
docker-compose logs backend

# Проверьте resources
docker stats

# Проверьте ports
docker-compose port backend 3001
```

### БД не инициализируется

```bash
# Проверьте volume
docker volume ls | grep cafemaniavpn

# Удалите и переинициализируйте
docker-compose down -v
docker-compose up -d
```

### Проблемы с SSL

```bash
# Проверьте сертификаты в volume
docker-compose exec nginx ls -la /etc/nginx/ssl/

# Обновите сертификат вручную
docker-compose exec nginx certbot renew --force-renewal
```

## Прямое подключение к БД (для разработки)

```bash
# Установите port forwarding
docker-compose exec postgres pg_dump -U deploy cafemaniavpn

# Или используйте pgAdmin (добавьте в docker-compose.yml)
```

## Performance Tips

1. **Используйте named volumes для БД**
   ```yaml
   volumes:
     postgres_data:
       driver: local
   ```

2. **Ограничьте CPU/Memory**
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

3. **Включите кэширование в Nginx**
   - Уже настроено в `docker/nginx.conf`

4. **Используйте production Node.js image**
   - Используется Alpine Linux для меньшего размера

---

**Docker развертывание готово к production! 🚀**
