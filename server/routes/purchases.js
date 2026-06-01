import { Router } from "express";
import { pool } from "../db.js";
import {
    createVpnUser,
    getAllUsersFromRemnawave,
    renewSubscriptionByUsername,
    mapRemnawaveKey,
} from "../remnawave-wrapper.js";
import { createPayment, getPaymentStatus, cancelPayment } from "../yookassa-wrapper.js";
import { addGbByUsername } from "../remnawave-wrapper.js";
import { getGbPackage, GB_TOPUP_PACKAGES } from "../gb-packages.js";

const router = Router();

/** Тестовая сумма оплаты (чек на 1 ₽). Позже заменить на price из тарифа. */
const PAYMENT_AMOUNT_RUB = 1.0;

const PAID_STATUSES = new Set(["succeeded", "waiting_for_capture"]);

const PURCHASE_FIELDS = `id, user_id, package_name, price, days_count, gb_amount, purchased_at, expires_at,
  remnawave_inbound_id, remnawave_username, purchase_type,
  yookassa_payment_id, payment_status, status`;

async function fulfillGbTopup(purchaseRow) {
    const {
        id,
        user_id: userId,
        remnawave_username: username,
        remnawave_inbound_id: inboundId,
        yookassa_payment_id: paymentId,
        gb_amount: gbAmount,
    } = purchaseRow;

    if (!username || !gbAmount) {
        throw new Error("Некорректные данные докупки трафика");
    }

    if (purchaseRow.status === "active" && purchaseRow.purchased_at) {
        const purchasedAt = new Date(purchaseRow.purchased_at);
        if (Date.now() - purchasedAt.getTime() < 60000) {
            return { purchase: purchaseRow, alreadyFulfilled: true };
        }
    }

    const addResult = await addGbByUsername(username, Number(gbAmount));
    if (!addResult.success) {
        throw new Error(addResult.error || "Не удалось добавить трафик в Remnawave");
    }

    const paymentStatusResult = paymentId ? await getPaymentStatus(paymentId) : null;
    const paymentStatus = paymentStatusResult?.status || purchaseRow.payment_status;

    const updateResult = await pool.query(
        `UPDATE purchases
       SET payment_status = $1,
           status = 'active',
           purchased_at = NOW(),
           remnawave_inbound_id = COALESCE(remnawave_inbound_id, $2),
           updated_at = NOW()
       WHERE id = $3
       RETURNING ${PURCHASE_FIELDS}`,
        [paymentStatus, addResult.user_uuid || inboundId, id]
    );

    return {
        purchase: updateResult.rows[0],
        inbound: {
            id: addResult.user_uuid || inboundId,
            username,
            addedGb: Number(gbAmount),
        },
        alreadyFulfilled: false,
    };
}

async function fulfillRenewal(purchaseRow) {
    const {
        id,
        user_id: userId,
        days_count: daysCount,
        remnawave_username: username,
        remnawave_inbound_id: inboundId,
        yookassa_payment_id: paymentId,
    } = purchaseRow;

    if (purchaseRow.status === "active" && purchaseRow.purchased_at) {
        const purchasedAt = new Date(purchaseRow.purchased_at);
        if (Date.now() - purchasedAt.getTime() < 60000) {
            return { purchase: purchaseRow, alreadyFulfilled: true };
        }
    }

    const renewResult = await renewSubscriptionByUsername(username, daysCount);
    if (!renewResult.success) {
        throw new Error(renewResult.error || "Не удалось продлить ключ в Remnawave");
    }

    const expiresAt = renewResult.expire_at
        ? new Date(renewResult.expire_at)
        : new Date(Date.now() + daysCount * 24 * 60 * 60 * 1000);
    const userUuid = renewResult.user_uuid || inboundId;

    const paymentStatusResult = paymentId ? await getPaymentStatus(paymentId) : null;
    const paymentStatus = paymentStatusResult?.status || purchaseRow.payment_status;

    if (userUuid) {
        await pool.query(
            `UPDATE purchases
       SET expires_at = $1, updated_at = NOW()
       WHERE user_id = $2 AND remnawave_inbound_id = $3 AND status = 'active'`,
            [expiresAt, userId, userUuid]
        );
    }

    const updateResult = await pool.query(
        `UPDATE purchases
       SET expires_at = $1,
           remnawave_inbound_id = COALESCE(remnawave_inbound_id, $2),
           payment_status = $3,
           status = 'active',
           purchased_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING ${PURCHASE_FIELDS}`,
        [expiresAt, userUuid, paymentStatus, id]
    );

    return {
        purchase: updateResult.rows[0],
        inbound: {
            id: userUuid,
            username,
            expiresAt: expiresAt.toISOString(),
        },
        alreadyFulfilled: false,
    };
}

