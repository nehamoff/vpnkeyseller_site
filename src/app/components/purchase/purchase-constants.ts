/** Сумма списания в ЮKassa для новых подписок/продлений (тестовый режим). */
export const PAYMENT_CHARGE_RUB = 1;

/** Разовая докупка трафика — реальные цены, не сбрасываются ежемесячно. */
export const GB_TOPUP_PACKAGES = [
  { id: "gb10", gb: 10, price: 49, label: "10 ГБ" },
  { id: "gb30", gb: 30, price: 99, label: "30 ГБ" },
  { id: "gb50", gb: 50, price: 149, label: "50 ГБ" },
] as const;

export type GbTopupPackageId = (typeof GB_TOPUP_PACKAGES)[number]["id"];
