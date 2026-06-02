import { useState, useEffect, useMemo, useRef } from "react";
import {
  Loader2,
  ShoppingCart,
  AlertCircle,
  Send,
  Download,
  Smartphone,
} from "lucide-react";
import { authApi, type UserProfile } from "../../lib/api";
import { purchasesAPI, type Purchase, type RemnaKey } from "../../lib/purchases-api";
import { PurchaseCheckoutDialog } from "./purchase/PurchaseCheckoutDialog";
import { PaymentOverlay } from "./purchase/PaymentOverlay";
import { PendingPurchasesBanner } from "./purchase/PendingPurchasesBanner";
import { KeysManagementPanel } from "./purchase/KeysManagementPanel";
import { SubscriptionPricing, type PricingPackage } from "./purchase/SubscriptionPricing";
import { RenewKeyDialog } from "./purchase/RenewKeyDialog";
import { AddGbDialog } from "./purchase/AddGbDialog";
import { TelegramLoginWidget } from "./TelegramLoginWidget";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ApiError } from "../../lib/api";
import { toast } from "sonner";

function showSuccessToast(message: string) {
  toast.success("Готово!", { description: message, duration: 5000 });
}
import bannerAppDownload from "../../../photo/appdownload.png";
import bannerTgNative from "../../../photo/tgnative.png";

const TELEGRAM_BOT = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";
const TELEGRAM_BOT_BANNER_URL = "https://t.me/coffemaniaVPNbot?start=17";
const ANDROID_APK_URL =
  "https://github.com/canawa/vpn_client/releases/download/beta-release/coffeemaniavpn.apk";

const PRICING_PACKAGES: PricingPackage[] = [
  {
    id: "month",
    name: "1 месяц",
    price: 149,
    daysCount: 30,
    periodLabel: "30 дней",
    features: ["Безлимитная скорость", "Все серверы доступны", "Круглосуточная поддержка"],
  },
  {
    id: "three-months",
    name: "3 месяца",
    price: 399,
    daysCount: 90,
    periodLabel: "90 дней",
    features: ["Безлимитная скорость", "Все серверы доступны", "Круглосуточная поддержка", "Экономия 11%"],
    popular: true,
  },
  {
    id: "year",
    name: "12 месяцев",
    price: 899,
    daysCount: 365,
    periodLabel: "365 дней",
    features: ["Безлимитная скорость", "Все серверы доступны", "Круглосуточная поддержка", "Экономия 50%"],
  },
];

type OverlayVariant = "creating" | "redirect" | "confirm" | null;

