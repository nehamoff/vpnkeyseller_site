import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Logo } from "./Logo";
import { authApi, saveSession, ApiError } from "../../lib/api";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authApi.login(email, password);
      saveSession(result.token, result.user.email);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-coffee-milk via-coffee-cappuccino/40 to-coffee-latte/30 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-coffee-milk/50 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-coffee-mocha/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-4 shadow-2xl" />
          <h1 className="text-3xl font-semibold text-coffee-espresso mb-2">Кофемания VPN</h1>
          <p className="text-coffee-mocha">Ваш надежный VPN сервис</p>
        </div>

        <div className="surface-card-lg backdrop-blur-xl rounded-3xl p-8">
          <h2 className="text-2xl font-semibold text-coffee-espresso mb-6">Вход</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-coffee-espresso/80 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-latte" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-card border border-coffee-latte/50 shadow-coffee rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20 transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-coffee-espresso/80 mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-latte" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-card border border-coffee-latte/50 shadow-coffee rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20 transition-all"
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
              className="w-full bg-gradient-to-r from-coffee-espresso to-coffee-espresso/90 text-white py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Войти
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading}
              className="w-full mt-2 bg-coffee-cappuccino text-coffee-espresso py-3 rounded-xl hover:bg-coffee-latte transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            >
              {resendLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Отправить код подтверждения
            </button>
          </form>

          <p className="text-center mt-6 text-coffee-mocha">
            Нет аккаунта?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-coffee-espresso font-semibold hover:underline"
            >
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
