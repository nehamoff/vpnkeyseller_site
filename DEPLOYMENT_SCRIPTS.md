# CaféMania VPN - Скрипты Автоматизации Развертывания

Быстрые команды для развертывания на Debian

## 🚀 Быстрое развертывание (одной командой)

Если вы уже выполнили шаги подготовки (создали пользователя deploy, клонировали репозиторий), выполните:

```bash
cd /var/www/cafemaniavpn

# Запустите главный скрипт развертывания
bash deploy.sh
```

---

## 📄 Отдельные скрипты

### 1. Установка зависимостей

```bash
bash scripts/install-dependencies.sh
```

### 2. Конфигурация окружения

```bash
bash scripts/setup-env.sh
```

### 3. Инициализация БД

```bash
bash scripts/init-database.sh
```

### 4. Сборка и запуск

```bash
bash scripts/build-and-start.sh
```

---

## 🔄 Развертывание обновлений

```bash
bash scripts/update.sh
```

---

## 📊 Мониторинг

```bash
# Проверьте статус приложения
bash scripts/check-status.sh

# Смотрите логи в реальном времени
bash scripts/watch-logs.sh

# Перезагрузите приложение
bash scripts/restart-app.sh
```

---

## ⚙️ Конфигурация переменных

Все скрипты читают из файла `.env.deploy`:

```bash
# Скопируйте и отредактируйте
cp .env.deploy.example .env.deploy
nano .env.deploy
```

---

## 🐳 Docker вариант (альтернатива)

Если предпочитаете Docker:

```bash
# Построить образ
docker-compose build

# Запустить контейнеры
docker-compose up -d

# Проверить логи
docker-compose logs -f
```

Смотрите [docker-compose.yml](./docker-compose.yml) для конфигурации.

---

## 🔧 Ручная команда после обновления

```bash
# На сервере
cd /var/www/cafemaniavpn

# Обновите код
git pull origin main

# Переустановите зависимости (если обновились)
pnpm install
cd server && pnpm install && cd ..

# Переустановите Python зависимости
pip3 install -r server/requirements.txt

# Пересоберите фронтенд
pnpm run build

# Перезагрузите приложение
pm2 restart cafemaniavpn-api

# Проверьте статус
pm2 status
```
