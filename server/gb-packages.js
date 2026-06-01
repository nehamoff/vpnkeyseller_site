/** Пакеты разовой докупки трафика (не сбрасываются ежемесячно). */
export const GB_TOPUP_PACKAGES = {
    gb10: { id: "gb10", gb: 10, price: 49, label: "10 ГБ" },
    gb30: { id: "gb30", gb: 30, price: 99, label: "30 ГБ" },
    gb50: { id: "gb50", gb: 50, price: 149, label: "50 ГБ" },
};

export function getGbPackage(packageId) {
    return GB_TOPUP_PACKAGES[packageId] ?? null;
}