export function MyKeys() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [remnaKeys, setRemnaKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [checkoutPkg, setCheckoutPkg] = useState<PricingPackage | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [overlay, setOverlay] = useState<OverlayVariant>(null);
  const [overlayPackageName, setOverlayPackageName] = useState<string | undefined>();
  const [activePurchaseId, setActivePurchaseId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelOverlayLoading, setCancelOverlayLoading] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [renewKeyTarget, setRenewKeyTarget] = useState<RemnaKey | null>(null);
  const [renewPackageId, setRenewPackageId] = useState("three-months");
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);

  const [addGbKeyTarget, setAddGbKeyTarget] = useState<RemnaKey | null>(null);
  const [addGbPackageId, setAddGbPackageId] = useState("gb30");
  const [addGbDialogOpen, setAddGbDialogOpen] = useState(false);
  const [addGbLoading, setAddGbLoading] = useState(false);

  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [telegramLinkError, setTelegramLinkError] = useState("");
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);

  const [appDownloadDialogOpen, setAppDownloadDialogOpen] = useState(false);

  const hasPendingPayment = useMemo(
    () => purchases.some((p) => p.status === "awaiting_payment"),
    [purchases]
  );

  const hasManagedKeys = useMemo(
    () =>
      remnaKeys.length > 0 ||
      purchases.some((p) => p.status === "active" && p.remnawave_inbound_id),
    [remnaKeys, purchases]
  );

  useEffect(() => {
    loadData();
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const refreshRemnaKeys = async () => {
    const remnaResponse = await purchasesAPI.getRemnaKeys();
    if (remnaResponse.success && remnaResponse.keys) {
      setRemnaKeys(Array.isArray(remnaResponse.keys) ? remnaResponse.keys : []);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const isPaymentReturn = new URLSearchParams(window.location.search).get("payment") === "return";

    if (isPaymentReturn) {
      setOverlay("confirm");
    }

    try {
      if (isPaymentReturn) {
        try {
          const confirmed = await purchasesAPI.completePendingPaymentIfNeeded();
          if (confirmed?.purchase) {
            const type = confirmed.purchase.purchase_type;
            if (type === "gb_topup") {
              showSuccessToast(
                `Добавлено ${confirmed.purchase.gb_amount ?? "—"} ГБ к ключу. Трафик увеличен до оплаты исчерпания.`
              );
            } else if (type === "renewal") {
              showSuccessToast(
                `Подписка продлена (${confirmed.purchase.package_name}). Дата обновлена в Remnawave.`
              );
            } else {
              showSuccessToast(
                `Оплата подтверждена. Ключ «${confirmed.purchase.package_name}» готов.`
              );
            }
          }
        } catch (confirmErr) {
          setError(
            confirmErr instanceof Error
              ? confirmErr.message
              : "Оплата получена, но активация не удалась. Нажмите «Уже оплатил» в блоке ожидания."
          );
        } finally {
          setOverlay(null);
        }
      }

      const userResponse = await authApi.me();
      setUser(userResponse.user);

      const purchasesResponse = await purchasesAPI.list();
      setPurchases(purchasesResponse.purchases);

      try {
        await refreshRemnaKeys();
      } catch (remnaError) {
        console.error("[MyKeys] Failed to fetch Remnawave keys:", remnaError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при загрузке данных");
      setOverlay(null);
    } finally {
      setLoading(false);
    }
  };

  const openCheckout = (pkg: PricingPackage) => {
    setError(null);
    setCheckoutPkg(pkg);
    setCheckoutOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutPkg) return;

    setCheckoutLoading(true);
    setCheckoutOpen(false);
    setOverlayPackageName(checkoutPkg.name);
    setOverlay("creating");
    setError(null);
    setActivePurchaseId(null);

    try {
      const result = await purchasesAPI.create(
        checkoutPkg.name,
        checkoutPkg.price,
        checkoutPkg.daysCount,
        { redirect: false }
      );

      setPurchases((prev) => {
        const without = prev.filter((p) => p.id !== result.purchase.id);
        return [result.purchase, ...without];
      });

      setActivePurchaseId(result.purchase.id);

      if (result.payment?.confirmation_url) {
        setOverlay("redirect");
        redirectTimerRef.current = setTimeout(() => {
          window.location.href = result.payment!.confirmation_url!;
        }, 900);
        return;
      }

      setOverlay(null);
      setActivePurchaseId(null);
      showSuccessToast(`Ключ «${checkoutPkg.name}» активирован.`);
      await refreshRemnaKeys();
    } catch (err) {
      setOverlay(null);
      setActivePurchaseId(null);
      setError(err instanceof Error ? err.message : "Не удалось создать платёж");
    } finally {
      setCheckoutLoading(false);
      setCheckoutPkg(null);
    }
  };

  const handleCheckPayment = async (purchaseId: number) => {
    setConfirmingId(purchaseId);
    setError(null);
    try {
      const result = await purchasesAPI.confirm(purchaseId);
      purchasesAPI.clearPendingPurchaseId();
      setPurchases((prev) =>
        prev.map((p) => (p.id === purchaseId ? result.purchase : p))
      );
      const type = result.purchase.purchase_type;
      if (type === "gb_topup") {
        showSuccessToast(
          `Добавлено ${result.purchase.gb_amount ?? "—"} ГБ. Лимит ключа увеличен.`
        );
      } else if (type === "renewal") {
        showSuccessToast(`Подписка продлена (${result.purchase.package_name}).`);
      } else {
        showSuccessToast(`Оплата подтверждена. Ключ «${result.purchase.package_name}» готов.`);
      }
      await refreshRemnaKeys();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Платёж ещё не поступил. Подождите минуту или завершите оплату."
      );
    } finally {
      setConfirmingId(null);
    }
  };

  const handleResumePayment = (purchaseId: number) => {
    const pkg = purchases.find((p) => p.id === purchaseId);
    setOverlayPackageName(pkg?.package_name);
    setActivePurchaseId(purchaseId);

    const resumed = purchasesAPI.goToPendingPayment(purchaseId);
    if (!resumed) {
      setActivePurchaseId(null);
      setError(
        "Ссылка на оплату устарела. Нажмите «Купить» на тарифе ещё раз — создастся новый заказ."
      );
    } else {
      setOverlay("redirect");
    }
  };

  const handleCancelPayment = async (purchaseId: number) => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    const fromOverlay = overlay != null;
    if (fromOverlay) setCancelOverlayLoading(true);
    else setCancellingId(purchaseId);

    setError(null);

    try {
      const result = await purchasesAPI.cancel(purchaseId);
      purchasesAPI.clearPendingPurchaseId();
      setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
      setOverlay(null);
      setActivePurchaseId(null);
      showSuccessToast(`Заказ «${result.purchase.package_name}» отменён.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить платёж");
    } finally {
      setCancelOverlayLoading(false);
      setCancellingId(null);
    }
  };

  const openRenewDialog = (key: RemnaKey) => {
    setError(null);
    setRenewKeyTarget(key);
    setRenewPackageId("three-months");
    setRenewDialogOpen(true);
  };

  const handleConfirmRenew = async () => {
    if (!renewKeyTarget?.username) return;

    const pkg = PRICING_PACKAGES.find((p) => p.id === renewPackageId);
    if (!pkg) return;

    setRenewLoading(true);
    setRenewDialogOpen(false);
    setOverlayPackageName(`Продление · ${pkg.name}`);
    setOverlay("creating");
    setError(null);
    setActivePurchaseId(null);

    try {
      const result = await purchasesAPI.renewKey(
        renewKeyTarget.username,
        renewKeyTarget.uuid,
        pkg.name,
        pkg.daysCount,
        pkg.price,
        { redirect: false }
      );

      setPurchases((prev) => {
        const without = prev.filter((p) => p.id !== result.purchase.id);
        return [result.purchase, ...without];
      });

      setActivePurchaseId(result.purchase.id);

      if (result.payment?.confirmation_url) {
        setOverlay("redirect");
        redirectTimerRef.current = setTimeout(() => {
          window.location.href = result.payment!.confirmation_url!;
        }, 900);
        return;
      }

      setOverlay(null);
      showSuccessToast(`Ключ продлён на ${pkg.periodLabel}.`);
      await refreshRemnaKeys();
    } catch (err) {
      setOverlay(null);
      setError(err instanceof Error ? err.message : "Не удалось оформить продление");
    } finally {
      setRenewLoading(false);
      setRenewKeyTarget(null);
    }
  };

  const openAddGbDialog = (key: RemnaKey) => {
    setError(null);
    setAddGbKeyTarget(key);
    setAddGbPackageId("gb30");
    setAddGbDialogOpen(true);
  };

  const handleConfirmAddGb = async () => {
    if (!addGbKeyTarget?.username) return;

    setAddGbLoading(true);
    setAddGbDialogOpen(false);
    setOverlayPackageName(`Докупка трафика`);
    setOverlay("creating");
    setError(null);
    setActivePurchaseId(null);

    try {
      const result = await purchasesAPI.buyExtraGb(
        addGbKeyTarget.username,
        addGbKeyTarget.uuid,
        addGbPackageId,
        { redirect: false }
      );

      setPurchases((prev) => {
        const without = prev.filter((p) => p.id !== result.purchase.id);
        return [result.purchase, ...without];
      });

      setActivePurchaseId(result.purchase.id);

      if (result.payment?.confirmation_url) {
        setOverlay("redirect");
        redirectTimerRef.current = setTimeout(() => {
          window.location.href = result.payment!.confirmation_url!;
        }, 900);
        return;
      }

      setOverlay(null);
      showSuccessToast(`Добавлено ${result.gb ?? ""} ГБ к ключу.`);
      await refreshRemnaKeys();
    } catch (err) {
      setOverlay(null);
      setError(err instanceof Error ? err.message : "Не удалось оформить докупку");
    } finally {
      setAddGbLoading(false);
      setAddGbKeyTarget(null);
    }
  };

  const handleLinkTelegram = async (data: Parameters<typeof authApi.linkTelegram>[0]) => {
    setTelegramLinkError("");
    setTelegramLinkLoading(true);
    try {
      const result = await authApi.linkTelegram(data);
      setUser(result.user);
      showSuccessToast(
        "Telegram привязан. Если в боте был ключ — он появится в списке с меткой Telegram."
      );
      setTelegramDialogOpen(false);
      await refreshRemnaKeys();
    } catch (err) {
      setTelegramLinkError(
        err instanceof ApiError ? err.message : "Не удалось привязать Telegram"
      );
    } finally {
      setTelegramLinkLoading(false);
    }
  };

  const handleOverlayCancel = () => {
    if (activePurchaseId != null) {
      void handleCancelPayment(activePurchaseId);
      return;
    }
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setOverlay(null);
    setOverlayPackageName(undefined);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isKeyExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const paymentDisabled = !!overlay || checkoutLoading || renewLoading || addGbLoading;

  if (loading && !overlay) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-coffee-mocha" />
        <p className="text-sm text-coffee-mocha/90">Загружаем ключи и подписки…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
      {overlay && (
        <PaymentOverlay
          variant={overlay}
          packageName={overlayPackageName}
          onCancel={overlay === "confirm" ? undefined : handleOverlayCancel}
          cancelLoading={cancelOverlayLoading}
        />
      )}

      <PurchaseCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        pkg={checkoutPkg}
        loading={checkoutLoading}
        onConfirm={handleConfirmCheckout}
      />

      <RenewKeyDialog
        open={renewDialogOpen}
        onOpenChange={setRenewDialogOpen}
        keyInfo={renewKeyTarget}
        packages={PRICING_PACKAGES}
        selectedPackageId={renewPackageId}
        onSelectPackage={setRenewPackageId}
        loading={renewLoading}
        onConfirm={handleConfirmRenew}
      />

      <AddGbDialog
        open={addGbDialogOpen}
        onOpenChange={setAddGbDialogOpen}
        keyInfo={addGbKeyTarget}
        selectedPackageId={addGbPackageId}
        onSelectPackage={setAddGbPackageId}
        loading={addGbLoading}
        onConfirm={handleConfirmAddGb}
      />

      <Dialog
        open={telegramDialogOpen}
        onOpenChange={(open) => {
          setTelegramDialogOpen(open);
          if (!open) setTelegramLinkError("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Привязать Telegram
            </DialogTitle>
            <DialogDescription>
              Импортируем VPN-ключ из бота, если он уже есть в Remnawave по вашему Telegram ID.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {telegramLinkError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {telegramLinkError}
              </div>
            )}
            <div className="relative min-h-[48px] flex items-center justify-center">
              {telegramLinkLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/90 rounded-xl z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-coffee-mocha" />
                </div>
              )}
              {TELEGRAM_BOT ? (
                <TelegramLoginWidget botUsername={TELEGRAM_BOT} onAuth={handleLinkTelegram} />
              ) : (
                <p className="text-sm text-coffee-mocha/90 text-center">
                  Виджет Telegram не настроен (VITE_TELEGRAM_BOT_USERNAME)
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={appDownloadDialogOpen} onOpenChange={setAppDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-coffee-espresso">
              <Smartphone className="w-5 h-5" />
              Приложение на Android
            </DialogTitle>
            <DialogDescription>
              Установите официальное приложение Кофемания VPN — быстрое подключение и удобное
              управление ключами на смартфоне.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <a
              href={ANDROID_APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-coffee-espresso px-5 py-3 text-sm font-semibold text-coffee-milk shadow-coffee-lg transition-colors hover:bg-coffee-espresso/90"
            >
              <Download className="w-5 h-5" />
              Скачать APK
            </a>
            <p className="mt-3 text-center text-xs text-coffee-mocha/90">
              При установке разрешите загрузку из неизвестных источников в настройках Android.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {hasManagedKeys ? (
        <button
          type="button"
          onClick={() => setAppDownloadDialogOpen(true)}
          className="group w-full rounded-3xl overflow-hidden border border-coffee-latte/40 shadow-coffee-lg hover:shadow-coffee-xl hover:border-coffee-mocha/30 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coffee-espresso focus-visible:ring-offset-2 focus-visible:ring-offset-background text-left"
          aria-label="Скачать приложение Кофемания VPN для Android"
        >
          <img
            src={bannerAppDownload}
            alt="У нас есть приложение — быстрое и безопасное VPN-соединение в смартфоне"
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            loading="lazy"
            decoding="async"
          />
        </button>
      ) : (
        <a
          href={TELEGRAM_BOT_BANNER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-3xl overflow-hidden border border-coffee-latte/40 shadow-coffee-lg hover:shadow-coffee-xl hover:border-coffee-mocha/30 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coffee-espresso focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Открыть Telegram-бот Кофемания VPN"
        >
          <img
            src={bannerTgNative}
            alt="Управляйте ключами в Telegram — бот @coffemaniaVPNbot"
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            loading="lazy"
            decoding="async"
          />
        </a>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3" role="alert">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Что-то пошло не так</h3>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <PendingPurchasesBanner
        purchases={purchases}
        confirmingId={confirmingId}
        cancellingId={cancellingId}
        onResumePayment={handleResumePayment}
        onCheckPayment={handleCheckPayment}
        onCancelPayment={handleCancelPayment}
      />

      {user && !user.telegram_id && TELEGRAM_BOT && (
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50 to-sky-50/80 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Send className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="font-semibold text-coffee-espresso">Есть ключ в Telegram-боте?</p>
              <p className="text-sm text-coffee-mocha mt-0.5">
                Привяжите Telegram — ключ из бота появится здесь с синей меткой.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setTelegramLinkError("");
              setTelegramDialogOpen(true);
            }}
            className="shrink-0 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Привязать Telegram
          </button>
        </div>
      )}

      {hasManagedKeys ? (
        <>
          <KeysManagementPanel
            remnaKeys={remnaKeys}
            purchases={purchases}
            copiedId={copiedId}
            onCopy={copyToClipboard}
            formatDate={formatDate}
            isKeyExpired={isKeyExpired}
            onRenew={openRenewDialog}
            onAddGb={openAddGbDialog}
            renewDisabled={paymentDisabled}
          />

          <SubscriptionPricing
            mode="addon"
            packages={PRICING_PACKAGES}
            onSelect={openCheckout}
            disabled={paymentDisabled}
          />
        </>
      ) : (
        <>
          <SubscriptionPricing
            mode="onboarding"
            packages={PRICING_PACKAGES}
            onSelect={openCheckout}
            disabled={paymentDisabled}
          />

          {!hasPendingPayment && (
            <div className="text-center py-10 rounded-2xl border border-dashed border-coffee-latte bg-coffee-cappuccino/40">
              <ShoppingCart className="w-10 h-10 text-coffee-latte mx-auto mb-3" />
              <p className="text-coffee-mocha text-sm max-w-xs mx-auto">
                После оплаты здесь появится ключ — его можно будет скопировать одним нажатием
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
