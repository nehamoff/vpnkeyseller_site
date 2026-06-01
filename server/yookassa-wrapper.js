/**
 * YooKassa Payment Integration Wrapper
 * Calls Python integration module to manage payments
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Execute Python command and return parsed JSON result
 * @param {string[]} args - Python script arguments
 * @returns {Promise<object>} - Parsed JSON response
 */
function executePython(args) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "yookassa_integration.py");
        console.log(`[YooKassa] Executing: python ${scriptPath} ${args.join(" ")}`);

        const pythonProcess = spawn("python", [scriptPath, ...args], {
            env: { ...process.env },
            stdio: ["pipe", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";

        pythonProcess.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            stderr += data.toString();
            console.error("[YooKassa stderr]", data.toString());
        });

        pythonProcess.on("close", (code) => {
            console.log(`[YooKassa] Process exited with code ${code}`);
            console.log(`[YooKassa full stderr] ${stderr}`);

            try {
                const result = JSON.parse(stdout);
                if (code === 0 && result.success) {
                    resolve(result);
                } else {
                    reject(new Error(result.error || `Process exited with code ${code}`));
                }
            } catch (e) {
                reject(new Error(`Failed to parse Python output: ${e.message}`));
            }
        });

        pythonProcess.on("error", (error) => {
            reject(new Error(`Failed to spawn Python process: ${error.message}`));
        });
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
export async function getPaymentStatus(paymentId) {
    try {
        console.log(`[Payment] Getting status for payment: ${paymentId}`);

        const result = await executePython(["status", paymentId]);

        return {
            success: true,
            payment_id: result.payment_id,
            status: result.status,
            paid: result.paid,
            amount: result.amount,
            data: result.data
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
export async function cancelPayment(paymentId) {
    try {
        console.log(`[Payment] Cancelling payment: ${paymentId}`);

        const result = await executePython(["cancel", paymentId]);

        return {
            success: true,
            payment_id: result.payment_id,
            status: result.status,
            data: result.data
        };
    } catch (error) {
        console.error("Failed to cancel payment:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}
