import { AlertCircle, CreditCard, Loader2, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { PAYMENT_CHARGE_RUB } from "./purchase-constants";

export type PaymentOverlayVariant = "redirect" | "confirm" | "creating";

const COPY: Record<
  PaymentOverlayVariant,
  { title: string; subtitle: string; icon: typeof CreditCard }
> = {
  creating: {
    title: "Подготавливаем оплату",
    subtitle: "Создаём заказ и чек в ЮKassa…",
    icon: CreditCard,
  },
  redirect: {
    title: "Переход на страницу оплаты",
    subtitle: "Сейчас откроется защищённая форма ЮKassa. Не закрывайте вкладку.",
    icon: ShieldCheck,
  },
  confirm: {
    title: "Проверяем оплату",
    subtitle: "Активируем VPN-ключ после подтверждения платежа…",
    icon: Sparkles,
  },
};

interface PaymentOverlayProps {
  variant: PaymentOverlayVariant;
  packageName?: string;
  onCancel?: () => void;
  cancelLoading?: boolean;
}

export function PaymentOverlay({
  variant,
  packageName,
  onCancel,
  cancelLoading = false,
}: PaymentOverlayProps) {
  const { title, subtitle, icon: Icon } = COPY[variant];
  const canCancel = Boolean(onCancel) && variant !== "confirm";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-coffee-espresso/50 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-overlay-title"
      aria-busy={!canCancel}
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-orange-50/90 p-6 shadow-2xl">
        <div className="flex gap-3 mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-200/90">
            <AlertCircle className="h-5 w-5 text-amber-900" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/90">
              Идёт оплата
            </p>
            {packageName && (
              <p className="text-sm font-medium text-coffee-espresso truncate mt-0.5">{packageName}</p>
            )}
            <p className="text-xs text-amber-900/70 mt-0.5">Сумма: {PAYMENT_CHARGE_RUB} ₽</p>
          </div>
        </div>

        <div className="text-center mb-5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-card/90 border border-amber-200/60">
            <Icon className="h-7 w-7 text-amber-900" />
          </div>
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-900 mb-3" />
          <h2 id="payment-overlay-title" className="text-lg font-bold text-coffee-espresso mb-1.5">
            {title}
          </h2>
          <p className="text-sm text-coffee-mocha leading-relaxed px-1">{subtitle}</p>
        </div>

        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 hover:border-red-400 disabled:opacity-50 transition-colors"
          >
            {cancelLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Отменить платёж
          </button>
        )}
      </div>
    </div>
  );
}
