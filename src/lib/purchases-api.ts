/**
 * Remnawave VPN SDK для клиентской части
 * Для использования при покупке подписок через UI
 */

import * as React from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface Purchase {
    id: number;
    package_name: string;
    price: string;
    days_count: number;
    purchased_at: string;
    expires_at: string | null;
    remnawave_inbound_id: string | null;
    yookassa_payment_id?: string | null;
    payment_status?: string | null;
    status: string;
}

const PENDING_PURCHASE_KEY = "vpn_pending_purchase_id";

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

class PurchaseError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

    const response = await fetch(fullUrl, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({}));

    console.log(`[API] Response ${response.status}:`, data);

    if (!response.ok) {
        const message = typeof data.error === "string" ? data.error : `Error ${response.status}`;
        throw new PurchaseError(message, response.status);
    }

    return data as T;
}

export const purchasesAPI = {
    /**
     * Создаёт платёж YooKassa (1 ₽) и покупку; при наличии confirmation_url перенаправляет на оплату.
     */
    async create(packageName: string, price?: number, daysCount: number = 30) {
        const result = await request<PurchaseResponse>("/purchases", {
            method: "POST",
            body: JSON.stringify({
                package_name: packageName,
                price: price ?? null,
                days_count: daysCount,
            }),
        });

        if (result.payment?.confirmation_url) {
            localStorage.setItem(PENDING_PURCHASE_KEY, String(result.purchase.id));
            window.location.href = result.payment.confirmation_url;
        }

        return result;
    },

    /**
     * После возврата с YooKassa — проверяет оплату и выдаёт VPN ключ.
     */
    async confirm(purchaseId: number) {
        return request<PurchaseResponse>(`/purchases/${purchaseId}/confirm`, {
            method: "POST",
        });
    },

    getPendingPurchaseId(): number | null {
        const raw = localStorage.getItem(PENDING_PURCHASE_KEY);
        if (!raw) return null;
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
    },

    clearPendingPurchaseId() {
        localStorage.removeItem(PENDING_PURCHASE_KEY);
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
     * Получает ключи пользователя из Remnawave панели
     */
    async getRemnaKeys() {
        return request<{ success: boolean; keys: any[] }>("/purchases/remnawave/keys");
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
