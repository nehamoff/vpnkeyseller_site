import { useState, useEffect } from "react";
import {
  Loader2,
  ShoppingCart,
  AlertCircle,
  Copy,
  Calendar,
  Mail,
  Send,
  Check
} from "lucide-react";
import { authApi, type UserProfile } from "../../lib/api";
import { purchasesAPI, type Purchase } from "../../lib/purchases-api";

interface PricingPackage {
  id: string;
  name: string;
  price: number;
  daysCount: number;
  period: string;
  periodLabel: string;
  features: string[];
  popular?: boolean;
}

const PRICING_PACKAGES: PricingPackage[] = [
  {
    id: "month",
    name: "1 месяц",
    price: 149,
    daysCount: 30,
    period: "месяц",
    periodLabel: "месяц",
    features: ["Безлимитная скорость", "Все серверы доступны", "Круглосуточная поддержка"],
  },
  {
    id: "three-months",
    name: "3 месяца",
    price: 399,
    daysCount: 90,
    period: "квартал",
    periodLabel: "за 3 месяца",
    features: ["Безлимитная скорость", "Все серверы доступны", "Круглосуточная поддержка", "Экономия 11%"],
    popular: true,
  },
  {
    id: "year",
    name: "12 месяцев",
    price: 899,
    daysCount: 365,
    period: "год",
    periodLabel: "за год",
    features: ["Безлимитная скорость", "Все серверы доступны", "Круглосуточная поддержка", "Экономия 50%"],
  },
];

