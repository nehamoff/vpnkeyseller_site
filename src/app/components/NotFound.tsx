import { useNavigate } from "react-router";
import { Home } from "lucide-react";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="surface-card-lg backdrop-blur-xl rounded-3xl p-12">
        <h1 className="text-6xl font-bold text-coffee-espresso mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-coffee-espresso/80 mb-4">Страница не найдена</h2>
        <p className="text-coffee-mocha mb-8">К сожалению, запрашиваемая страница не существует</p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-coffee-espresso to-coffee-espresso/90 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Home className="w-5 h-5" />
          Вернуться на главную
        </button>
      </div>
    </div>
  );
}
