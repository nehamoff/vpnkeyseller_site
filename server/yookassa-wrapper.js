/**
 * YooKassa Payment Integration Wrapper
 * Calls Python integration module to manage payments
 */

import path from "path";
import { fileURLToPath } from "url";
import { executePythonScript } from "./python-exec.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YOOKASSA_SCRIPT = path.join(__dirname, "yookassa_integration.py");
const YOOKASSA_TIMEOUT_MS = Number(process.env.YOOKASSA_PYTHON_TIMEOUT_MS || 18000);
const YOOKASSA_CANCEL_TIMEOUT_MS = Number(process.env.YOOKASSA_CANCEL_TIMEOUT_MS || 10000);

function executePython(args, options = {}) {
    return executePythonScript(YOOKASSA_SCRIPT, args, {
        timeoutMs: options.timeoutMs ?? YOOKASSA_TIMEOUT_MS,
        logPrefix: options.logPrefix ?? "[YooKassa]",
    });
}

/**
 * Create a payment in YooKassa
 * @param {string} orderId - Unique order identifier
 * @param {string} email - Customer email
 * @param {number} amount - Payment amount in rubles (default 1.0)
 * @returns {Promise<{success: boolean, payment_id?: string, confirmation_url?: string, error?: string}>}
 */
export async function createPayment(orderId, email, amount = 1.0, returnUrl = null) {
    try {
        console.log(`[Payment] Creating YooKassa payment: ${amount}₽ for order ${orderId}`);

        const args = ["create", orderId, email, String(amount)];
        if (returnUrl) {
            args.push(returnUrl);
        }

        const result = await executePython(args);

        return {
            success: true,
            payment_id: result.payment_id,
            confirmation_url: result.confirmation_url,
            status: result.status,
            amount: result.amount,
            data: result.data
        };
    } catch (error) {
        console.error("Failed to create payment:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get payment status
 * @param {string} paymentId - YooKassa payment ID
 * @returns {Promise<{success: boolean, status?: string, paid?: boolean, error?: string}>}
 */
export async function getPaymentStatus(paymentId, options = {}) {
    const timeoutMs = options.timeoutMs ?? Math.min(YOOKASSA_TIMEOUT_MS, 10000);
    try {
        console.log(`[Payment] Getting status for payment: ${paymentId}`);

        const result = await executePython(["status", paymentId], { timeoutMs });

        return {
            success: true,
            payment_id: result.payment_id,
            status: result.status,
            paid: result.paid,
            amount: result.amount,
            confirmation_url: result.data?.confirmation_url,
            data: result.data,
        };
    } catch (error) {
        console.error("Failed to get payment status:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Cancel a payment
 * @param {string} paymentId - YooKassa payment ID
 * @returns {Promise<{success: boolean, status?: string, error?: string}>}
 */
export async function cancelPayment(paymentId, options = {}) {
    const timeoutMs = options.timeoutMs ?? YOOKASSA_CANCEL_TIMEOUT_MS;
    try {
        console.log(`[Payment] Cancelling payment: ${paymentId}`);

        const result = await executePython(["cancel", paymentId], {
            timeoutMs,
            logPrefix: "[YooKassa]",
        });

        return {
            success: true,
            payment_id: result.payment_id,
            status: result.status,
            data: result.data,
        };
    } catch (error) {
        console.error("Failed to cancel payment:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

/** Отмена в ЮKassa без блокировки HTTP-ответа */
export function scheduleYookassaCancel(paymentId) {
    if (!paymentId) return;
    setImmediate(() => {
        cancelPayment(paymentId).then((r) => {
            if (!r.success) {
                console.warn(`[Payment] background cancel ${paymentId}: ${r.error}`);
            }
        });
    });
}