async function fulfillPurchase(purchaseRow) {
    if (purchaseRow.purchase_type === "gb_topup" && purchaseRow.remnawave_username) {
        return fulfillGbTopup(purchaseRow);
    }

    if (purchaseRow.purchase_type === "renewal" && purchaseRow.remnawave_username) {
        return fulfillRenewal(purchaseRow);
    }

    const {
        id,
        user_id: userId,
        days_count: daysCount,
        yookassa_payment_id: paymentId,
    } = purchaseRow;

    if (purchaseRow.status === "active" && purchaseRow.remnawave_inbound_id) {
        return { purchase: purchaseRow, alreadyFulfilled: true };
    }

    const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) {
        throw new Error("Пользователь не найден");
    }
    const email = userResult.rows[0].email;

    const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM purchases WHERE user_id = $1 AND status = 'active'",
        [userId]
    );
    const keyNumber = parseInt(countResult.rows[0].count, 10) + 1;

    const purchaseDate = new Date();
    const expiresAt = new Date(purchaseDate.getTime() + daysCount * 24 * 60 * 60 * 1000);

    const vpnResult = await createVpnUser(email, keyNumber, daysCount);
    if (!vpnResult.success) {
        throw new Error(vpnResult.error || "Не удалось создать VPN ключ");
    }

    const paymentStatusResult = paymentId ? await getPaymentStatus(paymentId) : null;
    const paymentStatus = paymentStatusResult?.status || purchaseRow.payment_status;

    const updateResult = await pool.query(
        `UPDATE purchases
       SET remnawave_inbound_id = $1,
           purchased_at = $2,
           expires_at = $3,
           payment_status = $4,
           status = 'active',
           updated_at = NOW()
       WHERE id = $5
       RETURNING ${PURCHASE_FIELDS}`,
        [vpnResult.user_uuid, purchaseDate, expiresAt, paymentStatus, id]
    );

    await pool.query(
        `UPDATE users
       SET remnawave_inbound_id = $1, vpn_key_created_at = $2
       WHERE id = $3`,
        [vpnResult.user_uuid, purchaseDate, userId]
    );

    return {
        purchase: updateResult.rows[0],
        inbound: {
            id: vpnResult.user_uuid,
            username: vpnResult.username,
            keyNumber,
            expiresAt: expiresAt.toISOString(),
        },
        alreadyFulfilled: false,
    };
}

/**
 * Создаёт платёж YooKassa (1 ₽) и запись покупки в ожидании оплаты.
 * POST /api/purchases
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

        const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const email = userResult.rows[0].email;
        const orderId = `vpn-${userId}-${Date.now()}`;
        const returnUrl =
            (process.env.YOOKASSA_RETURN_URL ||
                `${(process.env.FRONTEND_URL || "http://127.0.0.1:5173").replace(/\/$/, "")}/my-keys`) +
            `?payment=return`;

        console.log(
            `[Purchase] Payment ${PAYMENT_AMOUNT_RUB}₽ for ${email}, order ${orderId} (catalog price ${price ?? "—"}₽)`
        );

        const paymentResult = await createPayment(orderId, email, PAYMENT_AMOUNT_RUB, returnUrl);

        if (!paymentResult.success) {
            console.error("Failed to create payment:", paymentResult.error);
            return res.status(500).json({
                error: "Не удалось создать платеж",
                details: paymentResult.error,
            });
        }

        const paymentId = paymentResult.payment_id;

        const purchaseResult = await pool.query(
            `INSERT INTO purchases (
         user_id, package_name, price, days_count, yookassa_payment_id, payment_status, status, purchase_type
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_payment', 'new')
       RETURNING ${PURCHASE_FIELDS}`,
            [userId, package_name, price || PAYMENT_AMOUNT_RUB, days_count, paymentId, paymentResult.status]
        );

        const purchase = purchaseResult.rows[0];

        if (!paymentResult.confirmation_url) {
            const statusResult = await getPaymentStatus(paymentId);
            if (statusResult.success && PAID_STATUSES.has(statusResult.status)) {
                const fulfilled = await fulfillPurchase(purchase);
                return res.json({
                    message: "Покупка оплачена",
                    purchase: fulfilled.purchase,
                    inbound: fulfilled.inbound,
                    payment: {
                        id: paymentId,
                        status: statusResult.status,
                        paid: statusResult.paid,
                    },
                });
            }
        }

        res.json({
            message: "Перейдите по ссылке для оплаты",
            purchase,
            payment: {
                id: paymentId,
                status: paymentResult.status,
                amount: PAYMENT_AMOUNT_RUB,
                confirmation_url: paymentResult.confirmation_url,
            },
        });
    } catch (error) {
        console.error("Purchase error:", error);
        res.status(500).json({
            error: "Ошибка создания покупки",
            details: error.message,
        });
    }
});

/**
 * Подтверждает оплату и выдаёт VPN после возврата с YooKassa.
 * POST /api/purchases/:id/confirm
 */
