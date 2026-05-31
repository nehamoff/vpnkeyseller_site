import { useState } from "react";
import { Key, ChevronDown, ChevronUp, Smartphone, HardDrive, Plus, Clock } from "lucide-react";

interface VPNKey {
  id: string;
  name: string;
  plan: string;
  expiresAt: string;
  devices: number;
  maxDevices: number;
  trafficUsed: number;
  trafficTotal: number;
  key: string;
}

const mockKeys: VPNKey[] = [
  {
    id: "1",
    name: "Мой основной ключ",
    plan: "Стандарт",
    expiresAt: "2026-06-30",
    devices: 2,
    maxDevices: 3,
    trafficUsed: 45.5,
    trafficTotal: 100,
    key: "vpn://connect/abc123def456",
  },
];

const plans = [
  {
    name: "Базовый",
    price: "299 ₽",
    period: "месяц",
    devices: 1,
    traffic: "50 ГБ",
    features: ["1 устройство", "50 ГБ трафика", "Базовая поддержка"],
  },
  {
    name: "Стандарт",
    price: "599 ₽",
    period: "месяц",
    devices: 3,
    traffic: "100 ГБ",
    features: ["3 устройства", "100 ГБ трафика", "Приоритетная поддержка", "Безлимитная скорость"],
    popular: true,
  },
  {
    name: "Премиум",
    price: "999 ₽",
    period: "месяц",
    devices: 5,
    traffic: "Безлимит",
    features: [
      "5 устройств",
      "Безлимитный трафик",
      "VIP поддержка 24/7",
      "Максимальная скорость",
      "Доступ к эксклюзивным серверам",
    ],
  },
];

export function MyKeys() {
  const [keys, setKeys] = useState<VPNKey[]>(mockKeys);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [showPlans, setShowPlans] = useState(keys.length === 0);

  const toggleKeyExpand = (id: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedKeys(newExpanded);
  };

  const handleBuyPlan = (planName: string) => {
    alert(`Покупка плана: ${planName}`);
  };

  if (showPlans || keys.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">
            {keys.length === 0 ? "У вас нет активных ключей" : "Выберите тариф"}
          </h2>
          <p className="text-gray-600">Выберите подходящий тариф для вашего VPN</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border p-8 relative transition-all hover:scale-105 ${
                plan.popular
                  ? "border-gray-900 ring-2 ring-gray-900/20"
                  : "border-gray-200/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Популярный
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">/ {plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-gray-700">
                    <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuyPlan(plan.name)}
                className={`w-full py-3 rounded-xl transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:shadow-lg"
                    : "bg-white/80 border border-gray-200 text-gray-900 hover:shadow-lg"
                }`}
              >
                Купить
              </button>
            </div>
          ))}
        </div>

        {keys.length > 0 && (
          <div className="text-center">
            <button
              onClick={() => setShowPlans(false)}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:shadow-lg transition-all"
            >
              Вернуться к моим ключам
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Мои VPN ключи</h2>
        <button
          onClick={() => setShowPlans(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Купить новый ключ
        </button>
      </div>

      <div className="space-y-4">
        {keys.map((key) => {
          const isExpanded = expandedKeys.has(key.id);
          const trafficPercent = (key.trafficUsed / key.trafficTotal) * 100;

          return (
            <div
              key={key.id}
              className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden"
            >
              <button
                onClick={() => toggleKeyExpand(key.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-white/40 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{key.name}</h3>
                    <p className="text-sm text-gray-600">Тариф: {key.plan}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Истекает</p>
                    <p className="font-semibold text-gray-900">{key.expiresAt}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-6 h-6 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 space-y-6 border-t border-gray-200/50 pt-6">
                  <div className="bg-white/80 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-700">Устройства</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {key.devices} / {key.maxDevices}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-700">Трафик</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {key.trafficUsed} / {key.trafficTotal} ГБ
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-gray-700 to-gray-900 h-full rounded-full transition-all"
                          style={{ width: `${trafficPercent}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Ключ подключения</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={key.key}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg font-mono text-sm"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(key.key);
                            alert("Ключ скопирован!");
                          }}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:shadow-lg transition-all"
                        >
                          Копировать
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:shadow-lg transition-all">
                      <Clock className="w-5 h-5" />
                      Продлить
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/80 border border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all">
                      <Plus className="w-5 h-5" />
                      Докупить трафик
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
