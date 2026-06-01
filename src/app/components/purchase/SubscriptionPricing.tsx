import { useState } from "react";
import { ChevronDown, Plus, ShoppingCart } from "lucide-react";
import type { CheckoutPackage } from "./PurchaseCheckoutDialog";
import { PAYMENT_CHARGE_RUB } from "./purchase-constants";

export interface PricingPackage extends CheckoutPackage {
  features: string[];
  popular?: boolean;
}

interface SubscriptionPricingProps {
  mode: "onboarding" | "addon";
  packages: PricingPackage[];
  onSelect: (pkg: PricingPackage) => void;
  disabled?: boolean;
}

export function SubscriptionPricing({
  mode,
  packages,
  onSelect,
  disabled = false,
}: SubscriptionPricingProps) {
  const [expanded, setExpanded] = useState(false);
  const isAddon = mode === "addon";

  if (isAddon) {
    return (
      <section
        aria-labelledby="addon-pricing-heading"
        className="rounded-2xl border border-gray-200/80 bg-gray-50/40 overflow-hidden"
      >
        <button
          type="button"
          id="addon-pricing-heading"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-4 md:px-5 text-left hover:bg-gray-100/50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200/80">
              <Plus className="h-4 w-4 text-gray-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm md:text-base">
                Добавить ещё один ключ
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Отдельная подписка · оплата {PAYMENT_CHARGE_RUB} ₽
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-gray-500 shrink-0 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {expanded && (
          <div className="px-4 pb-4 md:px-5 md:pb-5 pt-0 border-t border-gray-200/60 space-y-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white border border-gray-200/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{pkg.name}</p>
                  <p className="text-xs text-gray-500">
                    {pkg.periodLabel} · каталог {pkg.price} ₽
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(pkg)}
                  disabled={disabled}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Купить · {PAYMENT_CHARGE_RUB} ₽
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="pricing-heading">
      <div className="text-center mb-8">
        <h2 id="pricing-heading" className="text-3xl font-bold text-gray-900 mb-2">
          Выберите подписку
        </h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Первый ключ за {PAYMENT_CHARGE_RUB} ₽ через ЮKassa — займёт пару минут
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white/60 backdrop-blur-xl rounded-2xl border p-6 relative transition-all hover:shadow-lg ${
              pkg.popular
                ? "border-gray-900 ring-2 ring-gray-900/10 md:scale-[1.02]"
                : "border-gray-200/50"
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Популярный
              </div>
            )}

            <div className="absolute top-4 right-4 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {PAYMENT_CHARGE_RUB} ₽
            </div>

            <div className="text-center mb-6 pt-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold text-gray-900">{pkg.price}</span>
                <span className="text-gray-500 text-lg">₽</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{pkg.periodLabel}</p>
            </div>

            <ul className="space-y-3 mb-8">
              {pkg.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-gray-700 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-900 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => onSelect(pkg)}
              disabled={disabled}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                pkg.popular
                  ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:shadow-lg disabled:opacity-50"
                  : "bg-white/80 border border-gray-300 text-gray-900 hover:bg-gray-100 disabled:opacity-50"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Купить за {PAYMENT_CHARGE_RUB} ₽
            </button>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        После оплаты ключ появится в этом разделе — скопируйте ссылку в приложение VPN
      </p>
    </section>
  );
}
