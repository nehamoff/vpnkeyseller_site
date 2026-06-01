
# 🍰 Кофемания VPN - Система Продажи VPN Ключей

Полнофункциональная система для продажи VPN ключей с интеграцией Remnawave панели.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Архитектура](#архитектура)
- [Тестовый режим](#тестовый-режим)
- [Функции](#функции)
- [Документация](#документация)

## 🚀 Быстрый Старт

### Установка зависимостей

```bash
npm install
cd server && npm install && cd ..
pip install -r server/requirements.txt
```

### Запуск в режиме разработки

**Терминал 1 - Frontend:**
```bash
npm run dev
```

**Терминал 2 - Backend:**
```bash
cd server
npm run dev
```

Frontend будет доступен на: **http://127.0.0.1:5173**  
Backend API на: **http://localhost:3001**

## 🧪 Тестовый Режим (TEST_MODE)

По умолчанию система работает в **тестовом режиме без оплаты**.

Для создания тестовых ключей:

1. Откройте `server/.env` и убедитесь что:
   ```env
   TEST_MODE=true
   ```

2. Авторизуйтесь (или создайте нового пользователя)

3. Перейдите в "Мои ключи"

4. Нажмите "Купить" на любом плане

✅ Система создаст **фиктивный VPN ключ** без реальной оплаты

**[Подробное руководство TEST_MODE →](./TEST_MODE_GUIDE.md)**

## 📦 Доступные Планы

| Период | Цена | Особенности |
|--------|------|-------------|
| 1 месяц | **149 ₽** | Базовый доступ |
| 3 месяца | **399 ₽** | 🌟 Популярный (экономия 11%) |
| 12 месяцев | **899 ₽** | Максимальная экономия (50%) |

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
│  src/app/components/MyKeys.tsx - Покупка ключей        │
│  src/lib/purchases-api.ts - Клиентский SDK             │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP / JSON
┌──────────────────▼──────────────────────────────────────┐
│                Backend (Node.js Express)                │
│  server/routes/purchases.js - API для покупок          │
│  server/remnawave-wrapper.js - Генератор ключей       │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
        ┌──────▼──────┐        ┌──────▼──────┐
        │   PostgreSQL│        │   Remnawave  │
        │   Database  │        │   Panel API  │
        └─────────────┘        └─────────────┘
```

## 🔐 Функции

### Аутентификация
- ✅ Регистрация по email
- ✅ Вход с паролем
- ✅ Привязка Telegram для входа
- ✅ JWT токены
- ✅ Сброс пароля

### Покупка Ключей
- ✅ Выбор тарифа (1 месяц, 3 месяца, 1 год)
- ✅ Создание ключей в Remnawave (или мок UUID в TEST_MODE)
- ✅ Сохранение в БД
- ✅ Моментальная активация
- ✅ Email передается в Remnawave

### Управление Ключами
- ✅ Просмотр активных подписок
- ✅ Статус ключа (Активен / Истёк)
- ✅ Дата истечения с форматированием
- ✅ Копирование ID ключа
- ✅ История покупок

### Интеграция Remnawave
- ✅ Создание пользователя в панели
- ✅ Генерация UUID ключа
- ✅ Сохранение email пользователя
- ✅ Поддержка Telegram ID
- ✅ Автоматический расчет даты истечения

## 📚 Документация

### Для Пользователей
- **[TEST_MODE_GUIDE.md](./TEST_MODE_GUIDE.md)** - Как использовать тестовый режим
- **[REMNAWAVE_QUICKSTART.md](./REMNAWAVE_QUICKSTART.md)** - Быстрый старт

### Для Разработчиков  
- **[REMNAWAVE_DEVELOPER_GUIDE.md](./REMNAWAVE_DEVELOPER_GUIDE.md)** - Архитектура и API
- **[REMNAWAVE_INTEGRATION.md](./server/REMNAWAVE_INTEGRATION.md)** - Детали интеграции
- **[REMNAWAVE_PYTHON_INTEGRATION.md](./server/REMNAWAVE_PYTHON_INTEGRATION.md)** - Python SDK

### Чеклисты
- **[REMNAWAVE_CHECKLIST.md](./REMNAWAVE_CHECKLIST.md)** - Тестирование
- **[INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)** - Что было сделано

## 🗂️ Структура Проекта

```
кавемания/
├── src/                          # Frontend (React + TypeScript)
│   ├── app/
│   │   ├── components/
│   │   │   ├── MyKeys.tsx         # ⭐ Страница покупки ключей
│   │   │   ├── Dashboard.tsx      # Личный кабинет
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── ...
│   │   └── routes.tsx
│   └── lib/
│       ├── api.ts                 # Клиентский API
│       └── purchases-api.ts       # SDK для покупок
│
├── server/                        # Backend (Node.js Express)
│   ├── index.js                  # Точка входа
│   ├── routes/
│   │   ├── auth.js               # Аутентификация
│   │   ├── purchases.js          # ⭐ API покупок
│   │   └── telegram.js           # Telegram интеграция
│   ├── remnawave-wrapper.js      # ⭐ Wrapper для Remnawave
│   ├── remnawave_integration.py  # Python SDK для Remnawave
│   ├── db.js                     # PostgreSQL подключение
│   ├── .env                      # Конфигурация (TEST_MODE здесь)
│   └── requirements.txt          # Python зависимости
│
├── package.json                  # Frontend зависимости
├── vite.config.ts                # Vite конфиг
├── tailwind.config.js            # Tailwind CSS
├── TEST_MODE_GUIDE.md            # ⭐ Руководство тестирования
└── REMNAWAVE_QUICKSTART.md       # Быстрый старт

```

## 🔧 Переменные Окружения

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_TELEGRAM_BOT_USERNAME=fkdmfdbot
```

### Backend (server/.env)
```env
# Database
DATABASE_URL=postgresql://...
DATABASE_SSL=true

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# SMTP
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
...

# Remnawave
REMNAWAVE_BASE_URL=https://panel.coffemaniavpn.online/
REMNAWAVE_TOKEN=eyJhbGciOi...
REMNAWAVE_ADMIN_LOGIN=admin
REMNAWAVE_ADMIN_PASSWORD=...

# 🧪 Test Mode (создание ключей без оплаты)
TEST_MODE=true
```

## 🧪 Тестирование

### 1. Создание ключа в TEST_MODE

```bash
# Фронтенд работает
npm run dev

# Backend работает
cd server && npm run dev

# Авторизуйтесь (или создайте пользователя)
# Email: testuser@example.com
# Password: Test123456

# Перейдите в "Мои ключи" → нажмите "Купить"
# ✅ Ключ создается моментально
```

### 2. Проверка в БД

```sql
SELECT * FROM purchases WHERE user_id = 2;
```

### 3. Переключение на реальный режим

```env
TEST_MODE=false
```

## 🚀 Развертывание

### Перед production:

1. **Отключить TEST_MODE**
   ```env
   TEST_MODE=false
   ```

2. **Добавить способ оплаты** (YuKasha, Stripe, и т.д.)

3. **Обновить переменные окружения**
   ```env
   FRONTEND_URL=https://coffemaniavpn.online
   JWT_SECRET=production-secret-key
   DATABASE_SSL=true
   ```

4. **Включить HTTPS** в production

5. **Запустить миграции БД**
   ```bash
   psql -f server/setup-db.sql
   ```

## 📞 Контакты

- Frontend: React 18 + TypeScript + Tailwind CSS + Shadcn UI
- Backend: Node.js + Express + PostgreSQL
- VPN Panel: Remnawave
- Python Integration: requests + python-dotenv

## 📝 Лицензия

Приватный проект Кофемания VPN

---

**Готово? Начните с [TEST_MODE_GUIDE.md](./TEST_MODE_GUIDE.md)** 🧪

  