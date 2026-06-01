# Интеграция с Remnawave VPN Panel

## Описание

Приложение интегрировано с Remnawave панелью для автоматического создания VPN ключей при регистрации пользователей и при покупке подписок.

## Настройка

### 1. Получите API ключ от Remnawave

Обратитесь к администратору вашей Remnawave панели и запросите API ключ.

### 2. Переменные окружения

Добавьте в `.env` файл:

```env
# Адрес API вашей ремнавейв панели
REMNAWAVE_API_URL=https://your-remnawave-panel.com/api

# API ключ для доступа к панели
REMNAWAVE_API_KEY=your-api-key-here
```

### 3. Обновите БД

Новые таблицы содержат поля для сохранения информации о VPN ключах:
- `remnawave_inbound_id` — ID инбаунда (ключа) в ремнавейв
- `vpn_key_created_at` — дата создания ключа

Таблица `purchases` содержит:
- `user_id` — ID пользователя
- `package_name` — название пакета (например, "Базовый", "Премиум")
- `price` — цена в рублях
- `days_count` — количество дней подписки
- `purchased_at` — дата покупки
- `expires_at` — дата окончания подписки
- `remnawave_inbound_id` — ID ключа в ремнавейв
- `status` — статус подписки (active, expired, cancelled)

## Использование

### Создание VPN ключа при регистрации

При регистрации пользователя автоматически создается VPN ключ в Remnawave панели:

```javascript
import { createInboundKey } from "./remnawave.js";

const result = await createInboundKey(email, purchaseDate);
// {
//   success: true,
//   inboundId: "uuid-of-created-key",
//   data: {...response from Remnawave API...}
// }
```

### Создание покупки (подписки)

```bash
POST /api/purchases
Authorization: Bearer {token}
Content-Type: application/json

{
  "package_name": "Премиум",
  "price": 999,
  "days_count": 30
}
```

Ответ:
```json
{
  "message": "Покупка успешно создана",
  "purchase": {
    "id": 1,
    "user_id": 2,
    "package_name": "Премиум",
    "price": "999.00",
    "days_count": 30,
    "purchased_at": "2026-06-01T12:00:00Z",
    "expires_at": "2026-07-01T12:00:00Z",
    "remnawave_inbound_id": "key-uuid-here",
    "status": "active"
  },
  "inbound": {
    "id": "key-uuid-here",
    "expiresAt": "2026-07-01T12:00:00Z"
  }
}
```

При создании покупки:
1. ✅ Создается новый VPN ключ в Remnawave панели
2. ✅ Ключ связывается с email пользователя
3. ✅ В БД сохраняется информация о покупке и ключе
4. ✅ Устанавливается дата окончания подписки

### Получение покупок пользователя

```bash
GET /api/purchases
Authorization: Bearer {token}
```

Ответ:
```json
{
  "purchases": [
    {
      "id": 1,
      "package_name": "Премиум",
      "price": "999.00",
      "days_count": 30,
      "purchased_at": "2026-06-01T12:00:00Z",
      "expires_at": "2026-07-01T12:00:00Z",
      "remnawave_inbound_id": "key-uuid-here",
      "status": "active"
    }
  ]
}
```

### Получение конкретной покупки

```bash
GET /api/purchases/{id}
Authorization: Bearer {token}
```

### Обновление статуса покупки (продление подписки)

```bash
PUT /api/purchases/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "active",
  "expires_at": "2026-08-01T12:00:00Z"
}
```

## Функции Remnawave SDK

### createInboundKey(email, purchaseDate)

Создает новый VPN ключ в Remnawave панели.

```javascript
const result = await createInboundKey("user@example.com", new Date());
// {
//   success: true,
//   inboundId: "generated-uuid",
//   data: {id: "generated-uuid", name: "Key - user@example.com", ...}
// }
```

**Параметры:**
- `email` (string) - Email пользователя (используется как название ключа и метаданные)
- `purchaseDate` (Date, optional) - Дата покупки. По умолчанию - текущая дата

**Возвращает:**
- `{success: true, inboundId, data}` - При успехе
- `{success: false, error}` - При ошибке

### updateInboundKey(inboundId, updates)

Обновляет информацию о ключе (например, дату истечения).

```javascript
const result = await updateInboundKey("key-uuid", {
  desc: "Updated: 2026-07-01",
  metadata: { expiresAt: "2026-07-01" }
});
```

### getInboundKey(inboundId)

Получает информацию о ключе из Remnawave.

```javascript
const result = await getInboundKey("key-uuid");
// {success: true, data: {...key info...}}
```

### deleteInboundKey(inboundId)

Удаляет ключ из Remnawave.

```javascript
const result = await deleteInboundKey("key-uuid");
// {success: true}
```

## Типичный поток покупки

