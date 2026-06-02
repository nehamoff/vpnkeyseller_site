import { useState, useRef } from "react";
import { Loader2, ShoppingCart, Check, AlertCircle } from "lucide-react";
import { purchasesAPI } from "../../lib/purchases-api";
import { PurchaseCheckoutDialog, type CheckoutPackage } from "./purchase/PurchaseCheckoutDialog";
import { PaymentOverlay } from "./purchase/PaymentOverlay";
import { PAYMENT_CHARGE_RUB } from "./purchase/purchase-constants";

interface PricingPackage extends CheckoutPackage {
    days: number;
    features: string[];
    popular?: boolean;
}

const PACKAGES: PricingPackage[] = [
    {
        id: "basic",
        name: "Базовый",
        price: 299,
        days: 30,
        daysCount: 30,
        periodLabel: "30 дней",
        features: ["До 10 Мбит/с", "3 устройства", "30 дней"],
    },
    {
        id: "pro",
        name: "Профессиональный",
        price: 599,
        days: 30,
        daysCount: 30,
        periodLabel: "30 дней",
        features: ["До 50 Мбит/с", "10 устройств", "30 дней", "Приоритет"],
        popular: true,
    },
    {
        id: "premium",
        name: "Премиум",
        price: 999,
        days: 30,
        daysCount: 30,
        periodLabel: "30 дней",
        features: ["До 100 Мбит/с", "Неограниченно", "30 дней", "Приоритет", "Поддержка 24/7"],
    },
];

type OverlayVariant = "creating" | "redirect" | null;

export function BuyVPNKey() {
    const [checkoutPkg, setCheckoutPkg] = useState<PricingPackage | null>(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [overlay, setOverlay] = useState<OverlayVariant>(null);
    const [overlayPackageName, setOverlayPackageName] = useState<string | undefined>();
    const [activePurchaseId, setActivePurchaseId] = useState<number | null>(null);
    const [cancelOverlayLoading, setCancelOverlayLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

            setActivePurchaseId(result.purchase.id);

            if (result.payment?.confirmation_url) {
                setOverlay("redirect");
                redirectTimerRef.current = setTimeout(() => {
                    window.location.href = result.payment!.confirmation_url!;
                }, 900);
                return;
            }
        } catch (err) {
            setOverlay(null);
            setActivePurchaseId(null);
            setError(
                err instanceof Error ? err.message : "Ошибка при создании покупки. Попробуйте позже."
            );
        } finally {
            setCheckoutLoading(false);
            setCheckoutPkg(null);
        }
    };

    const handleOverlayCancel = async () => {
        if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
            redirectTimerRef.current = null;
        }

        if (activePurchaseId == null) {
            setOverlay(null);
            return;
        }

        setCancelOverlayLoading(true);
        try {
            await purchasesAPI.cancel(activePurchaseId);
            purchasesAPI.clearPendingPurchaseId();
            setOverlay(null);
            setActivePurchaseId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось отменить платёж");
            setOverlay(null);
        } finally {
            setCancelOverlayLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 relative">
            {overlay && (
                <PaymentOverlay
                    variant={overlay}
                    packageName={overlayPackageName}
                    onCancel={() => void handleOverlayCancel()}
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

            <div className="text-center mb-4">
                <h2 className="text-3xl font-bold text-coffee-espresso mb-2">Выберите тариф</h2>
                <p className="text-coffee-mocha">
                    Оплата {PAYMENT_CHARGE_RUB} ₽ через ЮKassa · ключи в разделе «Мои ключи»
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-red-900">Ошибка</h3>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                {PACKAGES.map((pkg) => (
                    <div
                        key={pkg.id}
                        className={`relative rounded-2xl overflow-hidden transition-all bg-card ${
                            pkg.popular
                                ? "ring-2 ring-blue-500 shadow-xl md:scale-[1.02]"
                                : "border border-coffee-latte/50 shadow-sm"
                        }`}
                    >
                        {pkg.popular && (
                            <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                                Популярно
                            </div>
                        )}
                        <div className="absolute top-3 left-3 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            {PAYMENT_CHARGE_RUB} ₽
                        </div>

                        <div className="p-8 pt-10">
                            <h3 className="text-xl font-bold text-coffee-espresso mb-2">{pkg.name}</h3>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-coffee-espresso">{pkg.price}</span>
                                <span className="text-coffee-mocha ml-2">₽ / {pkg.periodLabel}</span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {pkg.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-coffee-espresso/80 text-sm">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                onClick={() => {
                                    setCheckoutPkg(pkg);
                                    setCheckoutOpen(true);
                                }}
                                disabled={!!overlay || checkoutLoading}
                                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                                    pkg.popular
                                        ? "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                                        : "bg-coffee-cappuccino/60 hover:bg-coffee-cappuccino text-coffee-espresso disabled:opacity-50"
                                }`}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Купить за {PAYMENT_CHARGE_RUB} ₽
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Как это работает</h3>
                <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
                    <li>Выберите тариф и подтвердите заказ</li>
                    <li>Оплатите на странице ЮKassa ({PAYMENT_CHARGE_RUB} ₽)</li>
                    <li>Вернитесь в «Мои ключи» — ключ активируется автоматически</li>
                </ol>
            </div>
        </div>
    );
}
