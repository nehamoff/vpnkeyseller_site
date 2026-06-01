import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Logo } from "./Logo";
import { TelegramLoginWidget, getUserDisplayName } from "./TelegramLoginWidget";
import { authApi, saveSession, ApiError } from "../../lib/api";

const TELEGRAM_BOT = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Login attempt:", { email, password });
      const result = await authApi.login(email, password);
      console.log("Login result:", result);
      saveSession(result.token, result.user.email);
      console.log("Session saved. Token in localStorage:", localStorage.getItem("vpn_token")?.substring(0, 50));
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof ApiError ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramAuth = async (data: Parameters<typeof authApi.telegramAuth>[0]) => {
    setError("");
    setTgLoading(true);
    try {
      const result = await authApi.telegramAuth(data);
      saveSession(result.token, getUserDisplayName(result.user));
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка входа через Telegram");
    } finally {
      setTgLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError("Введите email для отправки кода подтверждения");
      return;
    }

    setResendLoading(true);
    setError("");
    setResendSuccess(false);

    try {
      await authApi.resendCode(email);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить код");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-white/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-gray-300/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-4 shadow-2xl" />
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Кофемания VPN</h1>
          <p className="text-gray-600">Ваш надежный VPN сервис</p>
        </div>

        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Вход</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
            )}

            {resendSuccess && (
              <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                Код подтверждения отправлен на ваш email
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Войти
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading}
              className="w-full mt-2 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            >
              {resendLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Отправить код подтверждения
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/60 text-gray-500">или</span>
            </div>
          </div>

          <div className="relative min-h-[48px] flex items-center justify-center">
            {tgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl z-10">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            )}
            <TelegramLoginWidget botUsername={TELEGRAM_BOT} onAuth={handleTelegramAuth} />
          </div>

          <p className="text-center mt-6 text-gray-600">
            Нет аккаунта?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-gray-900 font-semibold hover:underline"
            >
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