router.post("/:id/confirm", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const purchaseId = Number(req.params.id);
        if (!Number.isFinite(purchaseId)) {
            return res.status(400).json({ error: "Некорректный ID покупки" });
        }

        const purchaseResult = await pool.query(
            `SELECT ${PURCHASE_FIELDS} FROM purchases WHERE id = $1 AND user_id = $2`,
            [purchaseId, userId]
        );

        if (purchaseResult.rows.length === 0) {
            return res.status(404).json({ error: "Покупка не найдена" });
        }

        const purchase = purchaseResult.rows[0];

        if (
            purchase.status === "active" &&
            purchase.remnawave_inbound_id &&
            purchase.purchase_type !== "renewal"
        ) {
            return res.json({
                message: "Покупка уже активирована",
                purchase,
            });
        }

        if (!purchase.yookassa_payment_id) {
            return res.status(400).json({ error: "Платёж не привязан к покупке" });
        }

        const statusResult = await getPaymentStatus(purchase.yookassa_payment_id);
        if (!statusResult.success) {
            return res.status(502).json({
                error: "Не удалось проверить статус платежа",
                details: statusResult.error,
            });
        }

        await pool.query(
            `UPDATE purchases SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
            [statusResult.status, purchaseId]
        );

        if (!PAID_STATUSES.has(statusResult.status) && !statusResult.paid) {
            return res.status(402).json({
                error: "Платёж ещё не завершён",
                payment_status: statusResult.status,
            });
        }

        const fulfilled = await fulfillPurchase({
            ...purchase,
            payment_status: statusResult.status,
        });

        res.json({
            message: "Покупка активирована",
            purchase: fulfilled.purchase,
            inbound: fulfilled.inbound,
            payment: {
                id: purchase.yookassa_payment_id,
                status: statusResult.status,
                paid: statusResult.paid,
            },
        });
    } catch (error) {
        console.error("Confirm purchase error:", error);
        res.status(500).json({
            error: "Ошибка активации покупки",
            details: error.message,
        });
    }
});

/**
 * Отменяет незавершённый платёж и заказ.
 * POST /api/purchases/:id/cancel
 */
router.post("/:id/cancel", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const purchaseId = Number(req.params.id);
        if (!Number.isFinite(purchaseId)) {
            return res.status(400).json({ error: "Некорректный ID покупки" });
        }

        const purchaseResult = await pool.query(
            `SELECT id, user_id, yookassa_payment_id, payment_status, status
       FROM purchases WHERE id = $1 AND user_id = $2`,
            [purchaseId, userId]
        );

        if (purchaseResult.rows.length === 0) {
            return res.status(404).json({ error: "Покупка не найдена" });
        }

        const purchase = purchaseResult.rows[0];

        if (purchase.status !== "awaiting_payment") {
            return res.status(400).json({ error: "Этот заказ нельзя отменить" });
        }

        let paymentStatus = "canceled";

        if (purchase.yookassa_payment_id) {
            const cancelResult = await cancelPayment(purchase.yookassa_payment_id);
            if (cancelResult.success) {
                paymentStatus = cancelResult.status || "canceled";
            } else {
                const statusResult = await getPaymentStatus(purchase.yookassa_payment_id);
                if (statusResult.success && PAID_STATUSES.has(statusResult.status)) {
                    return res.status(400).json({
                        error: "Платёж уже проведён — отмена невозможна",
                    });
                }
            }
        }

        const updateResult = await pool.query(
            `UPDATE purchases
       SET status = 'cancelled', payment_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, package_name, price, days_count, purchased_at, expires_at,
                 remnawave_inbound_id, yookassa_payment_id, payment_status, status`,
            [paymentStatus, purchaseId]
        );

        res.json({
            message: "Платёж отменён",
            purchase: updateResult.rows[0],
        });
    } catch (error) {
        console.error("Cancel purchase error:", error);
        res.status(500).json({
            error: "Ошибка отмены платежа",
            details: error.message,
        });
    }
});

/**
 * Webhook уведомлений YooKassa (payment.succeeded).
 * POST /api/purchases/webhook/yookassa
 */
router.post("/webhook/yookassa", async (req, res) => {
    try {
        const event = req.body?.event;
        const paymentObject = req.body?.object;

        if (event !== "payment.succeeded" && event !== "payment.waiting_for_capture") {
            return res.sendStatus(200);
        }

        const paymentId = paymentObject?.id;
        if (!paymentId) {
            return res.sendStatus(400);
        }

        const purchaseResult = await pool.query(
            `SELECT ${PURCHASE_FIELDS} FROM purchases WHERE yookassa_payment_id = $1`,
            [paymentId]
        );

        if (purchaseResult.rows.length === 0) {
            console.warn(`[Webhook] No purchase for payment ${paymentId}`);
            return res.sendStatus(200);
        }

        const purchase = purchaseResult.rows[0];

        await pool.query(
            `UPDATE purchases SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
            [paymentObject.status, purchase.id]
        );

        const needsFulfill = purchase.status === "awaiting_payment";

        if (needsFulfill) {
            await fulfillPurchase({
                ...purchase,
                payment_status: paymentObject.status,
            });
            console.log(`[Webhook] Purchase ${purchase.id} fulfilled for payment ${paymentId}`);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("YooKassa webhook error:", error);
        res.sendStatus(500);
    }
});

