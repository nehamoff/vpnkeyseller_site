import { getPaymentStatus, scheduleYookassaCancel } from "./yookassa-wrapper.js";

const PAID_STATUSES = new Set(["succeeded", "waiting_for_capture"]);

/**
 * Можно ли отменить заказ: не блокируем по устаревшему payment_status в БД.
 */
export async function assertPurchaseCanBeCancelled(purchase) {
    if (purchase.status === "cancelled") {
        return { ok: true, alreadyCancelled: true };
    }

    if (purchase.status !== "awaiting_payment") {
        return { ok: false, error: "Этот заказ нельзя отменить" };
    }

    if (!purchase.yookassa_payment_id) {
        return { ok: true };
    }

    if (!PAID_STATUSES.has(purchase.payment_status)) {
        return { ok: true };
    }

    const statusResult = await getPaymentStatus(purchase.yookassa_payment_id, {
        timeoutMs: 8000,
    });

    if (!statusResult.success) {
        console.warn(
            `[Purchase] cancel #${purchase.id}: YooKassa status unavailable, allow local cancel`
        );
        return { ok: true };
    }

    if (PAID_STATUSES.has(statusResult.status) || statusResult.paid === true) {
        return {
            ok: false,
            error: "Платёж уже оплачен. Нажмите «Уже оплатил», чтобы получить ключ.",
            code: "already_paid",
        };
    }

    return { ok: true };
}

/** Статусы ЮKassa, при которых можно снова открыть страницу оплаты */
export const REUSABLE_YOOKASSA_STATUSES = new Set(["pending"]);

/**
 * Ссылка на оплату из ответа status API.
 */
export function pickConfirmationUrl(statusResult) {
    if (!statusResult?.success) return null;
    return (
        statusResult.confirmation_url ||
        statusResult.data?.confirmation_url ||
        null
    );
}

/**
 * Отменяет в ЮKassa и в БД прочие незавершённые заказы пользователя.
 */
export async function cancelOtherPendingPurchases(pool, userId, keepPurchaseId = null) {
    const params = [userId];
    let keepClause = "";
    if (keepPurchaseId != null) {
        keepClause = " AND id <> $2";
        params.push(keepPurchaseId);
    }

    const { rows } = await pool.query(
        `SELECT id, yookassa_payment_id
     FROM purchases
     WHERE user_id = $1 AND status = 'awaiting_payment'${keepClause}`,
        params
    );

    for (const row of rows) {
        await pool.query(
            `UPDATE purchases
       SET status = 'cancelled',
           payment_status = 'canceled',
           updated_at = NOW()
       WHERE id = $1 AND status = 'awaiting_payment'`,
            [row.id]
        );
        scheduleYookassaCancel(row.yookassa_payment_id);
    }
}

/**
 * Синхронизирует статус с ЮKassa; при отмене/истечении помечает заказ cancelled.
 */
export async function syncPendingWithYookassa(pool, purchase) {
    if (!purchase.yookassa_payment_id) {
        return { reusable: false, reason: "no_payment_id" };
    }

    const statusResult = await getPaymentStatus(purchase.yookassa_payment_id);
    if (!statusResult.success) {
        return { reusable: false, reason: "status_error", error: statusResult.error };
    }

    const ykStatus = statusResult.status;
    await pool.query(
        `UPDATE purchases SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
        [ykStatus, purchase.id]
    );

    if (ykStatus === "canceled" || ykStatus === "expired") {
        await pool.query(
            `UPDATE purchases SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [purchase.id]
        );
        return { reusable: false, reason: ykStatus };
    }

    if (!REUSABLE_YOOKASSA_STATUSES.has(ykStatus)) {
        return { reusable: false, reason: ykStatus, statusResult };
    }

    let confirmationUrl = purchase.confirmation_url || pickConfirmationUrl(statusResult);
    if (confirmationUrl && confirmationUrl !== purchase.confirmation_url) {
        await pool.query(
            `UPDATE purchases SET confirmation_url = $1, updated_at = NOW() WHERE id = $2`,
            [confirmationUrl, purchase.id]
        );
    }

    if (!confirmationUrl) {
        return { reusable: false, reason: "no_confirmation_url", statusResult };
    }

    return {
        reusable: true,
        confirmationUrl,
        status: ykStatus,
        statusResult,
    };
}

/**
 * Ищет недавний awaiting_payment и возвращает существующую ссылку вместо нового платежа.
 */
export async function tryReusePendingPurchase(pool, userId, match) {
    const { rows } = await pool.query(
        `SELECT id, user_id, package_name, price, days_count, gb_amount, purchased_at, expires_at,
            remnawave_inbound_id, remnawave_username, purchase_type,
            yookassa_payment_id, payment_status, status, confirmation_url
     FROM purchases
     WHERE user_id = $1
       AND status = 'awaiting_payment'
       AND created_at > NOW() - INTERVAL '24 hours'
     ORDER BY id DESC
     LIMIT 10`,
        [userId]
    );

    for (const purchase of rows) {
        if (match && !match(purchase)) continue;

        const sync = await syncPendingWithYookassa(pool, purchase);
        if (!sync.reusable) continue;

        return {
            purchase: { ...purchase, confirmation_url: sync.confirmationUrl, payment_status: sync.status },
            payment: {
                id: purchase.yookassa_payment_id,
                status: sync.status,
                amount: Number(purchase.price),
                confirmation_url: sync.confirmationUrl,
            },
            reused: true,
        };
    }

    return null;
}
