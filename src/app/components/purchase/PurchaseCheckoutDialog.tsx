import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { PAYMENT_CHARGE_RUB } from "./purchase-constants";

export interface CheckoutPackage {
  id: string;
  name: string;
  price: number;
  daysCount: number;
  periodLabel: string;
}

interface PurchaseCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: CheckoutPackage | null;
  loading: boolean;
  onConfirm: () => void;
}

export function PurchaseCheckoutDialog({
  open,
  onOpenChange,
  pkg,
  loading,
  onConfirm,
}: PurchaseCheckoutDialogProps) {
  if (!pkg) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Подтверждение заказа</DialogTitle>
          <DialogDescription>
            Проверьте тариф перед переходом к оплате
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-coffee-latte/50 bg-coffee-cappuccino/40 p-4 space-y-3">
          <div className="flex justify-between gap-4">
            <span className="text-coffee-mocha">Тариф</span>
            <span className="font-semibold text-coffee-espresso text-right">{pkg.name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-coffee-mocha">Срок</span>
            <span className="font-medium text-coffee-espresso">{pkg.periodLabel}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-coffee-mocha/90">Цена тарифа</span>
            <span className="text-coffee-mocha/90 line-through">{pkg.price} ₽</span>
          </div>
          <div className="border-t border-coffee-latte/50 pt-3 flex justify-between items-center">
            <span className="font-medium text-coffee-espresso flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              К оплате сейчас
            </span>
            <span className="text-2xl font-bold text-coffee-espresso">{PAYMENT_CHARGE_RUB} ₽</span>
          </div>
        </div>

        <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200/80 px-3 py-2.5 text-xs text-amber-900">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Тестовый платёж: списывается <strong>{PAYMENT_CHARGE_RUB} ₽</strong>. После оплаты ключ
            создаётся автоматически в течение минуты.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg border border-coffee-latte text-coffee-espresso/80 font-medium hover:bg-coffee-cappuccino/50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-coffee-espresso text-white font-semibold hover:bg-coffee-espresso disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Подготовка…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Оплатить {PAYMENT_CHARGE_RUB} ₽
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
