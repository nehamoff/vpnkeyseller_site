import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Calendar, CreditCard, Loader2, RefreshCw } from "lucide-react";
import type { RemnaKey } from "./KeysManagementPanel";
import type { PricingPackage } from "./SubscriptionPricing";
import { PAYMENT_CHARGE_RUB } from "./purchase-constants";

interface RenewKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyInfo: RemnaKey | null;
  packages: PricingPackage[];
  selectedPackageId: string;
  onSelectPackage: (id: string) => void;
  loading: boolean;
  onConfirm: () => void;
}

export function RenewKeyDialog({
  open,
  onOpenChange,
  keyInfo,
  packages,
  selectedPackageId,
  onSelectPackage,
  loading,
  onConfirm,
}: RenewKeyDialogProps) {
  const pkg = packages.find((p) => p.id === selectedPackageId) ?? packages[0];

  if (!keyInfo || !pkg) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Продлить ключ
          </DialogTitle>
          <DialogDescription>
            Выберите срок — подписка продлится в Remnawave после оплаты
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
            <p className="text-gray-500 text-xs">Ключ</p>
            <p className="font-medium text-gray-900">{keyInfo.username}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Срок продления</p>
            <div className="space-y-2">
              {packages.map((plan) => (
                <label
                  key={plan.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    selectedPackageId === plan.id
                      ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900/20"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="renew-plan"
                      checked={selectedPackageId === plan.id}
                      onChange={() => onSelectPackage(plan.id)}
                      className="text-gray-900"
                    />
                    <span className="font-medium text-gray-900">{plan.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{plan.periodLabel}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center border-t pt-3">
            <span className="font-medium flex items-center gap-2 text-gray-700">
              <CreditCard className="h-4 w-4" />
              К оплате
            </span>
            <span className="text-xl font-bold">{PAYMENT_CHARGE_RUB} ₽</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Продлить на {pkg.periodLabel}
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
