import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Send } from "lucide-react";
import { Logo } from "./Logo";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("vpn_authenticated", "true");
    navigate("/");
  };

  const handleTelegramLogin = () => {
    localStorage.setItem("vpn_authenticated", "true");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glass effect background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-white/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-gray-300/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-4 shadow-2xl" />
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Кофемания VPN</h1>
          <p className="text-gray-600">Ваш надежный VPN сервис</p>
        </div>

        {/* Login form */}
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

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Войти
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

          <button
            onClick={handleTelegramLogin}
            className="w-full bg-white/80 border border-gray-200 text-gray-800 py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Войти через Telegram
          </button>

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
