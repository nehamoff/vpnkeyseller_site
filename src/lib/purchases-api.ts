/**
 * API покупок и VPN-ключей (клиент)
 * Для использования при покупке подписок через UI
 */

import * as React from "react";

import { getPaymentReturnPath, setPostAuthRedirect } from "./api";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getPaymentReturnUrl(): string {
  return new URL(getPaymentReturnPath(), window.location.origin).href;
}

export interface Purchase {
    id: number;
    package_name: string;
    price: string;
    days_count: number;
    purchased_at: string;
    expires_at: string | null;
    remnawave_inbound_id: string | null;
    remnawave_username?: string | null;
    purchase_type?: string | null;
    yookassa_payment_id?: string | null;
    payment_status?: string | null;
    status: string;
    gb_amount?: number | null;
}

export interface RemnaKey {
    uuid?: string;
    username?: string;
    email?: string;
    expireAt?: string;
    subscriptionUrl?: string;
    trafficLimitGb?: number;
    usedTrafficGb?: number;
    leftoverGb?: number;
    trafficUsedPercent?: number;
    hwidDeviceLimit?: number;
    keySource?: "site" | "telegram";
    isTelegramKey?: boolean;
    telegramId?: string | null;
}

export interface HwidDevice {
    hwid: string;
    platform?: string | null;
    osVersion?: string | null;
    deviceModel?: string | null;
    userAgent?: string | null;
    requestIp?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface HwidDevicesResponse {
    success: boolean;
    username: string;
    userUuid?: string;
    deviceLimit: number;
    total: number;
    devices: HwidDevice[];
}

const PENDING_PURCHASE_KEY = "vpn_pending_purchase_id";
const PENDING_PAYMENT_URL_KEY = "vpn_pending_payment_url";

export interface CreatePurchaseOptions {
    /** false — не редиректить сразу (показать оверлей в UI) */
    redirect?: boolean;
}

export interface PurchasePaymentInfo {
    id: string;
    status: string;
    amount?: number;
    paid?: boolean;
    confirmation_url?: string;
}

export interface PurchaseResponse {
    message: string;
    purchase: Purchase;
    payment?: PurchasePaymentInfo;
    inbound?: {
        id: string;
        username?: string;
        keyNumber?: number;
        expiresAt: string;
    };
}

export interface PurchasesListResponse {
    purchases: Purchase[];
}

export class PurchaseError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

const REQUEST_TIMEOUT_MS = 25000;

async function request<T>(
    path: string,
    options: RequestInit = {},
    timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<T> {
    const token = localStorage.getItem("vpn_token");
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const fullUrl = `${API_BASE}${path}`;
    console.log(`[API] ${options.method || "GET"} ${fullUrl}`, options.body ? JSON.parse(options.body as string) : "");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
        response = await fetch(fullUrl, {
            ...options,
            headers,
            signal: controller.signal,
        });
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            throw new PurchaseError(
                "Сервер не ответил вовремя. Если заказ появился в «Ожидает оплаты» — нажмите «Продолжить оплату».",
                408
            );
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));

    console.log(`[API] Response ${response.status}:`, data);

    if (!response.ok) {
        const message = typeof data.error === "string" ? data.error : `Error ${response.status}`;
        const code = typeof data.code === "string" ? data.code : undefined;
        throw new PurchaseError(message, response.status, code);
    }

    return data as T;
}

