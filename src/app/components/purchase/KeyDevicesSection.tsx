import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Laptop,
  Loader2,
  Smartphone,
  Trash2,
  Monitor,
  AlertCircle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { purchasesAPI, type HwidDevice } from "../../../lib/purchases-api";

interface KeyDevicesSectionProps {
  username: string;
  deviceLimit?: number;
}

function deviceLabel(device: HwidDevice): string {
  const parts = [device.deviceModel, device.platform].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  if (device.userAgent) {
    const short = device.userAgent.slice(0, 48);
    return short + (device.userAgent.length > 48 ? "…" : "");
  }
  return "Устройство";
}

function DeviceIcon({ platform }: { platform?: string | null }) {
  const p = (platform || "").toLowerCase();
  if (p.includes("ios") || p.includes("android")) {
    return <Smartphone className="h-4 w-4 text-gray-500 shrink-0" />;
  }
  if (p.includes("windows") || p.includes("mac") || p.includes("linux")) {
    return <Laptop className="h-4 w-4 text-gray-500 shrink-0" />;
  }
  return <Monitor className="h-4 w-4 text-gray-500 shrink-0" />;
}

function formatDeviceDate(value?: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function KeyDevicesSection({ username, deviceLimit = 3 }: KeyDevicesSectionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingHwid, setDeletingHwid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<HwidDevice[]>([]);
  const [limit, setLimit] = useState(deviceLimit);
  const [loaded, setLoaded] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await purchasesAPI.getKeyDevices(username);
      setDevices(data.devices || []);
      setLimit(data.deviceLimit ?? deviceLimit);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить устройства");
    } finally {
      setLoading(false);
    }
  }, [username, deviceLimit]);

  useEffect(() => {
    if (open && !loaded && !loading) {
      void loadDevices();
    }
  }, [open, loaded, loading, loadDevices]);

  const handleDelete = async (hwid: string) => {
    if (!window.confirm("Отвязать это устройство? Слот освободится для нового подключения.")) {
      return;
    }

    setDeletingHwid(hwid);
    setError(null);
    try {
      await purchasesAPI.deleteKeyDevice(username, hwid);
      setDevices((prev) => prev.filter((d) => d.hwid !== hwid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить устройство");
    } finally {
      setDeletingHwid(null);
    }
  };

  const used = devices.length;
  const slotsLabel = `${used} из ${limit}`;

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !loaded) void loadDevices();
      }}
      className="mt-3 border border-gray-100 rounded-xl overflow-hidden bg-white/50"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">Подключённые устройства</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Лимит HWID: {slotsLabel} · можно отвязать устройство и освободить слот
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-0 border-t border-gray-100">
        {loading && (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка устройств…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 py-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 mt-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadDevices()}
                className="text-xs font-medium underline mt-1"
              >
                Повторить
              </button>
            </div>
          </div>
        )}

        {!loading && !error && devices.length === 0 && loaded && (
          <p className="text-sm text-gray-500 py-3">
            Нет привязанных устройств. После первого подключения VPN-клиента они появятся здесь.
          </p>
        )}

        {!loading && devices.length > 0 && (
          <ul className="space-y-2 mt-2">
            {devices.map((device) => {
              const busy = deletingHwid === device.hwid;
              const seen = formatDeviceDate(device.updatedAt || device.createdAt);
              return (
                <li
                  key={device.hwid}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5"
                >
                  <DeviceIcon platform={device.platform} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {deviceLabel(device)}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate mt-0.5" title={device.hwid}>
                      {device.hwid}
                    </p>
                    {(device.osVersion || seen) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {[device.osVersion && `ОС ${device.osVersion}`, seen && `активность ${seen}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(device.hwid)}
                    disabled={busy}
                    title="Отвязать устройство"
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 disabled:opacity-50 shrink-0"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {open && loaded && !loading && (
          <button
            type="button"
            onClick={() => void loadDevices()}
            className="mt-3 text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Обновить список
          </button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
