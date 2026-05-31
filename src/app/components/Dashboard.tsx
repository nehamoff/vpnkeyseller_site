import { useState } from "react";
import { Mail, Lock, Send, History, Edit2, Save, X } from "lucide-react";

interface Purchase {
  id: string;
  plan: string;
  date: string;
  amount: string;
  status: string;
}

const mockPurchases: Purchase[] = [
  { id: "1", plan: "Базовый", date: "2026-05-15", amount: "299 ₽", status: "Активен" },
  { id: "2", plan: "Стандарт", date: "2026-04-10", amount: "599 ₽", status: "Завершен" },
  { id: "3", plan: "Премиум", date: "2026-03-05", amount: "999 ₽", status: "Завершен" },
];

export function Dashboard() {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState("user@example.com");
  const [newPassword, setNewPassword] = useState("");
  const [telegramConnected, setTelegramConnected] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    setNewPassword("");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile card */}
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Профиль</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <Edit2 className="w-4 h-4" />
              Редактировать
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setNewPassword("");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:shadow-lg transition-all"
              >
                <X className="w-4 h-4" />
                Отмена
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className={`w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl transition-all ${
                  isEditing
                    ? "focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    : "opacity-60 cursor-not-allowed"
                }`}
              />
            </div>
          </div>

          {isEditing && (
            <div>
              <label className="block text-sm text-gray-700 mb-2">Новый пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Оставьте пустым, чтобы не менять"
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-700 mb-2">Telegram</label>
            <div className="flex items-center justify-between bg-white/80 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">
                  {telegramConnected ? "@your_username" : "Не подключен"}
                </span>
              </div>
              {isEditing && (
                <button
                  onClick={() => setTelegramConnected(!telegramConnected)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    telegramConnected
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                  }`}
                >
                  {telegramConnected ? "Отключить" : "Подключить"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase history */}
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-semibold text-gray-900">История покупок</h2>
        </div>

        <div className="space-y-3">
          {mockPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between bg-white/80 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{purchase.plan}</h3>
                <p className="text-sm text-gray-600">{purchase.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{purchase.amount}</p>
                <p
                  className={`text-sm ${
                    purchase.status === "Активен" ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {purchase.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
