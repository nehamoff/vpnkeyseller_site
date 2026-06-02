# ⚡ Быстрое развертывание CaféMania VPN на Debian

**Время: ~15 минут**

## 📋 Если хотите быстро (без деталей):

### Вариант 1: Автоматизированный скрипт

```bash
# На сервере:
cd /var/www/cafemaniavpn

# 1. Отредактируйте конфигурацию
sudo nano server/.env

# Убедитесь что эти строки правильные:
# DATABASE_URL=postgresql://deploy:PASSWORD@localhost:5432/cafemaniavpn
# JWT_SECRET=<long-random-string>
# REMNAWAVE_TOKEN=<ваш-токен>

# 2. Запустите развертывание
sudo bash deploy.sh

# 3. Установите SSL
sudo bash scripts/setup-ssl.sh coffeemaniavpn.ru admin@coffeemaniavpn.ru

# 4. Проверьте статус
bash scripts/check-status.sh
```

### Вариант 2: Docker (еще быстрее)

```bash
cd /var/www/cafemaniavpn

# 1. Отредактируйте .env
cp .env.deploy.example .env
nano .env

# 2. Запустите контейнеры
docker-compose build
docker-compose up -d

# 3. Инициализируйте БД
docker-compose exec backend node create-purchases-table.mjs

# 4. Проверьте
docker-compose ps
docker-compose logs -f backend
```

---

## 🔧 Если нужны подробности:

- **[DEPLOYMENT_DEBIAN.md](./DEPLOYMENT_DEBIAN.md)** — Полное пошаговое руководство
- **[DEPLOYMENT_DOCKER.md](./DEPLOYMENT_DOCKER.md)** — Docker развертывание
- **[DEPLOYMENT_SCRIPTS.md](./DEPLOYMENT_SCRIPTS.md)** — Полезные команды

---

## 📱 Что нужно подготовить ПЕРЕД развертыванием:

### ✅ На локальной машине:

1. **Код приложения** (загруженный на сервер)
2. **Remnawave credentials:**
   - Base URL: `https://panel.coffemaniavpn.online/`
   - Token: (из вашей конфигурации)
   - Admin login + password

3. **Доменное имя:**
   - `coffeemaniavpn.ru` должен указывать на IP сервера (DNS A-запись)

### ✅ На сервере:

1. **Сервер Debian 11+**
2. **Sudo/root доступ**
3. **SSH ключ для CI/CD (опционально)**

---

## 🚀 Минимальные команды (3 шага):

```bash
# Шаг 1: Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# Шаг 2: Создайте пользователя и загрузите код
adduser deploy
su - deploy
cd /var/www/cafemaniavpn  # если уже клонировано

# Шаг 3: Запустите развертывание
sudo bash deploy.sh

# Проверьте
curl https://coffeemaniavpn.ru
```

---

## ⚠️ Важные шаги, которые нельзя пропустить:

1. **Отредактируйте .env с реальными данными** ⚡
   ```bash
   sudo nano server/.env
   ```

2. **Получите SSL сертификат** 🔒
   ```bash
   sudo bash scripts/setup-ssl.sh coffeemaniavpn.ru
   ```

3. **Проверьте что приложение работает** ✓
   ```bash
   bash scripts/check-status.sh
   ```

---

## 📊 После развертывания:

### Полезные команды:

```bash
# Просмотр логов
pm2 logs cafemaniavpn-api

# Перезагрузка приложения
pm2 restart cafemaniavpn-api

# Обновление приложения
bash scripts/update.sh

# Резервная копия БД
bash scripts/backup-db.sh

# Статус всех сервисов
bash scripts/check-status.sh
```

### URL для проверки:

- **Frontend:** https://coffeemaniavpn.ru
- **Backend API:** https://coffeemaniavpn.ru/api/auth/login
- **Health check:** https://coffeemaniavpn.ru/health

---

## 🆘 Если что-то не работает:

### Логи для диагностики:

```bash
# Бэкенд логи
pm2 logs cafemaniavpn-api

# Nginx ошибки
sudo tail -f /var/log/nginx/cafemaniavpn_error.log

# БД логи
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Типичные проблемы:

1. **502 Bad Gateway** → Проверьте бэкенд: `curl http://localhost:3001/health`
2. **Нельзя создать ключ** → Проверьте Remnawave credentials в .env
3. **Сертификат не работает** → Запустите `sudo bash scripts/setup-ssl.sh`

---

## 💡 Production рекомендации:

- ✅ Используйте PM2 для управления процессом
- ✅ Включите Nginx для reverse proxy
- ✅ Настройте автоматический renewal SSL
- ✅ Создавайте резервные копии БД каждый день
- ✅ Мониторьте логи и производительность
- ✅ Используйте strong пароли везде

---

## 📖 Дополнительные ресурсы:

- [Remnawave документация](https://github.com/remnawave/backend)
- [Node.js лучшие практики](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Nginx конфигурация](https://nginx.org/en/docs/)
- [PostgreSQL резервные копии](https://www.postgresql.org/docs/current/backup.html)

---

**Приложение развернуто и работает! 🎉**

Вопросы? Смотрите полные гайды выше или проверьте логи.
