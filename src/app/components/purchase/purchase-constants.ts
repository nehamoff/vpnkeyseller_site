/** Общие преимущества для всех тарифов подписки. */
export const SUBSCRIPTION_FEATURES = [
  "LTE‑серверы",
  "Надёжные протоколы",
  "Подключение за минуту",
] as const;

/** Базовая цена за 1 месяц — для расчёта выгоды длинных тарифов. */
export const MONTHLY_BASE_PRICE = 149;

export interface SubscriptionPricingPackage {
  id: string;
  name: string;
  price: number;
  daysCount: number;
  periodLabel: string;
  features: string[];
  popular?: boolean;
  /** Цена при оплате помесячно за весь срок (зачёркнутая). */
  compareAtPrice?: number;
  /** Подпись о выгоде, например «Экономия 11%». */
  savingsLabel?: string;
  /** Эквивалент в месяц для отображения. */
  perMonthPrice?: number;
}

export const SUBSCRIPTION_PRICING_PACKAGES: SubscriptionPricingPackage[] = [
  {
    id: "month",
    name: "1 месяц",
    price: 149,
    daysCount: 30,
    periodLabel: "30 дней",
    features: [...SUBSCRIPTION_FEATURES],
  },
  {
    id: "three-months",
    name: "3 месяца",
    price: 399,
    daysCount: 90,
    periodLabel: "90 дней",
    features: [...SUBSCRIPTION_FEATURES],
    compareAtPrice: MONTHLY_BASE_PRICE * 3,
    savingsLabel: "Экономия 11%",
    perMonthPrice: 133,
    popular: true,
  },
  {
    id: "year",
    name: "12 месяцев",
    price: 899,
    daysCount: 365,
    periodLabel: "365 дней",
    features: [...SUBSCRIPTION_FEATURES],
    compareAtPrice: MONTHLY_BASE_PRICE * 12,
    savingsLabel: "Экономия 50%",
    perMonthPrice: 75,
  },
];

/** Разовая докупка трафика — реальные цены, не сбрасываются ежемесячно. */
export const GB_TOPUP_PACKAGES = [
  { id: "gb10", gb: 10, price: 49, label: "10 ГБ" },
  { id: "gb30", gb: 30, price: 99, label: "30 ГБ" },
  { id: "gb50", gb: 50, price: 149, label: "50 ГБ" },
] as const;

export type GbTopupPackageId = (typeof GB_TOPUP_PACKAGES)[number]["id"];
