/** Каталог подписок VPN (цена списания в ЮKassa = price). */
export const SUBSCRIPTION_CATALOG = [
    { id: "month", names: ["1 месяц"], price: 149, days: 30 },
    { id: "three-months", names: ["3 месяца"], price: 399, days: 90 },
    { id: "year", names: ["12 месяцев"], price: 899, days: 365 },
];

/**
 * Возвращает сумму оплаты по каталогу (price + days_count).
 * @returns {number|null}
 */
export function resolveSubscriptionChargeAmount(price, days_count) {
    const amount = Number(price);
    const days = Number(days_count);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(days) || days <= 0) {
        return null;
    }
    const match = SUBSCRIPTION_CATALOG.find((c) => c.price === amount && c.days === days);
    return match ? amount : null;
}
