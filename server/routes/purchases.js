import { Router } from "express";
import { pool } from "../db.js";
import { createVpnUser, getUserFromRemnawave } from "../remnawave-wrapper.js";

const router = Router();

/**
 * Создает покупку и VPN ключ в ремнавейв
 * POST /api/purchases
 * Body: { package_name, price, days_count }
 */
router.post("/", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const { package_name, price, days_count = 30 } = req.body;

        if (!package_name) {
            return res.status(400).json({ error: "Укажите package_name" });
        }

        // Получаем email пользователя
        const userResult = await pool.query(
            "SELECT email FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const email = userResult.rows[0].email;

        // Get the next key number for this user (count existing purchases + 1)
        const countResult = await pool.query(
            "SELECT COUNT(*) as count FROM purchases WHERE user_id = $1 AND status = 'active'",
            [userId]
        );
        const keyNumber = parseInt(countResult.rows[0].count) + 1;

        const purchaseDate = new Date();
        const expiresAt = new Date(purchaseDate.getTime() + days_count * 24 * 60 * 60 * 1000);

        console.log(`[Purchase] Creating VPN key for user ${email}, key#${keyNumber}, days: ${days_count}`);

        // Create VPN user in Remnawave panel with key number
        const vpnResult = await createVpnUser(email, keyNumber, days_count);

        if (!vpnResult.success) {
            console.error("Failed to create VPN user:", vpnResult.error);
            return res.status(500).json({
                error: "Не удалось создать VPN ключ",
                details: vpnResult.error
            });
        }

        console.log(`[Purchase] VPN key created: ${vpnResult.user_uuid}, username: ${vpnResult.username}`);

        // Save purchase to database
        const purchaseResult = await pool.query(
            `INSERT INTO purchases (user_id, package_name, price, days_count, purchased_at, expires_at, remnawave_inbound_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, package_name, price, days_count, purchased_at, expires_at, remnawave_inbound_id, status`,
            [userId, package_name, price || null, days_count, purchaseDate, expiresAt, vpnResult.user_uuid, "active"]
        );

        const purchase = purchaseResult.rows[0];

        // Update user's latest inbound ID
        await pool.query(
            `UPDATE users 
       SET remnawave_inbound_id = $1, vpn_key_created_at = $2
       WHERE id = $3`,
            [vpnResult.user_uuid, purchaseDate, userId]
        );

        console.log(`[Purchase] Purchase saved to database with ID ${purchase.id}`);

        res.json({
            message: "Покупка успешно создана",
            purchase,
            inbound: {
                id: vpnResult.user_uuid,
                username: vpnResult.username,
                keyNumber: keyNumber,
                expiresAt: expiresAt.toISOString()
            }
        });
    } catch (error) {
        console.error("Purchase error:", error);
        res.status(500).json({
            error: "Ошибка создания покупки",
            details: error.message
        });
    }
});

/**
 * Получает ключи пользователя из Remnawave панели по email
 * GET /api/purchases/remnawave/keys
 */
router.get("/remnawave/keys", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        // Получаем email пользователя
        const userResult = await pool.query(
            "SELECT email FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const email = userResult.rows[0].email;

        // Get user data from Remnawave
        const remnaResult = await getUserFromRemnawave(email);

        if (!remnaResult.success) {
            return res.status(404).json({
                error: "Ключи не найдены в Remnawave",
                details: remnaResult.error
            });
        }

        // Return all user keys from Remnawave
        res.json({
            success: true,
            keys: remnaResult.data || []
        });
    } catch (error) {
        console.error("Fetch Remnawave keys error:", error);
        res.status(500).json({ error: "Ошибка получения ключей из Remnawave" });
    }
});

/**
 * Получает активные покупки пользователя
 * GET /api/purchases
 */
router.get("/", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const result = await pool.query(
            `SELECT id, package_name, price, days_count, purchased_at, expires_at, remnawave_inbound_id, status
       FROM purchases
       WHERE user_id = $1 AND (status = 'active' OR expires_at > NOW())
       ORDER BY purchased_at DESC`,
            [userId]
        );

        res.json({
            purchases: result.rows
        });
    } catch (error) {
        console.error("Fetch purchases error:", error);
        res.status(500).json({ error: "Ошибка получения покупок" });
    }
});

/**
 * Получает покупку по ID
 * GET /api/purchases/:id
 */
router.get("/:id", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, package_name, price, days_count, purchased_at, expires_at, remnawave_inbound_id, status
       FROM purchases
       WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Покупка не найдена" });
        }

        res.json({ purchase: result.rows[0] });
    } catch (error) {
        console.error("Fetch purchase error:", error);
        res.status(500).json({ error: "Ошибка получения покупки" });
    }
});

/**
 * Обновляет статус покупки (например, продлевает подписку)
 * PUT /api/purchases/:id
 */
router.put("/:id", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const { id } = req.params;
        const { status, expires_at } = req.body;

        const result = await pool.query(
            `UPDATE purchases
       SET status = COALESCE($1, status),
           expires_at = COALESCE($2, expires_at),
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, package_name, price, days_count, purchased_at, expires_at, remnawave_inbound_id, status`,
            [status || null, expires_at || null, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Покупка не найдена" });
        }

        res.json({
            message: "Покупка обновлена",
            purchase: result.rows[0]
        });
    } catch (error) {
        console.error("Update purchase error:", error);
        res.status(500).json({ error: "Ошибка обновления покупки" });
    }
});

export default router;
