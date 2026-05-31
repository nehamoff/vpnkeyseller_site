import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { saveSession } from "../../lib/api";

export function TelegramCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const err = searchParams.get("error");

    if (err) {
      setError("Не удалось войти через Telegram");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    if (token) {
      localStorage.setItem("vpn_token", token);
      localStorage.setItem("vpn_authenticated", "true");
      navigate("/");
      return;
    }

    setError("Токен не получен");
    setTimeout(() => navigate("/login"), 2000);
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-gray-500 mx-auto" />
            <p className="text-gray-600">Вход через Telegram...</p>
          </>
        )}
      </div>
    </div>
  );
}
