# Remnawave Python Integration

Это новая Python-интеграция для управления VPN-ключами в панели Remnawave. Она заменяет старую TypeScript-интеграцию.

## Установка

### Требования
- Python 3.8+
- pip

### Зависимости Python

```bash
pip install requests python-dotenv
```

## Конфигурация

Убедитесь, что в файле `.env` установлены следующие переменные:

```env
# Remnawave Panel Configuration
REMNAWAVE_BASE_URL=https://panel.coffemaniavpn.online/
REMNAWAVE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REMNAWAVE_ADMIN_LOGIN=admin
REMNAWAVE_ADMIN_PASSWORD=pbiXUH7f0Bh1VMBWTKnqMUkwdjVsblbd
```

## Использование

### Через Node.js (рекомендуется)

Интеграция автоматически используется при создании покупок:

```javascript
import { createVpnUser } from "./remnawave-wrapper.js";

// Создать нового пользователя VPN
const result = await createVpnUser("user@example.com", 123456789, 30);

if (result.success) {
  console.log("VPN user created:", result.user_uuid);
} else {
  console.error("Error:", result.error);
}
```

### Непосредственно через Python CLI

#### Создать нового пользователя

```bash
python remnawave_integration.py create email@example.com 123456789 30
```

Параметры:
- `email`: Email пользователя
- `tg_id`: Telegram ID
- `days`: Количество дней подписки (по умолчанию 30)

#### Продлить подписку

```bash
python remnawave_integration.py renew email@example.com 123456789 30
```

#### Получить информацию о трафике

```bash
python remnawave_integration.py traffic email@example.com
```

Вернет:
```json
{
  "success": true,
  "traffic_limit": 26843545600,
  "used_traffic": 1073741824,
  "leftover": 25769803776
}
```

#### Добавить ГБ к пользователю

```bash
python remnawave_integration.py add-gb email@example.com 10
```

## API Методы

### RemnawaveAPI класс

#### `create_new_user(email, tg_id, days=30)`
Создает нового пользователя в панели.

**Параметры:**
- `email` (str): Email пользователя
- `tg_id` (int): Telegram ID
- `days` (int): Дни подписки

**Возвращает:**
```json
{
  "success": true,
  "user_uuid": "uuid-string",
  "data": {}
}
```

#### `renew_subscription(email, tg_id, days=30)`
Продлевает подписку существующего пользователя.

**Параметры:**
- `email` (str): Email пользователя
- `tg_id` (int): Telegram ID
- `days` (int): Дни продления

**Возвращает:**
```json
{
  "success": true,
  "data": {}
}
```

#### `get_leftover_bytes(email)`
Получает информацию о трафике пользователя.

**Параметры:**
- `email` (str): Email пользователя

**Возвращает:**
```json
{
  "success": true,
  "traffic_limit": 26843545600,
  "used_traffic": 1073741824,
  "leftover": 25769803776
}
```

#### `give_gb(email, gb_amount)`
Добавляет трафик к пользователю.

**Параметры:**
- `email` (str): Email пользователя
- `gb_amount` (float): Количество ГБ

**Возвращает:**
```json
{
  "success": true,
  "data": {}
}
```

## Интеграция с Express.js

Интеграция полностью интегрирована в Express-маршруты через `remnawave-wrapper.js`:

1. **При покупке ключа** (`POST /api/purchases`):
   - Автоматически создается пользователь в панели
   - Сохраняется UUID в базу данных
   - Задается срок действия подписки

2. **При регистрации** (`POST /api/auth/register`):
   - Создается VPN-ключ для нового пользователя
   - Используется email для идентификации

3. **При смене пароля** (`PUT /api/auth/change-password`):
   - Создается новый VPN-ключ

## Обработка ошибок

Все методы возвращают объект со статусом:

```json
{
  "success": false,
  "error": "Описание ошибки"
}
```

При ошибке сеть не блокирует операцию в базе данных, но логирует ошибку.

## Отладка

Включите debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Ограничения

- Base traffic limit: 26843545600 bytes (25 GB)
- Default HWID device limit: 3
- Traffic strategy: MONTH_ROLLING (трафик обновляется каждый месяц)

## Миграция от старой интеграции

Старая TypeScript-интеграция (`remnawave.js`) больше не используется.
Все функции перемещены в Python-модуль и могут быть вызваны через `remnawave-wrapper.js`.

### Функции соответствия:

| Старая функция | Новая функция |
|---|---|
| `createInboundKey()` | `createVpnUser()` |
| `updateInboundKey()` | `renewSubscription()` |
| `getUserSubscriptions()` | `getUserSubscriptions()` (stub) |

## Поддержка

Для проблем с интеграцией:

1. Проверьте `.env` переменные
2. Проверьте соединение с панелью: `ping panel.coffemaniavpn.online`
3. Проверьте логи Python: включите DEBUG уровень
4. Убедитесь что Python и зависимости установлены: `pip install requests python-dotenv`
