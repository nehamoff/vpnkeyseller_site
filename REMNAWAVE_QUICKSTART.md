# 🚀 Быстрый Старт: Интеграция Remnawave

Полная интеграция с Remnawave VPN панелью уже настроена! Вот что нужно сделать:

## 🧪 Тестовый Режим (Без Реальной Оплаты)

Чтобы создавать ключи **БЕЗ ОПЛАТЫ** для тестирования:

### Включить TEST_MODE

В файле `server/.env` установите:

```env
# Test Mode - для создания ключей без реальной оплаты (заглушка для тестирования)
# true = создавать фиктивные ключи, false = реальная интеграция с Remnawave
TEST_MODE=true
```

### Что происходит в TEST_MODE

- ✅ При нажатии "Купить" создается **фиктивный VPN ключ**
- ✅ Ключ сохраняется в БД как обычно
- ✅ UUID генерируется автоматически (не вызывается Remnawave API)
- ✅ Нет необходимости в реальной оплате
- ✅ Идеально для разработки и тестирования

### Пример создания ключа в TEST_MODE

```
1. Пользователь нажимает "Купить" на плане (например, 3 месяца)
2. Frontend → Backend API POST /api/purchases
3. Backend проверяет: TEST_MODE=true
4. Генерируется UUID: 57fbe6ad-fae3-df88-018c-ee4e90c35986
5. Ключ сохраняется в БД
6. Пользователь видит ключ в "Мои ключи"
```

## 🔄 Переключение на Реальный Режим

Когда готовы к реальной интеграции:

1. **Включить реальный режим:**
```env
TEST_MODE=false
```

2. **Убедиться что .env имеет реальные Remnawave credentials:**
```env
REMNAWAVE_BASE_URL=https://panel.coffemaniavpn.online/
REMNAWAVE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6...
REMNAWAVE_ADMIN_LOGIN=admin
REMNAWAVE_ADMIN_PASSWORD=...
```

3. **Перезагрузить сервер**
```bash
npm run dev
```

---

## 1️⃣ Получить API Ключ

Попросите у администратора Remnawave панели:
- API URL (например: `https://panel.coffemaniavpn.online/api`)
- API KEY (длинный токен для доступа)

## 2️⃣ Настроить .env

Обновите файл `server/.env`:

```env
REMNAWAVE_API_URL=https://panel.your-domain.com/api
REMNAWAVE_API_KEY=your-actual-api-key-here
```

## 3️⃣ Инициализировать БД

```bash
cd server
node create-purchases-table.mjs
```

## 4️⃣ Запустить Сервер

```bash
npm run dev
```

Должны увидеть:
```
API server running on http://localhost:3001
```

## 5️⃣ Тестировать API

### Создание тестовой покупки

```bash
# Получить токен
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123456"}' | jq -r '.token')

# Создать покупку
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_name": "Премиум",
    "price": 999,
    "days_count": 30
  }'
```

### Проверить в Remnawave

Заходите в панель Remnawave и проверяйте:
- ✅ Новый Inbound создан с именем `Key - testuser@example.com`
- ✅ Email установлен как `testuser@example.com`
- ✅ Описание содержит дату покупки

## 📚 Документация

- **[REMNAWAVE_INTEGRATION.md](./REMNAWAVE_INTEGRATION.md)** - Полная документация по API
- **[REMNAWAVE_DEVELOPER_GUIDE.md](./REMNAWAVE_DEVELOPER_GUIDE.md)** - Для разработчиков
- **[REMNAWAVE_CHECKLIST.md](./REMNAWAVE_CHECKLIST.md)** - Чек-лист тестирования

## 🔧 Что работает

### Backend
- ✅ Создание VPN ключей в Remnawave при покупке (или мок UUID в TEST_MODE)
- ✅ Сохранение информации о ключах в БД
- ✅ API для управления покупками
- ✅ Автоматическое добавление email и даты покупки в Remnawave

### Frontend
- ✅ UI компонент для покупки (`BuyVPNKey.tsx`)
- ✅ TypeScript SDK для работы с API (`purchases-api.ts`)
- ✅ React Hook для управления покупками

## 🚨 Частые Проблемы

### "Remnawave API не настроена"
- Проверьте что `REMNAWAVE_API_URL` и `REMNAWAVE_API_KEY` установлены в `.env`
- Перезагрузите сервер: `npm run dev`

### "Ошибка создания ключа: 401"
- API ключ неверный или истекший
- Проверьте REMNAWAVE_API_KEY в `.env`

### "Ошибка создания ключа: 404"
- API endpoint неверный
- Проверьте REMNAWAVE_API_URL в `.env` (должен оканчиваться на `/api`)

### Ключ не появляется в Remnawave
- Смотрите логи сервера: `npm run dev`
- Проверьте API ключ и URL
- Убедитесь что БД доступна

## 📝 Структура Кода

```
server/
├── remnawave.js           # SDK: createInboundKey, updateInboundKey, etc.
├── routes/
│   └── purchases.js       # API: POST/GET /api/purchases
├── schema.sql             # БД schema с таблицей purchases
└── .env                   # Конфиг: REMNAWAVE_API_URL, REMNAWAVE_API_KEY

src/
├── lib/
│   └── purchases-api.ts   # TypeScript SDK для клиента
└── components/
    └── BuyVPNKey.tsx      # React компонент покупки
```

## 🎯 Типичный Поток

1. **Пользователь нажимает "Купить"** в `BuyVPNKey.tsx`
2. **Frontend отправляет** `POST /api/purchases` с названием пакета
3. **Backend создает ключ** в Remnawave через `createInboundKey()`
4. **Ключ появляется** в панели Remnawave с email и датой
5. **Информация сохраняется** в таблицу `purchases` БД
6. **Пользователю отправляется** подтверждение и дата истечения

## 🔐 Безопасность

- ✅ Все запросы требуют валидный JWT токен
- ✅ Пользователь может видеть только свои покупки
- ✅ API ключ Remnawave хранится в `.env` (не в коде)
- ✅ Все ошибки логируются на сервере

## 📞 Нужна Помощь?

1. Смотрите логи: `npm run dev`
2. Проверьте REMNAWAVE_CHECKLIST.md
3. Читайте REMNAWAVE_DEVELOPER_GUIDE.md
4. Свяжитесь с администратором Remnawave

---

**Готово к использованию! 🎉**

Интеграция полностью настроена и готова к работе.
Просто добавьте реальный API ключ от Remnawave и начинайте принимать платежи.
