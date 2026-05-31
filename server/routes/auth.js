import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { sendVerificationCode, sendPasswordChangedNotification } from "../email.js";

const router = Router();

const CODE_TTL_MINUTES = 10;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
  }
  return null;
}

function getAuthUserId(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.sub;
  } catch {
    return null;
  }
}

router.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");
    const password = req.body.password || "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Некорректный email" });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const existing = await pool.query("SELECT id, email_verified FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      if (existing.rows[0].email_verified) {
        return res.status(409).json({ error: "Пользователь с таким email уже зарегистрирован" });
      }
      await pool.query("DELETE FROM users WHERE email = $1 AND email_verified = false", [email]);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);
    await pool.query(
      "INSERT INTO verification_codes (email, code, password_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [email, code, passwordHash, expiresAt],
    );

    await sendVerificationCode(email, code);

    res.json({
      message: "Код подтверждения отправлен на email",
      email,
      expiresInMinutes: CODE_TTL_MINUTES,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Не удалось отправить код. Проверьте настройки почты." });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");
    const code = String(req.body.code || "").trim();

    if (!email || !code) {
      return res.status(400).json({ error: "Укажите email и код" });
    }

    const result = await pool.query(
      `SELECT id, code, password_hash, expires_at
       FROM verification_codes
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Код не найден. Запросите новый." });
    }

    const record = result.rows[0];

    if (new Date(record.expires_at) < new Date()) {
      await pool.query("DELETE FROM verification_codes WHERE id = $1", [record.id]);
      return res.status(400).json({ error: "Код истёк. Запросите новый." });
    }

    if (record.code !== code) {
      return res.status(400).json({ error: "Неверный код" });
    }

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified)
       VALUES ($1, $2, true)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, email_verified = true
       RETURNING id, email, email_verified, created_at`,
      [email, record.password_hash],
    );

    await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);

    const user = userResult.rows[0];
    const token = signToken(user);

    res.json({
      message: "Регистрация успешна",
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ error: "Ошибка подтверждения регистрации" });
  }
});

router.post("/resend-code", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");

    if (!email) {
      return res.status(400).json({ error: "Укажите email" });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND email_verified = true",
      [email],
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Email уже подтверждён" });
    }

    const pending = await pool.query(
      `SELECT password_hash, created_at
       FROM verification_codes
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email],
    );

    if (pending.rows.length === 0) {
      return res.status(400).json({ error: "Сначала начните регистрацию" });
    }

    const lastSent = new Date(pending.rows[0].created_at);
    const secondsSinceLast = (Date.now() - lastSent.getTime()) / 1000;
    if (secondsSinceLast < 60) {
      return res.status(429).json({
        error: "Подождите перед повторной отправкой",
        retryAfterSeconds: Math.ceil(60 - secondsSinceLast),
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);
    await pool.query(
      "INSERT INTO verification_codes (email, code, password_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [email, code, pending.rows[0].password_hash, expiresAt],
    );

    await sendVerificationCode(email, code);

    res.json({
      message: "Новый код отправлен",
      expiresInMinutes: CODE_TTL_MINUTES,
    });
  } catch (error) {
    console.error("Resend code error:", error);
    res.status(500).json({ error: "Не удалось отправить код повторно" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ error: "Укажите email и пароль" });
    }

    const result = await pool.query(
      "SELECT id, email, password_hash, email_verified FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const user = result.rows[0];

    if (!user.email_verified) {
      return res.status(403).json({ error: "Email не подтверждён" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const token = signToken(user);

    res.json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Ошибка входа" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    const result = await pool.query(
      "SELECT id, email, email_verified, created_at FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({ error: "Недействительный токен" });
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    const currentPassword = req.body.currentPassword || "";
    const newPassword = req.body.newPassword || "";

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Укажите текущий и новый пароль" });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "Новый пароль должен отличаться от текущего" });
    }

    const result = await pool.query(
      "SELECT id, email, password_hash, email_verified FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Неверный текущий пароль" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [passwordHash, userId],
    );

    try {
      await sendPasswordChangedNotification(user.email);
    } catch (emailError) {
      console.error("Password changed but email notification failed:", emailError);
    }

    res.json({ message: "Пароль успешно изменён. Уведомление отправлено на email." });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Не удалось изменить пароль" });
  }
});

export default router;
