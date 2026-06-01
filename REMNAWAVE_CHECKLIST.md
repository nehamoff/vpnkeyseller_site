# Checklist: Интеграция Remnawave

## ✅ Фаза 1: Подготовка

- [ ] Получен API URL и API KEY от администратора Remnawave
- [ ] Проверено что URL доступен: `curl https://your-panel.com/api/health`
- [ ] Протестирован API KEY через Postman/curl

## ✅ Фаза 2: Backend Setup

- [ ] Обновлены переменные окружения в `.env`:
  ```env
  REMNAWAVE_API_URL=https://your-panel.com/api
  REMNAWAVE_API_KEY=your-key-here
  ```

- [ ] Созданы таблицы в БД:
  ```bash
  node server/create-purchases-table.mjs
  ```

- [ ] Добавлены недостающие колонки в таблице `users`:
  ```bash
  node server/add-columns.mjs
  ```

- [ ] Проверено что сервер запускается без ошибок:
  ```bash
  npm run dev
  # API server running on http://localhost:3001
  ```

## ✅ Фаза 3: Функциональность Backend

- [ ] Проверены функции в `server/remnawave.js`:
  - [ ] `createInboundKey(email)` - создание ключа
  - [ ] `updateInboundKey(inboundId, updates)` - обновление
  - [ ] `getInboundKey(inboundId)` - получение информации
  - [ ] `deleteInboundKey(inboundId)` - удаление

- [ ] Проверены API endpoints в `server/routes/purchases.js`:
  - [ ] `POST /api/purchases` - создание покупки
  - [ ] `GET /api/purchases` - список покупок
  - [ ] `GET /api/purchases/:id` - конкретная покупка
  - [ ] `PUT /api/purchases/:id` - обновление покупки

- [ ] Протестированы endpoints через curl/Postman

## ✅ Фаза 4: Middleware и Auth

- [ ] Добавлен middleware для извлечения `req.user` из токена в `server/index.js`
- [ ] Проверено что все protected endpoints требуют авторизацию
- [ ] Тестирован запрос с неверным/пустым токеном - должен вернуть 401

## ✅ Фаза 5: Frontend SDK

- [ ] Создан файл `src/lib/purchases-api.ts`:
  - [ ] Экспортирует `purchasesAPI` с методами
  - [ ] Включает `usePurchases()` React Hook
  - [ ] Правильно обрабатывает ошибки

- [ ] Проверены типы TypeScript

## ✅ Фаза 6: UI Компонент

- [ ] Создан компонент `src/components/BuyVPNKey.tsx`:
  - [ ] Отображает список пакетов
  - [ ] Кнопка "Купить" работает
  - [ ] Показывает состояние loading
  - [ ] Показывает ошибки и успех

- [ ] Компонент интегрирован в приложение

## ✅ Фаза 7: Тестирование E2E

### Тест 1: Создание покупки

```bash
# 1. Получить токен
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}' \
  | jq -r '.token')

# 2. Создать покупку
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_name": "Тест",
    "price": 0,
    "days_count": 7
  }'

# 3. Проверить что в ответе есть inboundId
# 4. Проверить в Remnawave панели - должен быть новый ключ
```

### Тест 2: Получение покупок

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/purchases \
  | jq '.purchases'
```

### Тест 3: UI Тест

- [ ] Открыть браузер: http://localhost:5173
- [ ] Авторизоваться
- [ ] Найти компонент покупки
- [ ] Выбрать пакет
- [ ] Нажать "Купить"
- [ ] Проверить что появилось сообщение об успехе
- [ ] Проверить что в Remnawave появился новый ключ

## ✅ Фаза 8: Обработка Ошибок

- [ ] Протестирована ошибка "API не настроена" (удалить REMNAWAVE_API_KEY)
- [ ] Протестирована ошибка 401 (неверный ключ)
- [ ] Протестирована ошибка 404 (неверный URL)
- [ ] Протестирована ошибка сети (отключить интернет)
- [ ] Все ошибки корректно отображаются в UI

## ✅ Фаза 9: Логирование и Мониторинг

- [ ] Логи на сервере показывают успешное создание ключей:
  ```
  ✓ VPN key created successfully for user@example.com. Inbound ID: uuid
  ```

- [ ] Ошибки также логируются:
  ```
  /me error: error: column does not exist
  Remnawave API error 401: {...}
  ```

- [ ] Можно отключить debug логирование если нужно

## ✅ Фаза 10: Продакшн Подготовка

- [ ] В `.env` установлены реальные значения:
  - [ ] `REMNAWAVE_API_URL` - правильный адрес панели
  - [ ] `REMNAWAVE_API_KEY` - реальный API ключ
  - [ ] `DATABASE_URL` - правильная БД
  - [ ] `JWT_SECRET` - длинный случайный ключ

- [ ] Протестирована работа на staging сервере

- [ ] Документация обновлена для других разработчиков

## 📋 Дополнительные Задачи

### Опционально: Автоматическое очищение

- [ ] Добавлен cron job для удаления истекших ключей
- [ ] Реализованы webhooks из Remnawave (если поддерживается)

### Опционально: Аналитика

- [ ] Логируются все покупки в аналитику
- [ ] Отслеживается конверсия покупок
- [ ] Мониторится успех создания ключей в Remnawave

### Опционально: Улучшения UX

- [ ] Добавлено отображение активных подписок
- [ ] Добавлено продление подписки
- [ ] Добавлена история покупок
- [ ] Добавлены рекомендации по пакетам

## 🔍 Быстрая Диагностика

Если что-то не работает, проверьте по порядку:

1. **Сервер запущен?**
   ```bash
   curl http://localhost:3001/api/health
   # {"ok":true}
   ```

2. **БД доступна?**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   # 1
   ```

3. **Переменные окружения установлены?**
   ```bash
   echo $REMNAWAVE_API_URL
   echo $REMNAWAVE_API_KEY
   ```

4. **Ключ верный?**
   ```bash
   curl https://your-panel.com/api/inbounds \
     -H "Authorization: Bearer $REMNAWAVE_API_KEY"
   # Если 401, ключ неверный
   ```

5. **Таблицы созданы?**
   ```bash
   psql $DATABASE_URL -c "\dt purchases"
   # Должна быть таблица purchases
   ```

6. **Логирование**
   ```bash
   npm run dev 2>&1 | grep -i error
   # Смотрим ошибки в логах
   ```

## ✅ Финальная Проверка

- [ ] Все тесты пройдены
- [ ] Нет ошибок в консоли браузера
- [ ] Нет ошибок на сервере
- [ ] Документация актуальна
- [ ] Код в git с комментариями
- [ ] Готово к продакшену! 🚀
