/**
 * Remnawave Python Integration Wrapper
 * Calls Python integration module to manage VPN keys
 */

import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { getPurchasedGbBytesByEmail } from "./purchased-gb.js";

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
            data: result.data,
            user_uuid: result.user_uuid,
            username: result.username,
            expire_at: result.expire_at,
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
 * Renew subscription by exact Remnawave username
 */
export async function renewSubscriptionByUsername(username, days = 30) {
    try {
        if (process.env.TEST_MODE === "true") {
            const expireAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            return {
                success: true,
                username,
                expire_at: expireAt,
                data: { mode: "test" },
            };
        }

        const result = await executePython(["renew-user", username, String(days)]);
        return {
            success: true,
            data: result.data,
            user_uuid: result.user_uuid,
            username: result.username,
            expire_at: result.expire_at,
        };
    } catch (error) {
        console.error("Failed to renew by username:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Traffic stats for one key
 */
export async function getTrafficByUsername(username) {
    try {
        if (process.env.TEST_MODE === "true") {
            const limit = 26843545600;
            const used = 5368709120;
            return {
                success: true,
                traffic_limit: limit,
                used_traffic: used,
                leftover: limit - used,
            };
        }

        const result = await executePython(["traffic-user", username]);
        return {
            success: true,
            traffic_limit: result.traffic_limit,
            used_traffic: result.used_traffic,
            leftover: result.leftover,
        };
    } catch (error) {
        console.error("Failed to get traffic:", error.message);
        return { success: false, error: error.message };
    }
}

const BYTES_PER_GB = 1073741824;

export function formatTrafficBytes(bytes) {
    const value = Number(bytes) || 0;
    return Math.round((value / BYTES_PER_GB) * 100) / 100;
}

export function mapRemnawaveKey(user) {
    const limit = Number(user.trafficLimitBytes) || 0;
    const used = Number(user.userTraffic?.usedTrafficBytes) || 0;
    const leftover = Math.max(0, limit - used);

    const subscriptionUrl =
        user.subscriptionUrl ||
        user.subscription_url ||
        user.subscribeUrl ||
        null;

    const keySource = user.keySource === "telegram" ? "telegram" : "site";

    return {
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        expireAt: user.expireAt,
        subscriptionUrl,
        status: user.status,
        trafficLimitBytes: limit,
        usedTrafficBytes: used,
        leftoverBytes: leftover,
        trafficLimitGb: formatTrafficBytes(limit),
        usedTrafficGb: formatTrafficBytes(used),
        leftoverGb: formatTrafficBytes(leftover),
        trafficUsedPercent: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
        hwidDeviceLimit: Number(user.hwidDeviceLimit) > 0 ? Number(user.hwidDeviceLimit) : 3,
        keySource,
        isTelegramKey: keySource === "telegram",
        telegramId: user.telegramId != null ? String(user.telegramId) : null,
    };
}

function mergeRemnaUserLists(emailUsers = [], telegramUsers = []) {
    const merged = new Map();

    for (const user of emailUsers) {
        if (!user?.uuid) continue;
        merged.set(user.uuid, { ...user, keySource: "site" });
    }

    for (const user of telegramUsers) {
        if (!user?.uuid) continue;
        if (merged.has(user.uuid)) {
            merged.set(user.uuid, { ...merged.get(user.uuid), keySource: "telegram" });
        } else {
            merged.set(user.uuid, { ...user, keySource: "telegram" });
        }
    }

    return Array.from(merged.values());
}

function writePurchasedMapTempFile(purchasedMap) {
    const purchasedMapPath = path.join(
        os.tmpdir(),
        `remna-purchased-${crypto.randomBytes(8).toString("hex")}.json`
    );
    fs.writeFileSync(purchasedMapPath, JSON.stringify(purchasedMap), "utf8");
    return purchasedMapPath;
}

function unlinkPurchasedMapTempFile(purchasedMapPath) {
    if (!purchasedMapPath) return;
    try {
        fs.unlinkSync(purchasedMapPath);
    } catch {
        /* ignore */
    }
}

/**
 * HWID-устройства ключа (username / UUID / Telegram ID).
 */
export async function getHwidDevicesForKey({ username, userUuid, telegramId } = {}) {
    try {
        if (process.env.TEST_MODE === "true") {
            return {
                success: true,
                devices: [
                    {
                        hwid: "test-hwid-1",
                        platform: "iOS",
                        osVersion: "18.0",
                        deviceModel: "iPhone 15",
                        updatedAt: new Date().toISOString(),
                    },
                ],
                total: 1,
                hwid_device_limit: 3,
                user_uuid: userUuid || "test-uuid",
            };
        }

        const args = ["hwid-list", username || "", userUuid || "", telegramId || ""];
        const result = await executePython(args);
        return {
            success: true,
            devices: result.devices || [],
            total: result.total ?? 0,
            hwid_device_limit: result.hwid_device_limit ?? 3,
            user_uuid: result.user_uuid,
        };
    } catch (error) {
        console.error("Failed to list HWID devices:", error.message);
        return { success: false, error: error.message, devices: [], total: 0 };
    }
}

/** @deprecated use getHwidDevicesForKey */
export async function getHwidDevicesByUsername(username) {
    return getHwidDevicesForKey({ username });
}

/**
 * Удалить HWID-устройство и освободить слот.
 */
export async function deleteHwidDeviceForKey({ username, userUuid, telegramId, hwid }) {
    try {
        if (process.env.TEST_MODE === "true") {
            return { success: true, hwid };
        }

        const args = ["hwid-delete", username || "", hwid, userUuid || "", telegramId || ""];
        const result = await executePython(args);
        return { success: true, hwid: result.hwid || hwid };
    } catch (error) {
        console.error("Failed to delete HWID device:", error.message);
        return { success: false, error: error.message };
    }
}

/** @deprecated use deleteHwidDeviceForKey */
export async function deleteHwidDeviceByUsername(username, hwid) {
    return deleteHwidDeviceForKey({ username, hwid });
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
 * Add GB to a specific key by Remnawave username (one-time top-up).
 */
export async function addGbByUsername(username, gbAmount) {
    try {
        if (process.env.TEST_MODE === "true") {
            return {
                success: true,
                username,
                traffic_limit: 26843545600 + gbAmount * 1073741824,
                data: { mode: "test" },
            };
        }

        const result = await executePython(["add-gb-user", username, String(gbAmount)]);
        return {
            success: true,
            data: result.data,
            username: result.username,
            user_uuid: result.user_uuid,
            traffic_limit: result.traffic_limit,
            user: result.user,
        };
    } catch (error) {
        console.error("Failed to add GB by username:", error.message);
        return { success: false, error: error.message };
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
 * Get ALL user keys (subscriptions) from Remnawave by email
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, data?: array, count?: number, error?: string}>}
 */
export async function getUsersByTelegramId(telegramId, emailForPurchases = null) {
    let purchasedMapPath = null;
    try {
        if (process.env.TEST_MODE === "true") {
            const tgId = String(telegramId);
            return {
                success: true,
                data: [
                    {
                        uuid: `tg-test-${tgId}`,
                        username: `tg_user_${tgId}`,
                        expireAt: new Date(Date.now() + 30 * 86400000).toISOString(),
                        subscriptionUrl: "https://example.com/sub/tg-test",
                        trafficLimitBytes: 26843545600,
                        userTraffic: { usedTrafficBytes: 0 },
                        hwidDeviceLimit: 3,
                        keySource: "telegram",
                    },
                ],
                count: 1,
            };
        }

        const purchasedMap = emailForPurchases
            ? await getPurchasedGbBytesByEmail(emailForPurchases)
            : {};
        purchasedMapPath = writePurchasedMapTempFile(purchasedMap);

        const result = await executePython([
            "get-by-telegram-id",
            String(telegramId),
            purchasedMapPath,
        ]);
        return {
            success: result.success !== false,
            data: result.data || [],
            count: result.count || 0,
            error: result.error,
        };
    } catch (error) {
        console.error("Failed to get Telegram keys from Remnawave:", error.message);
        return {
            success: false,
            data: [],
            count: 0,
            error: error.message,
        };
    } finally {
        unlinkPurchasedMapTempFile(purchasedMapPath);
    }
}

export async function getAllUsersFromRemnawave(email) {
    let purchasedMapPath = null;
    try {
        const purchasedMap = await getPurchasedGbBytesByEmail(email);
        purchasedMapPath = writePurchasedMapTempFile(purchasedMap);

        const args = ["get-all-users", email, purchasedMapPath];
        const result = await executePython(args);
        return {
            success: result.success,
            data: result.data || [],
            count: result.count || 0,
            error: result.error
        };
    } catch (error) {
        console.error("Failed to get all users from Remnawave:", error.message);
        return {
            success: false,
            data: [],
            count: 0,
            error: error.message
        };
    } finally {
        unlinkPurchasedMapTempFile(purchasedMapPath);
    }
}

/**
 * Все ключи аккаунта: с сайта (по email) + из Telegram-бота (по telegram_id).
 */
export async function getAllRemnaKeysForAccount(email, telegramId = null) {
    const emailResult = await getAllUsersFromRemnawave(email);
    const emailUsers =
        emailResult.success && Array.isArray(emailResult.data) ? emailResult.data : [];

    let telegramUsers = [];
    let tgError;
    if (telegramId) {
        const tgResult = await getUsersByTelegramId(telegramId, email);
        tgError = tgResult.error;
        telegramUsers =
            tgResult.success && Array.isArray(tgResult.data) ? tgResult.data : [];
    }

    const data = mergeRemnaUserLists(emailUsers, telegramUsers);

    return {
        success: data.length > 0,
        data,
        count: data.length,
        error: data.length === 0 ? emailResult.error || tgError : undefined,
    };
}

export async function syncRemnawaveAccountEmails(oldEmail, newEmail, telegramId = null) {
    try {
        if (process.env.TEST_MODE === "true") {
            return { success: true, updated: 0, total: 0, failed: [] };
        }

        const args = ["sync-emails", oldEmail, newEmail];
        if (telegramId) args.push(String(telegramId));

        const result = await executePython(args);
        return {
            success: result.success !== false,
            updated: result.updated ?? 0,
            total: result.total ?? 0,
            failed: result.failed || [],
        };
    } catch (error) {
        console.error("Failed to sync Remnawave emails:", error.message);
        return { success: false, error: error.message, updated: 0, total: 0, failed: [] };
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
