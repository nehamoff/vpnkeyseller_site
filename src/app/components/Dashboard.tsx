import { useEffect, useState } from "react";
import { Mail, Lock, Send, History, Edit2, Save, X, Loader2, CheckCircle2, Calendar } from "lucide-react";
import { authApi, ApiError } from "../../lib/api";

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function Dashboard() {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => {
        setEmail(user.email);
        setMemberSince(formatDate(user.created_at));
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить профиль");
      })
      .finally(() => setLoading(false));
  }, []);

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    resetPasswordForm();
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!newPassword) {
      setError("Введите новый пароль");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Новые пароли не совпадают");
      return;
    }

    if (!currentPassword) {
      setError("Введите текущий пароль");
      return;
    }

    setSaving(true);
    try {
      const result = await authApi.changePassword(currentPassword, newPassword);
      setSuccess(result.message);
      setIsEditing(false);
      resetPasswordForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось изменить пароль");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Профиль</h2>
          {!isEditing ? (
            <button
              onClick={() => {
                setIsEditing(true);
                setError("");
                setSuccess("");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <Edit2 className="w-4 h-4" />
              Сменить пароль
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Сохранить
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:shadow-lg transition-all disabled:opacity-60"
              >
                <X className="w-4 h-4" />
                Отмена
              </button>
            </div>
          )}
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                readOnly
                disabled
                className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl opacity-80 cursor-not-allowed"
              />
            </div>
          </div>

          {memberSince && (
            <div>
              <label className="block text-sm text-gray-700 mb-2">Дата регистрации</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={memberSince}
                  readOnly
                  disabled
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl opacity-80 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {isEditing && (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Текущий пароль</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-all"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Новый пароль</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-all"
                    placeholder="Минимум 8 символов"
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Подтвердите новый пароль</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-all"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                После смены пароля на ваш email придёт уведомление.
              </p>
            </>
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
            </div>
          </div>
        </div>
      </div>

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