1. **Пользователь кликает "Купить"** → Отправляется POST запрос на `/api/purchases`
2. **Backend создает ключ в Remnawave** → Получает `inboundId`
3. **Backend сохраняет покупку в БД** → Связывает пользователя, пакет и ключ
4. **Пользователю отправляется конфигурация** → С данными подключения из Remnawave
5. **При истечении подписки** → Можно удалить ключ из Remnawave или обновить статус

## Обработка ошибок

Все функции возвращают объект с полями `success` и `error`:

```javascript
const result = await createInboundKey("invalid-email");
if (!result.success) {
  console.error("Failed to create key:", result.error);
}
```

**Типичные ошибки:**
- `"Remnawave API не настроена"` - Отсутствуют `REMNAWAVE_API_URL` или `REMNAWAVE_API_KEY`
- `"Ошибка создания ключа: 401"` - Неверный API ключ
- `"Ошибка создания ключа: 404"` - API endpoint не найден на панели
- `"Ошибка создания ключа: 500"` - Внутренняя ошибка панели

## Логирование

Все события создания/обновления/удаления ключей логируются в консоль:

```
Creating VPN key for user@example.com. Remnawave URL: https://panel.example.com/api/inbounds/create
✓ VPN key created successfully for user@example.com. Inbound ID: key-uuid
```

## Тестирование

Создать тестовую покупку:

```bash
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer {your-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "package_name": "Тест",
    "price": 0,
    "days_count": 7
  }'
```


Они добавляются автоматически при запуске БД.

## Как это работает

### Процесс регистрации

1. Пользователь вводит email и пароль → `/api/auth/register`
2. Отправляется код подтверждения на email
3. Пользователь вводит код → `/api/auth/verify`
4. **Автоматически:**
   - Создается пользователь в базе
   - Создается VPN ключ в ремнавейв панели
   - ID ключа сохраняется в БД

### Обработка ошибок

Если ремнавейв панель недоступна:
- Регистрация все равно пройдет успешно
- VPN ключ не будет создан
- Ошибка будет залогирована в консоль
- Позже можно создать ключ вручную в панели

## Поля инбаунда

При создании ключа устанавливаются следующие поля:

```javascript
{
  name: `Key - ${email}`,        // Название ключа
  email: email,                   // Email владельца
  protocol: "vless",             // Протокол (VLESS)
  settings: {
    clients: [{
      id: UUID,                  // Уникальный ID клиента
      email: email,              // Email в данных клиента
      alterId: 0
    }],
    decryption: "none",
    fallbacks: []
  }
}
```

## API Endpoints

### Создание ключа (внутренний метод)

```javascript
import { createInboundKey } from './remnawave.js';

const result = await createInboundKey(email);
// Возвращает:
// {
//   success: true,
//   inboundId: "uuid-or-id",
//   data: { ... }  // Ответ от API
// }
// или
// {
//   success: false,
//   error: "Error message"
// }
```

### Получение подписок пользователя

```javascript
import { getUserSubscriptions } from './remnawave.js';

const result = await getUserSubscriptions(telegramId);
// Возвращает:
// {
//   configured: true/false,
//   subscriptions: [ ... ]
// }
```

## Примеры использования

### Проверка статуса ключа пользователя

```javascript
// Получить информацию о ключе при входе
const user = await db.query(
  'SELECT remnawave_inbound_id, vpn_key_created_at FROM users WHERE id = $1',
  [userId]
);

console.log(user.rows[0].remnawave_inbound_id); // ID ключа
console.log(user.rows[0].vpn_key_created_at);   // Дата создания
```

### Создание резервной ключа (если первый не был создан)

```javascript
import { createInboundKey } from './remnawave.js';

const email = 'user@example.com';
const result = await createInboundKey(email);

if (result.success) {
  // Сохраните ID ключа в БД
  await db.query(
    'UPDATE users SET remnawave_inbound_id = $1 WHERE email = $2',
    [result.inboundId, email]
  );
}
```

## Troubleshooting

### "Remnawave API не настроена"

- Проверьте что переменные окружения установлены:
  ```bash
  echo $REMNAWAVE_API_URL
  echo $REMNAWAVE_API_KEY
  ```
- Убедитесь что URL не имеет trailing slash в конце

### "Ошибка создания ключа: 401"

- API ключ неверный или истёк
- Проверьте доступность API эндпоинта:
  ```bash
  curl -H "Authorization: Bearer YOUR_KEY" https://your-api/inbounds/create
  ```

### "Ошибка создания ключа: 403"

- Ваш IP адрес заблокирован в панели
- Проверьте разрешенные IP адреса в Remnawave панели

### Ключ создан но не появился в панели

- Проверьте логи приложения для ошибок
- Убедитесь что Remnawave панель работает
- Проверьте что инбаунд не создался с другим именем

## Дальнейшее развитие

- [ ] Добавить endpoint для отправки списка ключей пользователю по email
- [ ] Добавить функцию удаления ключа
- [ ] Добавить функцию сброса пароля для ключа
- [ ] Интегрировать оплату (сейчас используется заглушка)
- [ ] Добавить анализ трафика из Remnawave панели
