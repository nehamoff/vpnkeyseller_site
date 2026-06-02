import { useEffect, useRef } from "react";

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

interface TelegramLoginWidgetProps {
  botUsername: string;
  onAuth: (user: TelegramAuthData) => void;
  className?: string;
}

export function TelegramLoginWidget({ botUsername, onAuth, className }: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    if (!botUsername || !containerRef.current) return;

    window.onTelegramAuth = (user) => {
      onAuthRef.current(user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    const container = containerRef.current;
    container.innerHTML = "";
    container.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      container.innerHTML = "";
    };
  }, [botUsername]);

  if (!botUsername) {
    return (
      <p className="text-sm text-coffee-mocha/90 text-center py-2">
        Telegram-бот не настроен (TELEGRAM_BOT_USERNAME)
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex justify-center [&>iframe]:rounded-xl ${className ?? ""}`}
    />
  );
}

export function getUserDisplayName(user: {
  email: string;
  telegram_username?: string | null;
  telegram_first_name?: string | null;
}) {
  if (user.telegram_username) return `@${user.telegram_username}`;
  if (user.telegram_first_name) return user.telegram_first_name;
  if (user.email.endsWith("@telegram.local")) return "Telegram аккаунт";
  return user.email;
}

export function isRealEmail(email: string) {
  return !email.endsWith("@telegram.local");
}