export function MyKeys() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [remnaKeys, setRemnaKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load user profile and purchases on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const confirmed = await purchasesAPI.completePendingPaymentIfNeeded();
        if (confirmed?.purchase) {
          setSuccess(
            `✓ Оплата прошла успешно. Ключ «${confirmed.purchase.package_name}» активирован.`
          );
        }
      } catch (confirmErr) {
        setError(
          confirmErr instanceof Error
            ? confirmErr.message
            : "Оплата получена, но активация ключа не удалась. Обновите страницу или обратитесь в поддержку."
        );
      }

      const userResponse = await authApi.me();
      setUser(userResponse.user);

      const purchasesResponse = await purchasesAPI.list();
      setPurchases(purchasesResponse.purchases);

      // Get keys from Remnawave
      try {
        const remnaResponse = await purchasesAPI.getRemnaKeys();
        if (remnaResponse.success && remnaResponse.keys) {
          console.log("[MyKeys] Remnawave keys:", remnaResponse.keys);
          setRemnaKeys(Array.isArray(remnaResponse.keys) ? remnaResponse.keys : []);
        }
      } catch (remnaError) {
        console.error("[MyKeys] Failed to fetch Remnawave keys:", remnaError);
        // Don't fail completely if Remnawave fetch fails
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(
        err instanceof Error ? err.message : "Ошибка при загрузке данных"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PricingPackage) => {
    setPurchasing(pkg.id);
    setError(null);
    setSuccess(null);

    try {
      console.log(`[MyKeys] Purchasing ${pkg.name}...`);
      const result = await purchasesAPI.create(pkg.name, pkg.price, pkg.daysCount);
      console.log("[MyKeys] Purchase successful:", result);

      if (result.payment?.confirmation_url) {
        return;
      }

      setPurchases([result.purchase, ...purchases]);
      setSuccess(`✓ Ключ «${pkg.name}» успешно создан! Используйте его для подключения.`);

      // Reload Remnawave keys to show the new one
      try {
        const remnaResponse = await purchasesAPI.getRemnaKeys();
        if (remnaResponse.success && remnaResponse.keys) {
          setRemnaKeys(Array.isArray(remnaResponse.keys) ? remnaResponse.keys : []);
        }
      } catch (remnaError) {
        console.error("[MyKeys] Failed to reload Remnawave keys:", remnaError);
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("[MyKeys] Purchase error:", err);
      setError(
        err instanceof Error ? err.message : "Ошибка при создании ключа"
      );
    } finally {
      setPurchasing(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isKeyExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* User Info Card */}
      {user && (
        <div className="bg-gradient-to-r from-gray-100/40 to-gray-50/40 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ваши данные</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            {user.telegram_username && (
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Telegram</p>
                  <p className="font-medium text-gray-900">@{user.telegram_username}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Ошибка</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Успешно!</h3>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Pricing Plans Section */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Выберите подписку</h2>
          <p className="text-gray-600">Купите ключ для доступа к VPN</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white/60 backdrop-blur-xl rounded-2xl border p-6 relative transition-all hover:shadow-lg ${pkg.popular
                ? "border-gray-900 ring-2 ring-gray-900/10 md:scale-105"
                : "border-gray-200/50"
                }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Популярный
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold text-gray-900">{pkg.price}</span>
                  <span className="text-gray-600">₽</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">{pkg.periodLabel}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-gray-700">
                    <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={purchasing === pkg.id}
                className={`w-full py-3 rounded-lg transition-all font-semibold flex items-center justify-center gap-2 ${purchasing === pkg.id
                  ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                  : pkg.popular
                    ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:shadow-lg"
                    : "bg-white/80 border border-gray-300 text-gray-900 hover:bg-gray-100"
                  }`}
              >
                {purchasing === pkg.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Купить
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Keys Section - From Remnawave */}
      {remnaKeys.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ваши активные ключи</h2>
          <div className="space-y-4">
            {remnaKeys.map((key: any) => {
              const expired = key.expireAt && new Date(key.expireAt) < new Date();
              return (
                <div
                  key={key.uuid || key.id}
                  className={`bg-white/60 backdrop-blur-xl rounded-xl border p-6 transition-all ${expired
                    ? "border-red-200/50 bg-red-50/30"
                    : "border-gray-200/50"
                    }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {key.username}
                        </h3>
                        {expired && (
                          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            Истёк
                          </span>
                        )}
                        {!expired && (
                          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Активен
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-3">
                        {key.email && (
                          <div>Email: <span className="font-medium text-gray-900">{key.email}</span></div>
                        )}
                        {key.expireAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>до {formatDate(key.expireAt)}</span>
                          </div>
                        )}
                      </div>

                      {/* Subscription URL */}
                      {key.subscriptionUrl && (
                        <div className="mt-3 p-3 bg-gray-100/60 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Ссылка подписки:</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-gray-900 flex-1 break-all">
                              {key.subscriptionUrl}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  key.subscriptionUrl,
                                  `copy-${key.uuid || key.id}`
                                )
                              }
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                              title="Скопировать ссылку"
                            >
                              {copiedId === `copy-${key.uuid || key.id}` ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {purchases.length === 0 && remnaKeys.length === 0 && !error && (
        <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-gray-200">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Нет активных ключей. Выберите подписку выше.</p>
        </div>
      )}

      {/* Fallback: Show Local Purchases if Remnawave Keys Not Available */}
      {purchases.length > 0 && remnaKeys.length === 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ваши активные ключи</h2>
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const expired = isKeyExpired(purchase.expires_at);
              return (
                <div
                  key={purchase.id}
                  className={`bg-white/60 backdrop-blur-xl rounded-xl border p-6 transition-all ${expired
                    ? "border-red-200/50 bg-red-50/30"
                    : "border-gray-200/50"
                    }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {purchase.package_name}
                        </h3>
                        {expired && (
                          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            Истёк
                          </span>
                        )}
                        {!expired && (
                          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Активен
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>до {formatDate(purchase.expires_at)}</span>
                        </div>
                        {purchase.price && (
                          <span className="font-medium text-gray-900">
                            {purchase.price} ₽
                          </span>
                        )}
                      </div>

                      {/* Inbound ID / Username */}
                      {purchase.remnawave_inbound_id && (
                        <div className="mt-3 p-3 bg-gray-100/60 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Идентификатор ключа:</p>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-900 flex-1 break-all">
                              {purchase.remnawave_inbound_id}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  purchase.remnawave_inbound_id,
                                  `copy-${purchase.id}`
                                )
                              }
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                              title="Скопировать"
                            >
                              {copiedId === `copy-${purchase.id}` ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {purchases.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            У вас пока нет активных ключей
          </h3>
          <p className="text-gray-600">Выберите подписку выше, чтобы получить доступ</p>
        </div>
      )}
    </div>
  );
}
