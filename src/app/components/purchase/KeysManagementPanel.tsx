import { Calendar, Check, Copy, RefreshCw } from "lucide-react";
import type { Purchase } from "../../../lib/purchases-api";

export interface RemnaKey {
  uuid?: string;
  id?: string;
  username?: string;
  email?: string;
  expireAt?: string;
  subscriptionUrl?: string;
  trafficLimitGb?: number;
  usedTrafficGb?: number;
  leftoverGb?: number;
  trafficUsedPercent?: number;
}

interface KeysManagementPanelProps {
  remnaKeys: RemnaKey[];
  purchases: Purchase[];
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  formatDate: (date: string) => string;
  isKeyExpired: (expiresAt: string | null) => boolean;
  onRenew?: (key: RemnaKey) => void;
  renewDisabled?: boolean;
}

export function KeysManagementPanel({
  remnaKeys,
  purchases,
  copiedId,
  onCopy,
  formatDate,
  isKeyExpired,
  onRenew,
  renewDisabled,
}: KeysManagementPanelProps) {
  const activePurchases = purchases.filter(
    (p) => p.status === "active" && p.remnawave_inbound_id
  );
  const hasRemna = remnaKeys.length > 0;

  if (!hasRemna && activePurchases.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="keys-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 id="keys-heading" className="text-2xl md:text-3xl font-bold text-gray-900">
            Ваши ключи
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Управление подписками, трафик и продление
          </p>
        </div>
        <p className="text-sm text-gray-500">
          {hasRemna ? remnaKeys.length : activePurchases.length}{" "}
          {(hasRemna ? remnaKeys.length : activePurchases.length) === 1 ? "ключ" : "ключа"}
        </p>
      </div>

      <div className="space-y-4">
        {hasRemna
          ? remnaKeys.map((key) => {
              const keyId = key.uuid || key.id || key.username || "key";
              const expired = key.expireAt && new Date(key.expireAt) < new Date();
              return (
                <KeyCard
                  key={keyId}
                  title={key.username || "VPN ключ"}
                  expired={!!expired}
                  expireLabel={key.expireAt ? `до ${formatDate(key.expireAt)}` : undefined}
                  subscriptionUrl={key.subscriptionUrl}
                  traffic={
                    key.trafficLimitGb != null
                      ? {
                          usedGb: key.usedTrafficGb ?? 0,
                          limitGb: key.trafficLimitGb,
                          leftoverGb: key.leftoverGb ?? 0,
                          percent: key.trafficUsedPercent ?? 0,
                        }
                      : undefined
                  }
                  copyId={`copy-${keyId}`}
                  copiedId={copiedId}
                  onCopy={onCopy}
                  onRenew={onRenew ? () => onRenew(key) : undefined}
                  renewDisabled={renewDisabled}
                />
              );
            })
          : activePurchases.map((purchase) => {
              const expired = isKeyExpired(purchase.expires_at);
              return (
                <KeyCard
                  key={purchase.id}
                  title={purchase.package_name}
                  expired={expired}
                  expireLabel={
                    purchase.expires_at ? `до ${formatDate(purchase.expires_at)}` : undefined
                  }
                  subscriptionUrl={purchase.remnawave_inbound_id || undefined}
                  copyId={`copy-purchase-${purchase.id}`}
                  copiedId={copiedId}
                  onCopy={onCopy}
                  copyLabel="Идентификатор ключа"
                />
              );
            })}
      </div>
    </section>
  );
}

function TrafficBar({
  usedGb,
  limitGb,
  leftoverGb,
  percent,
}: {
  usedGb: number;
  limitGb: number;
  leftoverGb: number;
  percent: number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 md:p-4">
      <div className="flex flex-wrap justify-between gap-2 text-xs mb-2">
        <span className="font-medium text-gray-700">Трафик</span>
        <span className="text-gray-500">
          {usedGb} ГБ из {limitGb} ГБ · осталось {leftoverGb} ГБ
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

function KeyCard({
  title,
  expired,
  expireLabel,
  subscriptionUrl,
  traffic,
  copyId,
  copiedId,
  onCopy,
  copyLabel = "Ссылка для VPN-клиента",
  onRenew,
  renewDisabled,
}: {
  title: string;
  expired: boolean;
  expireLabel?: string;
  subscriptionUrl?: string;
  traffic?: { usedGb: number; limitGb: number; leftoverGb: number; percent: number };
  copyId: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  copyLabel?: string;
  onRenew?: () => void;
  renewDisabled?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 md:p-6 bg-white/70 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md ${
        expired ? "border-red-200/60 bg-red-50/20" : "border-gray-200/80"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
          {expired ? (
            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">
              Истёк
            </span>
          ) : (
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              Активен
            </span>
          )}
        </div>
        {onRenew && (
          <button
            type="button"
            onClick={onRenew}
            disabled={renewDisabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Продлить
          </button>
        )}
      </div>

      {expireLabel && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{expireLabel}</span>
        </div>
      )}

      {traffic && (
        <div className="mb-3">
          <TrafficBar {...traffic} />
        </div>
      )}

      {subscriptionUrl && (
        <div className="p-3 md:p-4 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">{copyLabel}</p>
          <div className="flex items-start gap-2">
            <code className="text-xs md:text-sm font-mono text-gray-900 flex-1 break-all leading-relaxed">
              {subscriptionUrl}
            </code>
            <button
              type="button"
              onClick={() => onCopy(subscriptionUrl, copyId)}
              className="p-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors shrink-0"
              title="Скопировать"
            >
              {copiedId === copyId ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
