import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { initDb, pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import telegramRoutes from "./routes/telegram.js";
import purchasesRoutes from "./routes/purchases.js";
import { startSubscriptionReminderScheduler } from "./subscription-reminders.js";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "https://blog-raffle-sacrament.ngrok-free.dev"
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));
app.use(express.json());

// Middleware для извлечения пользователя из токена
app.use((req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.sub, email: payload.email };
    } catch (err) {
      // Токен невалидный, но запрос может не требовать авторизации
    }
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/auth", telegramRoutes);
app.use("/api/purchases", purchasesRoutes);

async function start() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }

  await initDb();
  await pool.query("SELECT 1");

  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
    startSubscriptionReminderScheduler();
  });
}

start().catch((error) => {
  console.error("\n❌ Не удалось запустить сервер:\n");

  if (error.code === "28000" || error.message?.includes("pg_hba.conf")) {
    console.error("PostgreSQL не разрешает подключение с вашего IP.");
    console.error("");
    console.error("Варианты решения:");
    console.error("  1. Запустите backend на том же сервере, где PostgreSQL (62.60.157.108)");
    console.error("     DATABASE_URL=postgresql://main:...@localhost:5432/vpnsite");
    console.error("  2. Или добавьте ваш IP в pg_hba.conf на сервере и перезагрузите PostgreSQL");
    console.error("");
  } else if (error.message === "DB_PERMISSION_DENIED") {
    console.error("У пользователя БД нет прав на создание таблиц в schema public.");
    console.error("");
    console.error("На сервере выполните ОДИН РАЗ (от postgres):");
    console.error("  sudo -u postgres psql -d vpnsite -f setup-db.sql");
    console.error("");
    console.error("Или вручную в psql:");
    console.error("  GRANT USAGE, CREATE ON SCHEMA public TO main;");
    console.error("  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO main;");
    console.error("  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO main;");
    console.error("");
  } else if (error.message?.includes("must be owner of")) {
    console.error("Текущая роль базы данных не является владельцем таблицы 'users'.");
    console.error("");
    console.error("Варианты решения:");
    console.error("  1. Запустите setup-db.sql от суперпользователя, чтобы создать таблицы и выдать права:");
    console.error("     sudo -u postgres psql -d vpnsite -f setup-db.sql");
    console.error("  2. Или изменить владельца таблицы на роль, используемую приложением (выполнить от postgres):");
    console.error("     sudo -u postgres psql -d vpnsite -c \"ALTER TABLE users OWNER TO main;\"");
    console.error("  3. Или вручную выдать необходимые права для роли, используемой приложением:");
    console.error("     GRANT ALL PRIVILEGES ON TABLE users TO main;");
    console.error("");
  } else {
    console.error(error.message || error);
  }

  process.exit(1);
});
