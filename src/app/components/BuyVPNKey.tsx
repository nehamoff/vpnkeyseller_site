import { useState } from "react";
import { Loader2, ShoppingCart, CheckCircle, AlertCircle } from "lucide-react";
import { purchasesAPI, type Purchase } from "../../lib/purchases-api";

interface PricingPackage {
    id: string;
    name: string;
    price: number;
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
        features: ["До 10 Мбит/с", "3 устройства", "30 дней"],
    },
    {
        id: "pro",
        name: "Профессиональный",
        price: 599,
        days: 30,
        features: ["До 50 Мбит/с", "10 устройств", "30 дней", "Приоритет"],
        popular: true,
    },
    {
        id: "premium",
        name: "Премиум",
        price: 999,
        days: 30,
        features: ["До 100 Мбит/с", "Неограниченно", "30 дней", "Приоритет", "Поддержка 24/7"],
    },
];

export function BuyVPNKey() {
    const [selectedPackage, setSelectedPackage] = useState<string>("pro");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [purchaseData, setPurchaseData] = useState<any>(null);

    const handlePurchase = async (packageId: string) => {
        const pkg = PACKAGES.find((p) => p.id === packageId);
        if (!pkg) return;

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            console.log("[BuyVPNKey] Starting purchase for package:", pkg);
            const result = await purchasesAPI.create(pkg.name, pkg.price, pkg.days);
            console.log("[BuyVPNKey] Purchase result:", result);

            if (result.payment?.confirmation_url) {
                return;
            }

            setPurchaseData(result);
            setSuccess(true);
            setSelectedPackage(""); // Сбрасываем выбор после успешной покупки

            // Скроем сообщение об успехе через 5 секунд
            setTimeout(() => {
                setSuccess(false);
                setPurchaseData(null);
            }, 5000);
        } catch (err) {
            console.error("[BuyVPNKey] Purchase error:", err);
            setError(
                err instanceof Error ? err.message : "Ошибка при создании покупки. Попробуйте позже."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Выберите тариф</h2>
                <p className="text-gray-600">Получите доступ к быстрому и надежному VPN</p>
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

            {success && purchaseData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-green-900">Успешно!</h3>
                        <p className="text-sm text-green-700">
                            VPN ключ "{purchaseData.purchase.package_name}" создан. Доступен до{" "}
                            {new Date(purchaseData.purchase.expires_at).toLocaleDateString("ru-RU")}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                {PACKAGES.map((pkg) => (
                    <div
                        key={pkg.id}
                        className={`relative rounded-2xl overflow-hidden transition-all ${pkg.popular
                            ? "ring-2 ring-blue-500 transform scale-105 shadow-xl"
                            : "border border-gray-200 hover:border-gray-300 shadow-sm"
                            } bg-white`}
                    >
                        {pkg.popular && (
                            <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                                Популярно
                            </div>
                        )}

                        <div className="p-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">{pkg.price}</span>
                                <span className="text-gray-600 ml-2">₽/{pkg.days} дней</span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {pkg.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-gray-700">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handlePurchase(pkg.id)}
                                disabled={loading}
                                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${pkg.popular
                                    ? "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:opacity-50"
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Обработка...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="w-4 h-4" />
                                        Купить
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Как это работает?</h3>
                <ol className="space-y-2 text-sm text-blue-800">
                    <li>1. Выберите тариф и нажмите «Купить»</li>
                    <li>2. Оплатите заказ на странице ЮKassa (сейчас тестовая сумма 1 ₽)</li>
                    <li>3. После оплаты создаётся VPN ключ в Remnawave</li>
                    <li>4. Ключ готов к использованию в VPN-клиенте</li>
                </ol>
            </div>
        </div>
    );
}