/** Список пакетов докупки ГБ */
router.get("/gb-packages", (_req, res) => {
    res.json({ packages: Object.values(GB_TOPUP_PACKAGES) });
});

/**
 * Разовая докупка трафика на ключ.
 * POST /api/purchases/keys/add-gb
 */
router.post("/keys/add-gb", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const { username, user_uuid, package_id } = req.body;
        const pkg = getGbPackage(package_id);

        if (!username || !pkg) {
            return res.status(400).json({ error: "Укажите ключ и пакет докупки (gb10, gb30, gb50)" });
        }

        const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const email = userResult.rows[0].email;
        const remnaResult = await getAllUsersFromRemnawave(email);
        const rawKeys = remnaResult.data && Array.isArray(remnaResult.data) ? remnaResult.data : [];
        const ownsKey = rawKeys.some((k) => k.username === username);

        if (!ownsKey) {
            return res.status(403).json({ error: "Ключ не принадлежит вашему аккаунту" });
        }

        const keyUuid = user_uuid || rawKeys.find((k) => k.username === username)?.uuid;
        const orderId = `gb-${userId}-${Date.now()}`;
        const returnUrl =
            (process.env.YOOKASSA_RETURN_URL ||
                `${(process.env.FRONTEND_URL || "http://127.0.0.1:5173").replace(/\/$/, "")}/my-keys`) +
            `?payment=return`;

        const paymentResult = await createPayment(orderId, email, pkg.price, returnUrl);

        if (!paymentResult.success) {
            return res.status(500).json({
                error: "Не удалось создать платеж",
                details: paymentResult.error,
            });
        }

        const label = `Докупка · ${pkg.label}`;

        const purchaseResult = await pool.query(
            `INSERT INTO purchases (
         user_id, package_name, price, days_count, gb_amount,
         yookassa_payment_id, payment_status, status,
         purchase_type, remnawave_username, remnawave_inbound_id
       )
       VALUES ($1, $2, $3, 0, $4, $5, $6, 'awaiting_payment', 'gb_topup', $7, $8)
       RETURNING ${PURCHASE_FIELDS}`,
            [
                userId,
                label,
                pkg.price,
                pkg.gb,
                paymentResult.payment_id,
                paymentResult.status,
                username,
                keyUuid || null,
            ]
        );

        res.json({
            message: "Перейдите по ссылке для оплаты докупки трафика",
            purchase: purchaseResult.rows[0],
            payment: {
                id: paymentResult.payment_id,
                status: paymentResult.status,
                amount: pkg.price,
                confirmation_url: paymentResult.confirmation_url,
            },
            gb: pkg.gb,
        });
    } catch (error) {
        console.error("Add GB error:", error);
        res.status(500).json({
            error: "Ошибка оформления докупки",
            details: error.message,
        });
    }
});

