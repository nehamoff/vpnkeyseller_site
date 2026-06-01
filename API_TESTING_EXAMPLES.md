# 🧪 Примеры Тестирования API

Здесь собраны готовые примеры для тестирования системы покупки ключей.

## Быстрая Проверка (Browser)

### 1. Откройте в браузере
```
http://127.0.0.1:5173
```

### 2. Авторизуйтесь
- Email: `testuser@example.com`
- Password: `Test123456`

### 3. Перейдите в "Мои ключи"

### 4. Нажмите "Купить" на любом плане

✅ Система создаст ключ в TEST_MODE

---

## Примеры API (Curl)

### 1. Получить токен авторизации

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"Test123456"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "testuser@example.com"
  }
}
```

### 2. Создать покупку (1 месяц)

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1 месяц",
    "price": 149,
    "daysCount": 30
  }'
```

**Ответ:**
```json
{
  "success": true,
  "purchase": {
    "id": 5,
    "user_id": 1,
    "name": "1 месяц",
    "price": "149.00",
    "key_id": "57fbe6ad-fae3-df88-018c-ee4e90c35986",
    "created_at": "2025-07-01T10:30:00.000Z",
    "expires_at": "2025-08-01T10:30:00.000Z"
  }
}
```

### 3. Создать покупку (3 месяца - Популярный)

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "3 месяца",
    "price": 399,
    "daysCount": 90
  }'
```

### 4. Создать покупку (1 год)

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "12 месяцев",
    "price": 899,
    "daysCount": 365
  }'
```

### 5. Получить список покупок пользователя

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN"
```

**Ответ:**
```json
{
  "success": true,
  "purchases": [
    {
      "id": 5,
      "user_id": 1,
      "name": "1 месяц",
      "price": "149.00",
      "key_id": "57fbe6ad-fae3-df88-018c-ee4e90c35986",
      "created_at": "2025-07-01T10:30:00.000Z",
      "expires_at": "2025-08-01T10:30:00.000Z"
    },
    {
      "id": 6,
      "user_id": 1,
      "name": "3 месяца",
      "price": "399.00",
      "key_id": "36ef810c-0baa-a607-e2b7-898682ea9f5d",
      "created_at": "2025-07-01T11:15:00.000Z",
      "expires_at": "2025-09-30T11:15:00.000Z"
    }
  ]
}
```

### 6. Получить профиль пользователя

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Ответ:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "testuser@example.com",
    "telegram_id": null,
    "created_at": "2025-06-15T08:00:00.000Z"
  }
}
```

---

## Примеры JavaScript/Node.js

### Создание ключа (используя purchases-api)

```javascript
import { purchasesAPI } from './lib/purchases-api.ts';

// Создать ключ на 3 месяца
const response = await purchasesAPI.create(
  "3 месяца",
  399,
  90
);

console.log('Ключ создан:', response);
// Output: { success: true, purchase: { id: 6, ... } }
```

### Получить все ключи

```javascript
const purchases = await purchasesAPI.list();

purchases.forEach(p => {
  console.log(`${p.name}: ${p.key_id} (${p.price} ₽)`);
});

// Output:
// 1 месяц: 57fbe6ad-fae3-df88-018c-ee4e90c35986 (149.00 ₽)
// 3 месяца: 36ef810c-0baa-a607-e2b7-898682ea9f5d (399.00 ₽)
```

---

## Проверка в БД

### PostgreSQL

```bash
psql -U main -h 62.60.157.108 -d vpnsite
```

### Просмотр всех покупок

```sql
SELECT 
  p.id,
  u.email,
  p.name,
  p.price,
  p.key_id,
  p.created_at,
  p.expires_at,
  CASE 
    WHEN p.expires_at > NOW() THEN 'Активен'
    ELSE 'Истёк'
  END as status
FROM purchases p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

**Результат:**
```
 id | email                   | name       | price  | key_id                               | created_at              | expires_at              | status
----+-------------------------+------------+--------+--------------------------------------+-------------------------+-------------------------+--------
  6 | testuser@example.com    | 3 месяца   | 399.00 | 36ef810c-0baa-a607-e2b7-898682ea9f5d | 2025-07-01 11:15:00     | 2025-09-30 11:15:00     | Активен
  5 | testuser@example.com    | 1 месяц    | 149.00 | 57fbe6ad-fae3-df88-018c-ee4e90c35986 | 2025-07-01 10:30:00     | 2025-08-01 10:30:00     | Активен
```

### Просмотр пользователя и его ключей

```sql
SELECT * FROM users WHERE email = 'testuser@example.com';
SELECT * FROM purchases WHERE user_id = 1;
```

---

## Тестирование Сценариев

### Сценарий 1: Новый пользователь → Покупка → Проверка ключа

```bash
# 1. Создать нового пользователя (Register на сайте)
# Email: newuser@test.com
# Password: Test123456

# 2. Авторизоваться
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","password":"Test123456"}' | jq -r '.token')

# 3. Купить ключ на 1 месяц
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1 месяц",
    "price": 149,
    "daysCount": 30
  }' | jq .

# 4. Получить все ключи
curl -X GET http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5. Проверить в БД
psql -U main -h 62.60.157.108 -d vpnsite \
  -c "SELECT * FROM purchases WHERE user_id = (SELECT id FROM users WHERE email = 'newuser@test.com');"
```

### Сценарий 2: Несколько покупок от одного пользователя

```bash
# Авторизуйтесь
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123456"}' | jq -r '.token')

# Купите 1 месяц
curl -s -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"1 месяц","price":149,"daysCount":30}' | jq .purchase.id

# Купите 3 месяца
curl -s -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"3 месяца","price":399,"daysCount":90}' | jq .purchase.id

# Купите 1 год
curl -s -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"12 месяцев","price":899,"daysCount":365}' | jq .purchase.id

# Проверить все ключи
curl -s -X GET http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" | jq '.purchases | length'
# Output: 3
```

### Сценарий 3: Проверка TEST_MODE

```bash
# Откройте server/.env и убедитесь:
# TEST_MODE=true

# В логах backend вы должны видеть:
# [VPN] Creating key for testuser@example.com, key#1, days: 30
# [VPN] 🧪 TEST MODE - Creating mock VPN key

# UUID будет автоматически сгенерирован и вернется в ответе
```

---

## Отладка

### Проверить что backend работает

```bash
curl http://localhost:3001/
# Output: Cannot GET /
# (это нормально - эндпоинт не существует, но сервер работает)
```

### Проверить CORS

```bash
# Если видите ошибку CORS, проверьте:
# server/index.js должен иметь динамический CORS обработчик

curl -X OPTIONS http://localhost:3001/api/purchases \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: POST"
```

### Проверить JWT токен

```bash
# Если видите ошибку 401 Unauthorized, проверьте:
# 1. Токен в header: Authorization: Bearer <token>
# 2. Токен не истёк (проверьте JWT_EXPIRES_IN в .env)

# Декодировать токен (зайдите на jwt.io и вставьте токен)
```

### Проверить .env

```bash
cd server
cat .env | grep -E "TEST_MODE|DATABASE_URL|JWT_SECRET"

# Должно быть:
# TEST_MODE=true
# DATABASE_URL=postgresql://...
# JWT_SECRET=...
```

---

## Готовые Команды для Копирования

### Быстрая проверка всего

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd server && npm run dev

# Terminal 3: Получить токен
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123456"}' | jq -r '.token')

echo "Token: $TOKEN"

# Создать ключ
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"1 месяц","price":149,"daysCount":30}' | jq .

# Получить все ключи
curl -X GET http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" | jq '.purchases'
```

---

**Готово тестировать! 🚀**
