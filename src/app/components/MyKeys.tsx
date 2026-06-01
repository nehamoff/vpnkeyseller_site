import { useState, useEffect, useMemo, useRef } from "react";
import {
  Loader2,
  ShoppingCart,
  AlertCircle,
  Mail,
  Send,
  Sparkles,
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
  const [success, setSuccess] = useState<string | null>(null);
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
              setSuccess(
                `Добавлено ${confirmed.purchase.gb_amount ?? "—"} ГБ к ключу. Трафик увеличен до оплаты исчерпания.`
              );
            } else if (type === "renewal") {
              setSuccess(
                `Подписка продлена (${confirmed.purchase.package_name}). Дата обновлена в Remnawave.`
              );
            } else {
              setSuccess(
                `Ключ «${confirmed.purchase.package_name}» активирован. Скопируйте ссылку подписки ниже.`
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
      setSuccess(`Ключ «${checkoutPkg.name}» активирован.`);
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
        setSuccess(
          `Добавлено ${result.purchase.gb_amount ?? "—"} ГБ. Лимит ключа увеличен.`
        );
      } else if (type === "renewal") {
        setSuccess(`Подписка продлена (${result.purchase.package_name}).`);
      } else {
        setSuccess(`Оплата подтверждена. Ключ «${result.purchase.package_name}» готов.`);
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
      setSuccess(`Заказ «${result.purchase.package_name}» отменён.`);
      window.setTimeout(() => setSuccess(null), 5000);
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
      setSuccess(`Ключ продлён на ${pkg.periodLabel}.`);
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
      setSuccess(`Добавлено ${result.gb ?? ""} ГБ к ключу.`);
      await refreshRemnaKeys();
    } catch (err) {
      setOverlay(null);
      setError(err instanceof Error ? err.message : "Не удалось оформить докупку");
    } finally {
      setAddGbLoading(false);
      setAddGbKeyTarget(null);
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
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        <p className="text-sm text-gray-500">Загружаем ключи и подписки…</p>
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

      {/* Заголовок страницы */}
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          {hasManagedKeys ? "Мои ключи" : "Подключение VPN"}
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          {hasManagedKeys
            ? "Управляйте подписками и копируйте ссылки для клиента"
            : "Выберите тариф и получите первый ключ за пару минут"}
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3" role="alert">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Что-то пошло не так</h3>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3"
          role="status"
        >
          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-900">Готово!</h3>
            <p className="text-sm text-emerald-800 mt-0.5">{success}</p>
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

          {user && (
            <details className="rounded-xl border border-gray-200/60 bg-gray-50/30 text-sm">
              <summary className="cursor-pointer px-4 py-3 text-gray-600 font-medium">
                Данные аккаунта
              </summary>
              <div className="px-4 pb-4 pt-0 grid md:grid-cols-2 gap-3 border-t border-gray-200/50">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">{user.email}</span>
                </div>
                {user.telegram_username && (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">@{user.telegram_username}</span>
                  </div>
                )}
              </div>
            </details>
          )}
        </>
      ) : (
        <>
          {user && (
            <div className="bg-gradient-to-r from-gray-100/40 to-gray-50/40 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-5 md:p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Аккаунт
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{user.email}</p>
                  </div>
                </div>
                {user.telegram_username && (
                  <div className="flex items-center gap-3">
                    <Send className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Telegram</p>
                      <p className="font-medium text-gray-900">@{user.telegram_username}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <SubscriptionPricing
            mode="onboarding"
            packages={PRICING_PACKAGES}
            onSelect={openCheckout}
            disabled={paymentDisabled}
          />

          {!hasPendingPayment && (
            <div className="text-center py-10 rounded-2xl border border-dashed border-gray-300 bg-gray-50/40">
              <ShoppingCart className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm max-w-xs mx-auto">
                После оплаты здесь появится ключ — его можно будет скопировать одним нажатием
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
