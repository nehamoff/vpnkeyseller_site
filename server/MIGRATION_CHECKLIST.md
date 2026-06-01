# ✅ Чек-лист Миграции Remnawave на Python

## Что было сделано

### 1. Python интеграция
- ✅ Создан `remnawave_integration.py` с полной поддержкой API Remnawave
- ✅ Методы: создание пользователя, продление подписки, управление трафиком
- ✅ Обработка ошибок и логирование
- ✅ CLI интерфейс для тестирования

### 2. Node.js wrapper
- ✅ Создан `remnawave-wrapper.js` для вызова Python из Node.js
- ✅ Экспортированы функции: `createVpnUser()`, `renewSubscription()`, `getUserTraffic()`, `addGbToUser()`
- ✅ Обратная совместимость: `createInboundKey()`, `updateInboundKey()`, `getUserSubscriptions()`

### 3. Express маршруты обновлены
- ✅ `routes/purchases.js` - использует `createVpnUser()`
- ✅ `routes/auth.js` - обновлена при регистрации (2 места) и смене пароля
- ✅ `routes/telegram.js` - обновлена для использования wrapper

### 4. Конфигурация
- ✅ `.env` файл обновлен с новыми переменными:
  ```
  REMNAWAVE_BASE_URL=https://panel.coffemaniavpn.online/
  REMNAWAVE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  REMNAWAVE_ADMIN_LOGIN=admin
  REMNAWAVE_ADMIN_PASSWORD=pbiXUH7f0Bh1VMBWTKnqMUkwdjVsblbd
  ```

### 5. Документация создана
- ✅ `REMNAWAVE_PYTHON_INTEGRATION.md` - полная документация
- ✅ `MIGRATION_GUIDE.md` - руководство по миграции
- ✅ `requirements.txt` - Python зависимости

### 6. Скрипты установки
- ✅ `install-python-deps.sh` - для Linux/Mac
- ✅ `install-python-deps.bat` - для Windows

## Как начать использовать

### Шаг 1: Установить Python зависимости

**Windows (PowerShell):**
```powershell
pip install -r requirements.txt
```

**Или запустить скрипт:**
```powershell
.\install-python-deps.bat
```

**Linux/Mac:**
```bash
chmod +x install-python-deps.sh
./install-python-deps.sh
```

### Шаг 2: Проверить .env файл

```bash
# Убедиться что есть переменные:
grep REMNAWAVE .env
```

Должны быть:
```
REMNAWAVE_BASE_URL=https://panel.coffemaniavpn.online/
REMNAWAVE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REMNAWAVE_ADMIN_LOGIN=admin
REMNAWAVE_ADMIN_PASSWORD=pbiXUH7f0Bh1VMBWTKnqMUkwdjVsblbd
```

### Шаг 3: Запустить сервер

```bash
npm run dev
```

### Шаг 4: Протестировать

#### Вариант 1: Через API (создание покупки)

```bash
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_name": "30GB/Month",
    "price": 5.99,
    "days_count": 30
  }'
```

В ответе должны увидеть:
```json
{
  "message": "Покупка успешно создана",
  "purchase": {...},
  "inbound": {
    "id": "uuid-здесь",
    "expiresAt": "2026-07-01T..."
  }
}
```

#### Вариант 2: Через Python CLI

```bash
python remnawave_integration.py create testuser@example.com 123456789 30
```

Должен вернуть:
```json
{
  "success": true,
  "user_uuid": "uuid-здесь",
  "data": {...}
}
```

## Проверить что работает

### В логах сервера должны быть:

```
✓ Created user for user@example.com (TG ID: 123456789)
VPN key created for user@example.com: uuid-...
Покупка успешно создана
```

### Структура БД

При успешном создании в таблице `purchases` появится запись с:
- `remnawave_inbound_id` = UUID пользователя в панели
- `status` = 'active'
- `expires_at` = дата + дни_подписки

## Поле для раздела "Мои ключи"

При выборе раздела "Мои ключи" должны выводиться активные покупки:

```bash
GET /api/purchases
```

Вернет список:
```json
{
  "purchases": [
    {
      "id": 1,
      "package_name": "30GB/Month",
      "price": 5.99,
      "days_count": 30,
      "purchased_at": "2026-06-01T...",
      "expires_at": "2026-07-01T...",
      "remnawave_inbound_id": "uuid-...",
      "status": "active"
    }
  ]
}
```

## Старая интеграция

- ⚠️ `remnawave.js` больше не используется
- ✅ Функциональность доступна через `remnawave-wrapper.js`
- 📝 Можно оставить файл для исторических целей

## Если что-то не работает

### 1. Python не найден
```bash
python --version
```
Если ошибка - установить Python с https://www.python.org/

### 2. Зависимости не установлены
```bash
pip install -r requirements.txt
```

### 3. Ошибка подключения к панели
```bash
# Проверить доступность
ping panel.coffemaniavpn.online

# Проверить токен
grep REMNAWAVE_TOKEN .env
```

### 4. Ошибка авторизации (401)
- Проверить что `REMNAWAVE_TOKEN` скопирован правильно
- Нет пробелов в начале/конце
- Токен должен быть полный JWT

## Файлы которые были изменены

- ✅ `server/.env` - новые переменные Remnawave
- ✅ `server/remnawave-wrapper.js` - новый файл
- ✅ `server/remnawave_integration.py` - новый файл (MAIN)
- ✅ `server/routes/purchases.js` - обновлен
- ✅ `server/routes/auth.js` - обновлен (2 места)
- ✅ `server/routes/telegram.js` - обновлен
- ✅ `server/requirements.txt` - новый файл
- ✅ `server/install-python-deps.sh` - новый файл
- ✅ `server/install-python-deps.bat` - новый файл
- ✅ `server/REMNAWAVE_PYTHON_INTEGRATION.md` - документация
- ✅ `server/MIGRATION_GUIDE.md` - руководство

## Что дальше?

1. Установить Python зависимости
2. Запустить сервер
3. Протестировать создание покупки
4. Проверить что ключ появляется в "Мои ключи"
5. Убедиться что все работает в панели Remnawave

## Ссылки

- 📖 Полная документация: [REMNAWAVE_PYTHON_INTEGRATION.md](./REMNAWAVE_PYTHON_INTEGRATION.md)
- 📋 Руководство миграции: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- 🐍 Python модуль: [remnawave_integration.py](./remnawave_integration.py)
- ⚙️ Node.js wrapper: [remnawave-wrapper.js](./remnawave-wrapper.js)

---

✅ **Готово к использованию!**

Спасибо что выбрали Python для интеграции! 🎉
