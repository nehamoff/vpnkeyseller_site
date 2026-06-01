/**
 * Remnawave Python Integration Wrapper
 * Calls Python integration module to manage VPN keys
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a mock UUID for test mode
 * @param {string} email - User email
 * @param {number} keyNumber - Key number
 * @returns {string} - Mock UUID
 */
function generateMockUUID(email, keyNumber) {
    const input = `${email}-key${keyNumber}-${Date.now()}`;
    const hash = crypto.createHash("md5").update(input).digest("hex");
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

/**
 * Execute Python command and return parsed JSON result
 * @param {string[]} args - Python script arguments
 * @returns {Promise<object>} - Parsed JSON response
 */
function executePython(args) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "remnawave_integration.py");
        console.log(`[Python] Executing: python ${scriptPath} ${args.join(" ")}`);

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
            console.error("[Python stderr]", data.toString());
        });

        pythonProcess.on("close", (code) => {
            console.log(`[Python] Process exited with code ${code}`);

            if (stderr) {
                console.error("[Python full stderr]", stderr);
            }

            if (stdout) {
                console.log("[Python stdout]", stdout);
            }

            try {
                const result = JSON.parse(stdout);

                if (result.success) {
                    resolve(result);
                } else {
                    reject(new Error(result.error || "Python returned success: false"));
                }
            } catch (e) {
                reject(new Error(`Failed to parse Python response: ${e.message}\nStdout: ${stdout}\nStderr: ${stderr}`));
            }
        });

        pythonProcess.on("error", (err) => {
            console.error("[Python spawn error]", err.message);
            reject(err);
        });
    });
}

/**
 * Creates a new VPN user in Remnawave panel for a purchase
 * @param {string} email - User email
 * @param {number} keyNumber - Sequential key number (1, 2, 3, etc.)
 * @param {number} days - Subscription days (default 30)
 * @returns {Promise<{success: boolean, user_uuid?: string, error?: string}>}
 */
export async function createVpnUser(email, keyNumber = 1, days = 30) {
    try {
        console.log(`[VPN] Creating key for ${email}, key#${keyNumber}, days: ${days}`);

        // Test mode - generate mock UUID without calling Remnawave API
        if (process.env.TEST_MODE === "true") {
            console.log("[VPN] 🧪 TEST MODE - Creating mock VPN key");
            const mockUUID = generateMockUUID(email, keyNumber);
            const mockUsername = `${email.split("@")[0]}_${keyNumber}`;
            return {
                success: true,
                user_uuid: mockUUID,
                username: mockUsername,
                data: {
                    mode: "test",
                    created_at: new Date().toISOString(),
                    email: email,
                    key_number: keyNumber,
                    days: days
                }
            };
        }

        // Real mode - call Remnawave API
        const result = await executePython(["create", email, String(keyNumber), String(days)]);
        return {
            success: true,
            user_uuid: result.user_uuid,
            username: result.username,
            data: result.data
        };
    } catch (error) {
        console.error("Failed to create VPN user:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Renew user subscription
 * @param {string} email - User email
 * @param {number} keyNumber - Key number
 * @param {number} days - Days to extend (default 30)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function renewSubscription(email, keyNumber = 1, days = 30) {
    try {
        const result = await executePython(["renew", email, String(keyNumber), String(days)]);
        return {
            success: true,
            data: result.data
        };
    } catch (error) {
        console.error("Failed to renew subscription:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get user traffic information
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, traffic_limit?: number, used_traffic?: number, leftover?: number, error?: string}>}
 */
export async function getUserTraffic(email) {
    try {
        const result = await executePython(["traffic", email]);
        return {
            success: true,
            traffic_limit: result.traffic_limit,
            used_traffic: result.used_traffic,
            leftover: result.leftover
        };
    } catch (error) {
        console.error("Failed to get user traffic:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Add GB to user traffic
 * @param {string} email - User email
 * @param {number} gbAmount - Amount in GB
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addGbToUser(email, gbAmount) {
    try {
        const result = await executePython(["add-gb", email, String(gbAmount)]);
        return {
            success: true,
            data: result.data
        };
    } catch (error) {
        console.error("Failed to add GB:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get user information from Remnawave by email
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function getUserFromRemnawave(email) {
    try {
        const result = await executePython(["get-user", email]);
        return {
            success: true,
            data: result.data
        };
    } catch (error) {
        console.error("Failed to get user from Remnawave:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Legacy function for compatibility - creates inbound key
 * Maps to createVpnUser
 * @param {string} email - User email
 * @param {Date} purchaseDate - Purchase date
 * @returns {Promise<{success: boolean, inboundId?: string, error?: string}>}
 */
export async function createInboundKey(email, purchaseDate = null) {
    try {
        // Extract telegram ID if available from email, otherwise use email hash
        const telegramId = Math.abs(email.split('@')[0].split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000000000;

        const result = await createVpnUser(email, telegramId, 30);

        return {
            success: result.success,
            inboundId: result.user_uuid,
            error: result.error,
            data: result.data
        };
    } catch (error) {
        console.error("Failed to create inbound key:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Legacy function for compatibility
 */
export async function updateInboundKey(email, newExpireDate) {
    // This would be handled by renewSubscription in the new system
    return { success: true };
}

/**
 * Get user subscriptions (legacy function - kept for compatibility)
 * Returns configured status and subscriptions
 * @param {number} telegramId - Telegram ID
 * @returns {Promise<{configured: boolean, subscriptions: array}>}
 */
export async function getUserSubscriptions(telegramId) {
    // This is a stub - returns configured status
    // In practice, this would query Remnawave for user data
    return {
        configured: true,
        subscriptions: []
    };
}