export const purchasesAPI = {
    /**
     * Создаёт платёж YooKassa и покупку; при наличии confirmation_url перенаправляет на оплату.
     */
    /**
     * Продление существующего ключа (оплата + активация).
     */
    async buyExtraGb(
        username: string,
        userUuid: string | undefined,
        packageId: string,
        options: CreatePurchaseOptions = {}
    ) {
        const result = await request<PurchaseResponse & { gb?: number }>("/purchases/keys/add-gb", {
            method: "POST",
            body: JSON.stringify({
                username,
                user_uuid: userUuid,
                package_id: packageId,
                return_url: getPaymentReturnUrl(),
            }),
        });

        if (result.payment?.confirmation_url) {
            this.setPendingPayment(result.purchase.id, result.payment.confirmation_url);
            if (options.redirect !== false) {
                window.location.href = result.payment.confirmation_url;
            }
        }

        return result;
    },

    async renewKey(
        username: string,
        userUuid: string | undefined,
        packageName: string,
        daysCount: number,
        price?: number,
        options: CreatePurchaseOptions = {}
    ) {
        const result = await request<PurchaseResponse>("/purchases/keys/renew", {
            method: "POST",
            body: JSON.stringify({
                username,
                user_uuid: userUuid,
                package_name: packageName,
                days_count: daysCount,
                price: price ?? null,
                return_url: getPaymentReturnUrl(),
            }),
        });

        if (result.payment?.confirmation_url) {
            this.setPendingPayment(result.purchase.id, result.payment.confirmation_url);
            if (options.redirect !== false) {
                window.location.href = result.payment.confirmation_url;
            }
        }

        return result;
    },

    async create(
        packageName: string,
        price?: number,
        daysCount: number = 30,
        options: CreatePurchaseOptions = {}
    ) {
        const result = await request<PurchaseResponse>("/purchases", {
            method: "POST",
            body: JSON.stringify({
                package_name: packageName,
                price: price ?? null,
                days_count: daysCount,
                return_url: getPaymentReturnUrl(),
            }),
        });

        if (result.payment?.confirmation_url) {
            this.setPendingPayment(result.purchase.id, result.payment.confirmation_url);
            if (options.redirect !== false) {
                window.location.href = result.payment.confirmation_url;
            }
        }

        return result;
    },

    setPendingPayment(purchaseId: number, confirmationUrl: string) {
        localStorage.setItem(PENDING_PURCHASE_KEY, String(purchaseId));
        localStorage.setItem(PENDING_PAYMENT_URL_KEY, confirmationUrl);
        setPostAuthRedirect(getPaymentReturnPath());
    },

    getPendingPaymentUrl(): string | null {
        return localStorage.getItem(PENDING_PAYMENT_URL_KEY);
    },

    async getPaymentUrl(purchaseId: number) {
        return request<{ purchase_id: number; confirmation_url: string; payment_status: string }>(
            `/purchases/${purchaseId}/payment-url`
        );
    },

    /**
     * Открывает страницу оплаты: localStorage → API (ссылка из БД/ЮKassa).
     */
    async resumePayment(purchaseId: number): Promise<boolean> {
        const storedId = this.getPendingPurchaseId();
        const localUrl = this.getPendingPaymentUrl();
        if (storedId === purchaseId && localUrl) {
            window.location.href = localUrl;
            return true;
        }

        try {
            const data = await this.getPaymentUrl(purchaseId);
            if (!data.confirmation_url) return false;
            this.setPendingPayment(purchaseId, data.confirmation_url);
            window.location.href = data.confirmation_url;
            return true;
        } catch {
            return false;
        }
    },

    goToPendingPayment(purchaseId?: number) {
        if (purchaseId != null) {
            localStorage.setItem(PENDING_PURCHASE_KEY, String(purchaseId));
        }
        const url = this.getPendingPaymentUrl();
        if (url) {
            window.location.href = url;
            return true;
        }
        return false;
    },

    /**
     * После возврата с YooKassa — проверяет оплату и выдаёт VPN ключ.
     */
    async confirm(purchaseId: number) {
        return request<PurchaseResponse>(`/purchases/${purchaseId}/confirm`, {
            method: "POST",
        });
    },

    async cancel(purchaseId: number) {
        return request<{ message: string; purchase: Purchase }>(
            `/purchases/${purchaseId}/cancel`,
            { method: "POST" },
            12000
        );
    },

    getPendingPurchaseId(): number | null {
        const raw = localStorage.getItem(PENDING_PURCHASE_KEY);
        if (!raw) return null;
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
    },

    clearPendingPurchaseId() {
        localStorage.removeItem(PENDING_PURCHASE_KEY);
        localStorage.removeItem(PENDING_PAYMENT_URL_KEY);
    },

    /**
     * Обработка return_url (?payment=return): подтверждение ожидающей покупки.
     */
    async completePendingPaymentIfNeeded(): Promise<PurchaseResponse | null> {
        const params = new URLSearchParams(window.location.search);
        if (params.get("payment") !== "return") {
            return null;
        }

        const pendingId = this.getPendingPurchaseId();
        if (!pendingId) {
            return null;
        }

        try {
            const result = await this.confirm(pendingId);
            this.clearPendingPurchaseId();
            const url = new URL(window.location.href);
            url.searchParams.delete("payment");
            window.history.replaceState({}, "", url.pathname + url.search);
            return result;
        } catch (err) {
            console.error("[Purchases] Payment confirm failed:", err);
            throw err;
        }
    },

    /**
     * Получает все покупки пользователя
     */
    async list() {
        return request<PurchasesListResponse>("/purchases");
    },

    /**
     * Получает конкретную покупку по ID
     */
    async get(id: number) {
        return request<{ purchase: Purchase }>(`/purchases/${id}`);
    },

    /**
     * Обновляет покупку (статус, дату истечения и т.д.)
     */
    async update(id: number, updates: Partial<Purchase>) {
        return request<{ message: string; purchase: Purchase }>(`/purchases/${id}`, {
            method: "PUT",
            body: JSON.stringify(updates),
        });
    },

    /**
     * Получает VPN-ключи пользователя
     */
    async getRemnaKeys() {
        return request<{ success: boolean; keys: RemnaKey[] }>("/purchases/remnawave/keys");
    },

    async getKeyDevices(username: string) {
        const encoded = encodeURIComponent(username);
        return request<HwidDevicesResponse>(`/purchases/keys/${encoded}/hwid-devices`);
    },

    async deleteKeyDevice(username: string, hwid: string) {
        const encoded = encodeURIComponent(username);
        return request<{ success: boolean; message: string; hwid: string }>(
            `/purchases/keys/${encoded}/hwid-devices`,
            {
                method: "DELETE",
                body: JSON.stringify({ hwid }),
            }
        );
    },

    /**
     * Продлевает подписку на указанное количество дней
     */
    async renew(id: number, additionalDays: number = 30) {
        const currentPurchase = await this.get(id);
        const newExpiresAt = new Date(currentPurchase.purchase.expires_at);
        newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);

        return this.update(id, {
            expires_at: newExpiresAt.toISOString(),
            status: "active",
        });
    },
};

/**
 * React Hook для управления покупками
 */
export function usePurchases() {
    const [purchases, setPurchases] = React.useState<Purchase[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const fetchPurchases = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await purchasesAPI.list();
            setPurchases(result.purchases);
        } catch (err) {
            setError(err instanceof PurchaseError ? err.message : "Ошибка загрузки покупок");
        } finally {
            setLoading(false);
        }
    };

    const createPurchase = async (
        packageName: string,
        price?: number,
        daysCount?: number
    ) => {
        setLoading(true);
        setError(null);
        try {
            const result = await purchasesAPI.create(packageName, price, daysCount);
            setPurchases([result.purchase, ...purchases]);
            return result;
        } catch (err) {
            const message = err instanceof PurchaseError ? err.message : "Ошибка создания покупки";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const renewPurchase = async (id: number, additionalDays?: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await purchasesAPI.renew(id, additionalDays);
            setPurchases(purchases.map((p) => (p.id === id ? result.purchase : p)));
            return result;
        } catch (err) {
            const message = err instanceof PurchaseError ? err.message : "Ошибка продления подписки";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchPurchases();
    }, []);

    return {
        purchases,
        loading,
        error,
        fetchPurchases,
        createPurchase,
        renewPurchase,
    };
}
