# Миграция на Python Remnawave Integration

## Выполненные изменения

### 1. ✅ Python модуль создан
- `remnawave_integration.py` - Основной модуль для работы с API Remnawave
- Поддерживает все необходимые операции: создание пользователя, продление подписки, управление трафиком
- Полностью совместим с предоставленными данными API

### 2. ✅ Node.js wrapper обновлен
- `remnawave-wrapper.js` - Node.js интерфейс к Python модулю
- Использует `child_process` для вызова Python скрипта
- Поддерживает все операции: `createVpnUser()`, `renewSubscription()`, `getUserTraffic()`, `addGbToUser()`

### 3. ✅ Маршруты обновлены
- `routes/purchases.js` - теперь использует `createVpnUser()` из wrapper
- `routes/auth.js` - обновлена интеграция при регистрации и смене пароля
- `routes/telegram.js` - обновлена интеграция Telegram

### 4. ✅ Конфигурация обновлена
- `.env` файл содержит новые переменные:
  - `REMNAWAVE_BASE_URL=https://panel.coffemaniavpn.online/`
  - `REMNAWAVE_TOKEN=...` (новый токен)
  - `REMNAWAVE_ADMIN_LOGIN=admin`
  - `REMNAWAVE_ADMIN_PASSWORD=...`

## Как начать использовать

### 1. Установить Python зависимости

```bash
# Linux/Mac
chmod +x install-python-deps.sh
./install-python-deps.sh

# Или вручную
pip install -r requirements.txt

# Windows PowerShell
pip install -r requirements.txt
```

### 2. Запустить Node.js сервер

```bash
npm run dev  # или npm start
```

### 3. Проверить работу

При создании покупки (`POST /api/purchases`) в логах должны появиться:
```
Creating VPN user for user@example.com...
✓ Created user for user@example.com (TG ID: 123456789)
```

## Тестирование

### Напрямую с Python CLI

```bash
# Создать пользователя
python remnawave_integration.py create testuser@example.com 123456789 30

# Проверить трафик
python remnawave_integration.py traffic testuser@example.com

# Продлить подписку
python remnawave_integration.py renew testuser@example.com 123456789 30

# Добавить ГБ
python remnawave_integration.py add-gb testuser@example.com 5
```

### Через Node.js API

```bash
# POST /api/purchases
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "package_name": "30GB/Month",
    "price": 5.99,
    "days_count": 30
  }'
```

## Файлы структура

```
server/
├── remnawave_integration.py        # Основной Python модуль
├── remnawave-wrapper.js            # Node.js wrapper
├── remnawave.js                    # [DEPRECATED] Старая TypeScript интеграция
├── .env                            # Конфигурация
├── requirements.txt                # Python зависимости
├── install-python-deps.sh          # Script для установки
├── REMNAWAVE_PYTHON_INTEGRATION.md # Полная документация
└── routes/
    ├── purchases.js                # [UPDATED]
    ├── auth.js                     # [UPDATED]
    └── telegram.js                 # [UPDATED]
```

## Ключевые преимущества новой интеграции

1. **Логирование** - все операции логируются с `[DEBUG]` префиксом
2. **Обработка ошибок** - улучшенная обработка ошибок и повторные попытки
3. **Производительность** - асинхронное выполнение без блокировок
4. **Масштабируемость** - модульная архитектура позволяет легко расширять функциональность
5. **Совместимость** - полностью совместима со старой интеграцией через wrapper

## При создании покупки будет:

1. ✅ Получен email пользователя из БД
2. ✅ Создан новый пользователь в панели Remnawave
3. ✅ Установлен срок действия (по количеству дней)
4. ✅ Установлен лимит трафика (25 ГБ)
5. ✅ Сохранен UUID пользователя в БД
6. ✅ Возвращена информация о покупке и ключе

## Что делать если что-то не работает

### Python модуль не запускается
```bash
# Проверить Python
python --version
python -m pip --version

# Переустановить зависимости
pip install --upgrade pip
pip install -r requirements.txt
```

### Ошибка подключения к Remnawave панели
```bash
# Проверить доступность панели
ping panel.coffemaniavpn.online

# Проверить токен в .env файле
grep REMNAWAVE_TOKEN .env
```

### Токены и ошибки авторизации
- Убедитесь что `REMNAWAVE_TOKEN` правильно скопирован в `.env`
- Проверьте что нет пробелов в начале/конце токена
- Если токен истек, получите новый в панели

## Обратная совместимость

Старые функции из `remnawave.js` все еще доступны через `remnawave-wrapper.js`:
- `createInboundKey()` → работает через `createVpnUser()`
- `updateInboundKey()` → работает через `renewSubscription()`  
- `getUserSubscriptions()` → заглушка (stub)

## Дополнительные ресурсы

- Документация API: [REMNAWAVE_PYTHON_INTEGRATION.md](./REMNAWAVE_PYTHON_INTEGRATION.md)
- Python модуль: [remnawave_integration.py](./remnawave_integration.py)
- Node.js wrapper: [remnawave-wrapper.js](./remnawave-wrapper.js)

## Контроль версий

- **Версия Python интеграции**: 1.0.0
- **Дата внедрения**: 01.06.2026
- **Тип**: Миграция с TypeScript на Python
