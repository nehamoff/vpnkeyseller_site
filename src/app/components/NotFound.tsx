import { useNavigate } from "react-router";
import { Home } from "lucide-react";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 p-12">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Страница не найдена</h2>
        <p className="text-gray-600 mb-8">К сожалению, запрашиваемая страница не существует</p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Home className="w-5 h-5" />
          Вернуться на главную
        </button>
      </div>
    </div>
  );
}
