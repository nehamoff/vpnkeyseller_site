# Интеграция Remnawave - Полное руководство для разработчиков

## 📋 Оглавление
1. [Архитектура](#архитектура)
2. [Установка и конфигурация](#установка-и-конфигурация)
3. [Использование API](#использование-api)
4. [Обработка ошибок](#обработка-ошибок)
5. [Тестирование](#тестирование)
6. [Troubleshooting](#troubleshooting)

## Архитектура

### Серверная часть (Node.js)

```
server/
├── remnawave.js          # SDK для интеграции с Remnawave
├── routes/
│   └── purchases.js      # API endpoints для управления покупками
├── index.js              # Express app с middleware для auth
├── schema.sql            # БД schema включая таблицу purchases
└── .env                  # Переменные окружения
```

**Основные функции `remnawave.js`:**
- `createInboundKey(email, purchaseDate)` - Создает VPN ключ
- `updateInboundKey(inboundId, updates)` - Обновляет ключ
- `getInboundKey(inboundId)` - Получает информацию о ключе
- `deleteInboundKey(inboundId)` - Удаляет ключ

**API Endpoints (`routes/purchases.js`):**
- `POST /api/purchases` - Создать покупку и ключ
- `GET /api/purchases` - Получить все покупки пользователя
- `GET /api/purchases/:id` - Получить конкретную покупку
- `PUT /api/purchases/:id` - Обновить покупку (продление)

### Клиентская часть (React/TypeScript)

```
src/
├── lib/
│   └── purchases-api.ts  # TypeScript SDK для покупок
├── components/
│   └── BuyVPNKey.tsx     # Компонент покупки
└── routes.tsx            # Маршруты приложения
```

## Установка и конфигурация

### 1. Backend Setup

**Переменные окружения** (`.env`):
```env
# Обязательные параметры
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
REMNAWAVE_API_URL=https://your-panel.com/api
REMNAWAVE_API_KEY=your-api-key

# Дополнительные параметры
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Инициализация БД:**
```bash
# Создать таблицы
npm run init-db

# Или вручную:
node create-purchases-table.mjs
```

**Запуск сервера:**
```bash
npm run dev
```

### 2. Frontend Setup

**Компонент для покупки:**
```tsx
import { BuyVPNKey } from "./components/BuyVPNKey";

export function MyComponent() {
  return <BuyVPNKey />;
}
```

## Использование API

### Создание покупки

**Request:**
```bash
POST http://localhost:3001/api/purchases
Authorization: Bearer {token}
Content-Type: application/json

{
  "package_name": "Премиум",
  "price": 999,
  "days_count": 30
}
```

**Response (успех):**
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
    "remnawave_inbound_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active"
  },
  "inbound": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "expiresAt": "2026-07-01T12:00:00Z"
  }
}
```

**Response (ошибка):**
```json
{
  "error": "Не удалось создать VPN ключ",
  "details": "Remnawave API не настроена"
}
```

### Получение покупок

**Request:**
```bash
GET http://localhost:3001/api/purchases
Authorization: Bearer {token}
```

**Response:**
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
      "remnawave_inbound_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "active"
    }
  ]
}
```

### Продление подписки

**Request:**
```bash
PUT http://localhost:3001/api/purchases/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "active",
  "expires_at": "2026-08-01T12:00:00Z"
}
```

### TypeScript SDK (Клиент)

```typescript
import { purchasesAPI, usePurchases } from "./lib/purchases-api";

// Вариант 1:직접использование функций
const result = await purchasesAPI.create("Премиум", 999, 30);
console.log(result.purchase.remnawave_inbound_id);

// Вариант 2: React Hook
function MyComponent() {
  const { purchases, loading, error, createPurchase } = usePurchases();

  const handleBuy = async () => {
    try {
      const result = await createPurchase("Премиум", 999, 30);
      console.log("Покупка создана:", result.purchase);
    } catch (err) {
      console.error("Ошибка:", err);
    }
  };

  return (
    <div>
      {loading && <p>Загрузка...</p>}
      {error && <p className="text-red-600">{error}</p>}
      <button onClick={handleBuy}>Купить</button>
      {purchases.map((p) => (
        <div key={p.id}>{p.package_name}</div>
      ))}
    </div>
  );
}
```

## Обработка ошибок

### Типичные ошибки и решения

**1. "Remnawave API не настроена"**
```
Причина: Отсутствует REMNAWAVE_API_URL или REMNAWAVE_API_KEY в .env
Решение: Добавьте переменные в .env и перезагрузите сервер
```

**2. "Ошибка создания ключа: 401"**
```
Причина: Неверный или истекший API ключ
Решение: Проверьте, что REMNAWAVE_API_KEY верный в .env
```

**3. "Ошибка создания ключа: 404"**
```
Причина: API endpoint /inbounds/create не существует на панели
Решение: Проверьте версию Remnawave API и адрес в REMNAWAVE_API_URL
```

**4. "Ошибка создания ключа: 500"**
```
Причина: Внутренняя ошибка на панели Remnawave
Решение: Проверьте логи панели, свяжитесь с администратором
```

### Логирование ошибок

На сервере все ошибки логируются:
```
Creating VPN key for user@example.com. Remnawave URL: https://panel.example.com/api/inbounds/create
✓ VPN key created successfully for user@example.com. Inbound ID: key-uuid

// Или при ошибке:
Remnawave API error 401: {"error":"Unauthorized"}
Error creating inbound key: Unauthorized
```

## Тестирование

### 1. Проверка конфигурации

```bash
# Проверить что backend запущен
curl http://localhost:3001/api/health
# {"ok":true}
```

### 2. Получить токен для тестирования

```bash
# Логин
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123456"}'

# Ответ содержит token
# {"token":"eyJhbGciOiJ...","user":{...}}
```

### 3. Создать тестовую покупку

```bash
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer eyJhbGciOiJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "package_name": "Тест",
    "price": 0,
    "days_count": 7
  }'
```

### 4. Проверить Remnawave Panel

После успешного создания покупки, проверьте в панели Remnawave:
- Новый Inbound создан с именем `Key - testuser@example.com`
- Email устанавливается как `testuser@example.com`
- Описание содержит дату покупки

## Troubleshooting

### Сценарий 1: Покупка создается, но ключ не появляется в Remnawave

**Диагностика:**
1. Проверьте логи сервера на предмет ошибок
2. Убедитесь что `REMNAWAVE_API_URL` и `REMNAWAVE_API_KEY` установлены
3. Проверьте что API ключ имеет права на создание Inbound

**Решение:**
```bash
# Проверить переменные
echo $REMNAWAVE_API_URL
echo $REMNAWAVE_API_KEY

# Перезагрузить сервер
npm run dev
```

### Сценарий 2: Ошибка "Требуется авторизация"

**Причина:** Токен не отправляется или истек

**Решение:**
```typescript
// Убедитесь что токен сохранен в localStorage
const token = localStorage.getItem("vpn_token");
console.log("Token exists:", !!token);

// Если нет, авторизуйтесь заново
```

### Сценарий 3: CORS ошибки

**Ошибка:** `Access to XMLHttpRequest blocked by CORS policy`

**Решение:**
```env
# Убедитесь что FRONTEND_URL установлен правильно
FRONTEND_URL=http://localhost:5173

# И перезагрузите сервер
npm run dev
```

### Сценарий 4: Быстрая интеграция TypeScript SDK

Если используется TypeScript SDK, убедитесь что:

```typescript
// Тип Purchase соответствует БД
interface Purchase {
  id: number;
  package_name: string;
  price: string;
  days_count: number;
  purchased_at: string;
  expires_at: string;
  remnawave_inbound_id: string;
  status: string;
}

// Все endpoints возвращают правильные типы
const result: PurchaseResponse = await purchasesAPI.create(...);
```

## Дополнительно

### Автоматическое удаление истекших ключей (Cron Job)

```javascript
// server/jobs/cleanup-expired-keys.js
import { pool } from "../db.js";
import { deleteInboundKey } from "../remnawave.js";

export async function cleanupExpiredKeys() {
  const result = await pool.query(
    `SELECT id, remnawave_inbound_id FROM purchases 
     WHERE status = 'active' AND expires_at < NOW()`
  );

  for (const purchase of result.rows) {
    if (purchase.remnawave_inbound_id) {
      await deleteInboundKey(purchase.remnawave_inbound_id);
      await pool.query(
        "UPDATE purchases SET status = 'expired' WHERE id = $1",
        [purchase.id]
      );
    }
  }
}

// Запустить ежедневно
setInterval(cleanupExpiredKeys, 24 * 60 * 60 * 1000);
```

### Webhooks из Remnawave

Если Remnawave поддерживает webhooks для уведомлений об истечении ключей:

```javascript
// server/routes/webhooks.js
app.post("/api/webhooks/remnawave", (req, res) => {
  const { event, inboundId, expiresAt } = req.body;

  if (event === "key_expired") {
    // Обновить статус покупки
    await pool.query(
      "UPDATE purchases SET status = 'expired' WHERE remnawave_inbound_id = $1",
      [inboundId]
    );
  }

  res.json({ received: true });
});
```

---

**Контакты для поддержки:**
- Документация Remnawave: https://docs.remnawave.com
- Email: support@example.com
