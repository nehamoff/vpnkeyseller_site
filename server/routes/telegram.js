import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import {
  verifyTelegramAuth,
  isTelegramPlaceholderEmail,
} from "../telegram.js";
import { getUserSubscriptions } from "../remnawave-wrapper.js";

const router = Router();

function getAuthUserId(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET).sub;
  } catch {
    return null;
  }
}

function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    email_verified: row.email_verified,
    telegram_id: row.telegram_id ? String(row.telegram_id) : null,
    telegram_username: row.telegram_username,
    telegram_first_name: row.telegram_first_name,
    created_at: row.created_at,
  };
}

async function linkTelegramToUser(userId, data) {
  const tgId = Number(data.id);
  const username = data.username || null;
  const firstName = data.first_name || null;

  const taken = await pool.query(
    "SELECT id, email FROM users WHERE telegram_id = $1 AND id != $2",
    [tgId, userId],
  );

  if (taken.rows.length > 0) {
    const other = taken.rows[0];
    if (isTelegramPlaceholderEmail(other.email)) {
      await pool.query("DELETE FROM users WHERE id = $1", [other.id]);
    } else {
      throw new Error("TELEGRAM_ALREADY_LINKED");
    }
  }

  const updated = await pool.query(
    `UPDATE users
     SET telegram_id = $1, telegram_username = $2, telegram_first_name = $3
     WHERE id = $4
     RETURNING id, email, email_verified, telegram_id, telegram_username, telegram_first_name, created_at`,
    [tgId, username, firstName, userId],
  );

  return formatUser(updated.rows[0]);
}

function verifyWidgetData(body) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { ok: false, error: "Telegram bot не настроен" };
  }

  if (!verifyTelegramAuth(body, botToken)) {
    return { ok: false, error: "Недействительная подпись Telegram" };
  }

  return { ok: true };
}

router.post("/telegram/link", async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    const check = verifyWidgetData(req.body);
    if (!check.ok) {
      return res.status(check.error === "Telegram bot не настроен" ? 503 : 403).json({ error: check.error });
    }

    try {
      const user = await linkTelegramToUser(userId, req.body);
      res.json({ message: "Telegram успешно привязан", user });
    } catch (error) {
      if (error.message === "TELEGRAM_ALREADY_LINKED") {
        return res.status(409).json({ error: "Этот Telegram уже привязан к другому аккаунту" });
      }
      throw error;
    }
  } catch (error) {
    console.error("Telegram link error:", error);
    res.status(500).json({ error: "Не удалось привязать Telegram" });
  }
});

router.get("/subscriptions", async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    const result = await pool.query(
      "SELECT telegram_id FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    const { telegram_id: telegramId } = result.rows[0];

    if (!telegramId) {
      return res.json({
        linked: false,
        configured: Boolean(process.env.REMNAWAVE_API_URL && process.env.REMNAWAVE_API_KEY),
        subscriptions: [],
      });
    }

    const { configured, subscriptions } = await getUserSubscriptions(telegramId);

    res.json({
      linked: true,
      configured,
      subscriptions,
    });
  } catch (error) {
    console.error("Subscriptions error:", error);
    res.status(500).json({ error: "Не удалось загрузить подписки" });
  }
});

export default router;
