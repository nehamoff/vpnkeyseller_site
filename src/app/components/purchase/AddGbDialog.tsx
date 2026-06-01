import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { CreditCard, HardDrive, Loader2 } from "lucide-react";
import type { RemnaKey } from "./KeysManagementPanel";
import { GB_TOPUP_PACKAGES } from "./purchase-constants";

interface AddGbDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyInfo: RemnaKey | null;
  selectedPackageId: string;
  onSelectPackage: (id: string) => void;
  loading: boolean;
  onConfirm: () => void;
}

export function AddGbDialog({
  open,
  onOpenChange,
  keyInfo,
  selectedPackageId,
  onSelectPackage,
  loading,
  onConfirm,
}: AddGbDialogProps) {
  const selected = GB_TOPUP_PACKAGES.find((p) => p.id === selectedPackageId);

  if (!keyInfo) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Докупить трафик
          </DialogTitle>
          <DialogDescription>
            Разовая покупка: ГБ добавляются к лимиту ключа и не сгорают при месячном сбросе
            счётчика использования.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm mb-3">
          <p className="text-gray-500 text-xs">Ключ</p>
          <p className="font-medium text-gray-900">{keyInfo.username}</p>
          {keyInfo.trafficLimitGb != null && (
            <p className="text-xs text-gray-500 mt-1">
              Сейчас: {keyInfo.usedTrafficGb ?? 0} / {keyInfo.trafficLimitGb} ГБ
            </p>
          )}
        </div>

        <div className="space-y-2">
          {GB_TOPUP_PACKAGES.map((pkg) => (
            <label
              key={pkg.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                selectedPackageId === pkg.id
                  ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/30"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="gb-package"
                  checked={selectedPackageId === pkg.id}
                  onChange={() => onSelectPackage(pkg.id)}
                  className="text-blue-600"
                />
                <span className="font-semibold text-gray-900">+{pkg.label}</span>
              </div>
              <span className="font-bold text-gray-900">{pkg.price} ₽</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
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
            disabled={loading || !selected}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Оплатить {selected?.price ?? "—"} ₽
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
