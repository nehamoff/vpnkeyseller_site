# 🚀 QUICK START - Python Remnawave Integration

> Все готово к использованию! Следуйте этим 5 шагам.

## 📋 5-Minute Setup

### Шаг 1️⃣: Установить Python зависимости (2 мин)

**Windows PowerShell:**
```powershell
cd server
pip install -r requirements.txt
```

**Linux/Mac:**
```bash
cd server
pip install -r requirements.txt
```

### Шаг 2️⃣: Проверить конфигурацию (1 мин)

```bash
# Убедиться что .env содержит:
grep REMNAWAVE .env
```

Должно быть:
```
REMNAWAVE_BASE_URL=https://panel.coffemaniavpn.online/
REMNAWAVE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REMNAWAVE_ADMIN_LOGIN=admin
REMNAWAVE_ADMIN_PASSWORD=pbiXUH7f0Bh1VMBWTKnqMUkwdjVsblbd
```

### Шаг 3️⃣: Запустить сервер (1 мин)

```bash
npm run dev
```

Должен быть лог:
```
API server running on http://localhost:3001
```

### Шаг 4️⃣: Проверить Python (1 мин)

В новом терминале:
```bash
cd server
python remnawave_integration.py create test@example.com 123456789 30
```

Должен быть результат:
```json
{
  "success": true,
  "user_uuid": "...",
  "data": {...}
}
```

### Шаг 5️⃣: Создать тестовую покупку (1 мин)

```bash
curl -X POST http://localhost:3001/api/purchases \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_name": "30GB/Month",
    "price": 5.99,
    "days_count": 30
  }'
```

## ✅ Что должно быть видно

### В логах сервера:
```
✓ Created user for user@example.com (TG ID: 123456789)
VPN key created for user@example.com: uuid-...
Покупка успешно создана
```

### В ответе API:
```json
{
  "message": "Покупка успешно создана",
  "purchase": {
    "id": 1,
    "package_name": "30GB/Month",
    "price": 5.99,
    "expires_at": "2026-07-01T...",
    "remnawave_inbound_id": "uuid-...",
    "status": "active"
  },
  "inbound": {
    "id": "uuid-...",
    "expiresAt": "2026-07-01T..."
  }
}
```

## 🧪 Тестирование разных команд

### Создать пользователя
```bash
python remnawave_integration.py create alice@example.com 111111111 30
```

### Получить информацию о трафике
```bash
python remnawave_integration.py traffic alice@example.com
```

### Продлить подписку
```bash
python remnawave_integration.py renew alice@example.com 111111111 30
```

### Добавить ГБ
```bash
python remnawave_integration.py add-gb alice@example.com 5
```

## 📁 Важные файлы

| Файл | Назначение |
|------|-----------|
| `remnawave_integration.py` | Основной Python модуль (MAIN) |
| `remnawave-wrapper.js` | Node.js интерфейс |
| `requirements.txt` | Python зависимости |
| `.env` | Конфигурация (КЛЮЧЕВА - проверьте!) |
| `REMNAWAVE_PYTHON_INTEGRATION.md` | Полная документация |

## ⚡ Если что-то не работает

### "Python not found"
```bash
# Установить Python с https://www.python.org/
python --version  # проверить версию
```

### "ModuleNotFoundError: No module named 'requests'"
```bash
pip install -r requirements.txt
```

### "401 Unauthorized"
- Проверить что `REMNAWAVE_TOKEN` в `.env` скопирован правильно
- Нет пробелов в начале/конце
- Token должен быть полный JWT

### "Connection refused"
```bash
ping panel.coffemaniavpn.online  # проверить доступность
```

## 📊 Что происходит при создании покупки?

```
1. POST /api/purchases
   ↓
2. Node.js получает email и дни подписки
   ↓
3. Вызывает Python: remnawave_integration.py create
   ↓
4. Python создает user в Remnawave API
   ↓
5. Получает UUID пользователя
   ↓
6. Сохраняет в БД с expiry date
   ↓
7. Возвращает результат с инбаунд ID
   ↓
8. Пользователь видит ключ в "Мои ключи"
```

## 🔗 Дополнительные ресурсы

- 📖 **Полная документация:** [REMNAWAVE_PYTHON_INTEGRATION.md](./REMNAWAVE_PYTHON_INTEGRATION.md)
- 📋 **Чек-лист:** [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)
- 🗂️ **Руководство миграции:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- 🐍 **Python модуль:** [remnawave_integration.py](./remnawave_integration.py)
- ⚙️ **Node.js wrapper:** [remnawave-wrapper.js](./remnawave-wrapper.js)

## 🎯 Следующие шаги

1. ✅ Установить зависимости
2. ✅ Запустить сервер
3. ✅ Протестировать создание покупки
4. ✅ Проверить ключ в панели Remnawave
5. 🔄 Интегрировать платежный процессор (Stripe/YooKassa/etc)
6. 🔄 Настроить автоматическое продление

---

**🎉 Готово!** Система создания VPN ключей работает и готова к использованию.

Вопросы? Смотрите полную документацию в `REMNAWAVE_PYTHON_INTEGRATION.md`
