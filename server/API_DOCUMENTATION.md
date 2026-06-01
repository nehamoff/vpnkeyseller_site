# API Documentation - VPN Key Management

## Authentication

Все endpoints (кроме `/register`, `/verify`, `/login`, `/resend-code`) требуют JWT токена в заголовке:

```
Authorization: Bearer {JWT_TOKEN}
```

## Endpoints

### 1. Регистрация пользователя

**POST** `/api/auth/register`

```javascript
// Request
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

// Response (200)
{
  "message": "Код подтверждения отправлен на email",
  "email": "user@example.com",
  "expiresInMinutes": 10
}
```

### 2. Подтверждение регистрации (создание ключа)

**POST** `/api/auth/verify`

⚠️ **Во время этого запроса автоматически создается VPN ключ в ремнавейв панели**

```javascript
// Request
{
  "email": "user@example.com",
  "code": "123456"
}

// Response (200)
{
  "message": "Регистрация успешна",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### 3. Вход

**POST** `/api/auth/login`

```javascript
// Request
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

// Response (200)
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### 4. Получение информации о пользователе (включая VPN ключ)

**GET** `/api/auth/me`

Требует: `Authorization: Bearer {JWT_TOKEN}`

```javascript
// Response (200)
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "email_verified": true,
    "telegram_id": null,
    "telegram_username": null,
    "telegram_first_name": null,
    "remnawave_inbound_id": "xyz-uuid-123",
    "vpn_key_created_at": "2024-05-31T12:34:56.789Z",
    "created_at": "2024-05-31T12:30:00.000Z",
    "vpn_key": {
      "inboundId": "xyz-uuid-123",
      "createdAt": "2024-05-31T12:34:56.789Z"
    }
  }
}
```

### 5. Создание резервного VPN ключа

**POST** `/api/auth/vpn-key/create`

Требует: `Authorization: Bearer {JWT_TOKEN}`

Используется если нужно создать новый ключ (первый был удален или повреждена сессия).

```javascript
// Response (200)
{
  "message": "VPN ключ успешно создан",
  "vpn_key": {
    "inboundId": "new-uuid-456",
    "createdAt": "2024-05-31T13:00:00.000Z",
    "email": "user@example.com"
  }
}

// Response (503) - Ремнавейв недоступна
{
  "error": "Не удалось создать VPN ключ",
  "details": "Remnawave API не настроена"
}
```

### 6. Изменение пароля

**POST** `/api/auth/change-password`

Требует: `Authorization: Bearer {JWT_TOKEN}`

```javascript
// Request
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}

// Response (200)
{
  "message": "Пароль успешно изменён. Уведомление отправлено на email."
}
```

### 7. Запрос смены email

**POST** `/api/auth/change-email/request`

Требует: `Authorization: Bearer {JWT_TOKEN}`

```javascript
// Request
{
  "newEmail": "newemail@example.com",
  "password": "CurrentPassword123"
}

// Response (200)
{
  "message": "Код отправлен на новый email",
  "newEmail": "newemail@example.com",
  "expiresInMinutes": 10
}
```

### 8. Подтверждение смены email

**POST** `/api/auth/change-email/verify`

Требует: `Authorization: Bearer {JWT_TOKEN}`

```javascript
// Request
{
  "code": "654321"
}

// Response (200)
{
  "message": "Email успешно изменён",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "newemail@example.com"
  }
}
```

## Ошибки

### 400 - Bad Request
```javascript
{
  "error": "Некорректный email"
}
```

### 401 - Unauthorized
```javascript
{
  "error": "Требуется авторизация"
}
// или
{
  "error": "Недействительный токен"
}
```

### 409 - Conflict
```javascript
{
  "error": "Пользователь с таким email уже зарегистрирован"
}
```

### 429 - Too Many Requests
```javascript
{
  "error": "Подождите перед повторной отправкой",
  "retryAfterSeconds": 45
}
```

### 503 - Service Unavailable
```javascript
{
  "error": "Не удалось создать VPN ключ",
  "details": "Ошибка соединения с ремнавейв панелью"
}
```

## Примеры на фронтенде (React)

### Регистрация с созданием ключа

```typescript
async function registerAndCreateKey(email: string, password: string) {
  // Шаг 1: Отправить запрос на регистрацию
  const registerRes = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  // Шаг 2: Пользователь получит код на email, ввести его
  const code = prompt('Введите код из письма:');

  // Шаг 3: Подтвердить регистрацию (ключ создастся автоматически!)
  const verifyRes = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });

  const { token, user } = await verifyRes.json();
  
  // Сохранить токен
  localStorage.setItem('authToken', token);
  
  return { token, user };
}
```

### Получение информации о VPN ключе

```typescript
async function getUserVpnKey() {
  const token = localStorage.getItem('authToken');
  
  const res = await fetch('/api/auth/me', {
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });

  const { user } = await res.json();
  
  if (user.vpn_key) {
    console.log('VPN ключ:', user.vpn_key.inboundId);
    console.log('Создан:', new Date(user.vpn_key.createdAt).toLocaleString());
  } else {
    console.log('VPN ключ не создан');
  }

  return user.vpn_key;
}
```

### Создание резервного ключа

```typescript
async function createBackupVpnKey() {
  const token = localStorage.getItem('authToken');
  
  const res = await fetch('/api/auth/vpn-key/create', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (res.ok) {
    const { vpn_key } = await res.json();
    console.log('Новый ключ:', vpn_key.inboundId);
    return vpn_key;
  } else {
    const { error, details } = await res.json();
    console.error('Ошибка:', error, details);
  }
}
```

## Notes

- VPN ключ создается **автоматически** при подтверждении регистрации
- Email пользователя используется в качестве описания/идентификатора ключа в ремнавейв
- Если ремнавейв панель недоступна, регистрация все равно пройдет, но ключ не будет создан
- JWT токен действует 7 дней (по умолчанию)
- Коды подтверждения действуют 10 минут
