import { AlertCircle, CreditCard, Loader2, RefreshCw, XCircle } from "lucide-react";
import type { Purchase } from "../../../lib/purchases-api";
import { PAYMENT_CHARGE_RUB } from "./purchase-constants";

interface PendingPurchasesBannerProps {
  purchases: Purchase[];
  confirmingId: number | null;
  cancellingId: number | null;
  onResumePayment: (purchaseId: number) => void;
  onCheckPayment: (purchaseId: number) => void;
  onCancelPayment: (purchaseId: number) => void;
}

export function PendingPurchasesBanner({
  purchases,
  confirmingId,
  cancellingId,
  onResumePayment,
  onCheckPayment,
  onCancelPayment,
}: PendingPurchasesBannerProps) {
  const pending = purchases.filter((p) => p.status === "awaiting_payment");
  if (pending.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50/80 p-5 shadow-sm">
      <div className="flex gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200/80">
          <AlertCircle className="h-5 w-5 text-amber-800" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-950">Ожидает оплаты</h3>
          <p className="text-sm text-amber-900/80 mt-0.5">
            {pending.length === 1
              ? "Завершите платёж, чтобы активировать заказ"
              : `У вас ${pending.length} незавершённых заказа`}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {pending.map((purchase) => {
          const busy = confirmingId === purchase.id || cancellingId === purchase.id;
          const amountRub =
            purchase.purchase_type === "gb_topup"
              ? Number(purchase.price)
              : PAYMENT_CHARGE_RUB;
          return (
            <li
              key={purchase.id}
              className="flex flex-col gap-3 rounded-xl bg-white/70 border border-amber-200/60 px-4 py-3"
            >
              <div>
                <p className="font-medium text-gray-900">{purchase.package_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Заказ №{purchase.id} · к оплате {amountRub} ₽
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onResumePayment(purchase.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Продолжить оплату
                </button>
                <button
                  type="button"
                  onClick={() => onCheckPayment(purchase.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  {confirmingId === purchase.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Уже оплатил
                </button>
                <button
                  type="button"
                  onClick={() => onCancelPayment(purchase.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-red-300 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {cancellingId === purchase.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Отменить
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
