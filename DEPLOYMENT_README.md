# 🚀 CaféMania VPN - Развертывание на Production

## 📚 Доступные гайды:

| Гайд | Время | Сложность | Описание |
|------|-------|-----------|---------|
| [⚡ QUICK_DEPLOY.md](./QUICK_DEPLOY.md) | 5 мин | ⭐ Легко | Быстрое развертывание за 3 команды |
| [📋 DEPLOYMENT_DEBIAN.md](./DEPLOYMENT_DEBIAN.md) | 30 мин | ⭐⭐ Средне | Полное пошаговое руководство на Debian |
| [🐳 DEPLOYMENT_DOCKER.md](./DEPLOYMENT_DOCKER.md) | 15 мин | ⭐ Легко | Docker & Docker Compose развертывание |
| [📄 DEPLOYMENT_SCRIPTS.md](./DEPLOYMENT_SCRIPTS.md) | - | ⭐ Легко | Утилиты и команды управления |

---

## 🎯 Выберите вариант:

### Я в спешке, хочу быстро:
→ **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** (5 минут)

### Я хочу понять как это работает:
→ **[DEPLOYMENT_DEBIAN.md](./DEPLOYMENT_DEBIAN.md)** (полное руководство)

### Я предпочитаю Docker:
→ **[DEPLOYMENT_DOCKER.md](./DEPLOYMENT_DOCKER.md)** (Docker Compose)

### Я нужны утилиты и команды:
→ **[DEPLOYMENT_SCRIPTS.md](./DEPLOYMENT_SCRIPTS.md)** (скрипты)

---

## 📦 Что входит в приложение:

```
Frontend:
├── React + TypeScript + Vite
├── UI компоненты (shadcn/ui)
├── Tailwind CSS
└── Responsive дизайн

Backend:
├── Node.js + Express
├── PostgreSQL база данных
├── JWT аутентификация
├── REST API
└── Python интеграция

Features:
├── Регистрация и вход
├── Покупка VPN ключей
├── Интеграция с Remnawave
├── Telegram бот
├── Email уведомления
└── Админ панель
```

---

## ⚙️ Системные требования:

| Компонент | Версия | Минимум |
|-----------|--------|---------|
| Debian | 11 или 12 | 1 |
| Node.js | 20 LTS | ✅ |
| PostgreSQL | 15 | ✅ |
| Python | 3.9+ | ✅ |
| Nginx | Latest | ✅ |
| RAM | - | 2GB |
| Disk | - | 20GB |

---

## 🔐 Безопасность:

- ✅ SSL/TLS (Let's Encrypt)
- ✅ JWT аутентификация
- ✅ CORS защита
- ✅ SQL инъекции защита (prepared statements)
- ✅ XSS защита
- ✅ Rate limiting (опционально)
- ✅ Secure password hashing (bcrypt)

---

## 📊 Архитектура:

```
┌─────────────────────────────────────────┐
│          Браузер пользователя            │
└──────────────────┬──────────────────────┘
                   │ HTTPS
        ┌──────────▼──────────┐
        │   Nginx Reverse     │
        │      Proxy          │
        └──┬───────────────┬──┘
           │               │
        ┌──▼────┐    ┌────▼──┐
        │Frontend│    │Backend │
        │  (SPA) │    │(Node)  │
        └────────┘    └───┬────┘
                          │
                    ┌─────▼──────┐
                    │ PostgreSQL  │
                    │  Database   │
                    └─────┬───────┘
                          │
                    ┌─────▼──────────┐
                    │  Python Module │
                    │   (Remnawave)  │
                    └────────────────┘
```

---

## 🔄 Процесс покупки VPN ключа:

```
1. Пользователь нажимает "Купить" на плане
                 ↓
2. Frontend POST /api/purchases
                 ↓
3. Backend создает запись в БД
                 ↓
4. Python скрипт создает ключ в Remnawave
                 ↓
5. UUID ключа сохраняется в БД
                 ↓
6. Пользователь видит ключ в "Мои ключи"
                 ↓
7. Пользователь импортирует в VPN приложение
```

---

## 📝 Главные файлы:

```
.env.deploy.example          - Пример конфигурации
deploy.sh                    - Главный скрипт развертывания
ecosystem.config.js          - PM2 конфигурация
docker-compose.yml           - Docker конфигурация

server/
  ├── index.js               - Express приложение
  ├── remnawave_integration.py - Python интеграция
  ├── routes/purchases.js    - API покупок
  ├── schema.sql             - БД схема
  └── Dockerfile             - Docker образ

src/
  ├── lib/purchases-api.ts   - Frontend API SDK
  ├── components/MyKeys.tsx  - Страница покупок
  └── app/routes.tsx         - Маршруты
```

---

## ✅ Checklist перед production:

- [ ] Получены Remnawave credentials
- [ ] Доменное имя указывает на сервер
- [ ] Сервер Debian 11+ подготовлен
- [ ] SSH ключ добавлен
- [ ] .env файл отредактирован с реальными значениями
- [ ] БД инициализирована
- [ ] SSL сертификат установлен
- [ ] Приложение запущено и работает
- [ ] API endpoints тестированы
- [ ] Резервные копии настроены
- [ ] Мониторинг логов настроен

---

## 🆘 Help & Support:

### Если приложение не запускается:
```bash
# 1. Проверьте логи
pm2 logs cafemaniavpn-api

# 2. Проверьте .env
cat server/.env

# 3. Перезагрузите
pm2 restart cafemaniavpn-api
```

### Если БД не подключается:
```bash
# Проверьте подключение
psql -U deploy -d cafemaniavpn -h localhost

# Проверьте что таблицы созданы
psql -U deploy -d cafemaniavpn -c "\dt"
```

### Если Remnawave не работает:
```bash
# Проверьте credentials в .env
# Проверьте что Python зависимости установлены
pip3 list | grep -E "requests|python"

# Запустите тест
cd server && python3 remnawave_integration.py --test
```

---

## 📞 Контакты для помощи:

- GitHub Issues: [Посмотрите известные проблемы]
- Discord: [Присоединитесь к сообществу]
- Email: support@coffeemaniavpn.ru

---

## 📖 Дополнительные ресурсы:

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Documentation](https://docs.docker.com/)

---

**Готовы начать? → [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** 🚀