/**
 * Продление существующего ключа (оплата + Remnawave).
 * POST /api/purchases/keys/renew
 */
router.post("/keys/renew", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const { username, user_uuid, package_name, days_count = 30, price } = req.body;

        if (!username || !package_name) {
            return res.status(400).json({ error: "Укажите username и package_name" });
        }

        const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const email = userResult.rows[0].email;
        const remnaResult = await getAllUsersFromRemnawave(email);
        const rawKeys = remnaResult.data && Array.isArray(remnaResult.data) ? remnaResult.data : [];
        const ownsKey = rawKeys.some((k) => k.username === username);

        if (!ownsKey) {
            return res.status(403).json({ error: "Ключ не принадлежит вашему аккаунту" });
        }

        const keyUuid = user_uuid || rawKeys.find((k) => k.username === username)?.uuid;
        const orderId = `renew-${userId}-${Date.now()}`;
        const returnUrl =
            (process.env.YOOKASSA_RETURN_URL ||
                `${(process.env.FRONTEND_URL || "http://127.0.0.1:5173").replace(/\/$/, "")}/my-keys`) +
            `?payment=return`;

        const paymentResult = await createPayment(
            orderId,
            email,
            PAYMENT_AMOUNT_RUB,
            returnUrl
        );

        if (!paymentResult.success) {
            return res.status(500).json({
                error: "Не удалось создать платеж",
                details: paymentResult.error,
            });
        }

        const renewalLabel = `Продление · ${package_name}`;

        const purchaseResult = await pool.query(
            `INSERT INTO purchases (
         user_id, package_name, price, days_count,
         yookassa_payment_id, payment_status, status,
         purchase_type, remnawave_username, remnawave_inbound_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_payment', 'renewal', $7, $8)
       RETURNING ${PURCHASE_FIELDS}`,
            [
                userId,
                renewalLabel,
                price || PAYMENT_AMOUNT_RUB,
                days_count,
                paymentResult.payment_id,
                paymentResult.status,
                username,
                keyUuid || null,
            ]
        );

        const purchase = purchaseResult.rows[0];

        res.json({
            message: "Перейдите по ссылке для оплаты продления",
            purchase,
            payment: {
                id: paymentResult.payment_id,
                status: paymentResult.status,
                amount: PAYMENT_AMOUNT_RUB,
                confirmation_url: paymentResult.confirmation_url,
            },
        });
    } catch (error) {
        console.error("Renew key error:", error);
        res.status(500).json({
            error: "Ошибка оформления продления",
            details: error.message,
        });
    }
});

router.get("/remnawave/keys", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const email = userResult.rows[0].email;
        const remnaResult = await getAllUsersFromRemnawave(email);

        if (!remnaResult.success) {
            return res.json({ success: true, keys: [] });
        }

        const raw = remnaResult.data && Array.isArray(remnaResult.data) ? remnaResult.data : [];
        const keys = raw.map(mapRemnawaveKey);

        res.json({ success: true, keys });
    } catch (error) {
        console.error("Fetch Remnawave keys error:", error);
        res.status(500).json({ error: "Ошибка получения ключей из Remnawave" });
    }
});

router.get("/", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const result = await pool.query(
            `SELECT ${PURCHASE_FIELDS}
       FROM purchases
       WHERE user_id = $1
         AND status != 'cancelled'
         AND (status = 'active' OR status = 'awaiting_payment' OR expires_at > NOW())
       ORDER BY purchased_at DESC`,
            [userId]
        );

        res.json({ purchases: result.rows });
    } catch (error) {
        console.error("Fetch purchases error:", error);
        res.status(500).json({ error: "Ошибка получения покупок" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Требуется авторизация" });
        }

        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, package_name, price, days_count, purchased_at, expires_at,
              remnawave_inbound_id, yookassa_payment_id, payment_status, status
       FROM purchases WHERE id = $1 AND user_id = $2`,
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
       RETURNING id, package_name, price, days_count, purchased_at, expires_at,
                 remnawave_inbound_id, yookassa_payment_id, payment_status, status`,
            [status || null, expires_at || null, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Покупка не найдена" });
        }

        res.json({
            message: "Покупка обновлена",
            purchase: result.rows[0],
        });
    } catch (error) {
        console.error("Update purchase error:", error);
        res.status(500).json({ error: "Ошибка обновления покупки" });
    }
});

export default router;
