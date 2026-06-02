const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface UserProfile {
  id: number;
  email: string;
  email_verified: boolean;
  telegram_id: string | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  created_at: string;
}

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getConnectionError(status: number) {
  if (status === 0) {
    return "Сервер недоступен. Запустите backend: cd server && npm run dev";
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return "Backend не отвечает. Проверьте, что сервер запущен (cd server && npm run dev) и база данных доступна.";
  }
  return `Ошибка сервера (${status})`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("vpn_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(getConnectionError(0), 0);
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : getConnectionError(response.status);
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const authApi = {
  register(email: string, password: string) {
    return request<{ message: string; email: string; expiresInMinutes: number }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
  },

  verify(email: string, code: string) {
    return request<{ token: string; user: { id: number; email: string } }>(
      "/auth/verify",
      {
        method: "POST",
        body: JSON.stringify({ email, code }),
      },
    );
  },

  resendCode(email: string) {
    return request<{ message: string; expiresInMinutes: number }>(
      "/auth/resend-code",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
  },

  login(email: string, password: string) {
    return request<{ token: string; user: { id: number; email: string } }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
  },

  me() {
    return request<{ user: UserProfile }>("/auth/me");
  },

  linkTelegram(data: TelegramAuthData) {
    return request<{ message: string; user: UserProfile }>("/auth/telegram/link", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  subscriptions() {
    return request<{
      linked: boolean;
      configured: boolean;
      subscriptions: Record<string, unknown>[];
    }>("/auth/subscriptions");
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  requestEmailChange(newEmail: string, password: string) {
    return request<{ message: string; newEmail: string; expiresInMinutes: number }>(
      "/auth/change-email/request",
      {
        method: "POST",
        body: JSON.stringify({ newEmail, password }),
      },
    );
  },

  verifyEmailChange(code: string) {
    return request<{ message: string; token: string; user: { id: number; email: string } }>(
      "/auth/change-email/verify",
      {
        method: "POST",
        body: JSON.stringify({ code }),
      },
    );
  },

  health() {
    return request<{ ok: boolean }>("/health");
  },
};

export const AUTH_REDIRECT_KEY = "vpn_auth_redirect";

/** Путь возврата после оплаты ЮKassa (относительный). */
export function getPaymentReturnPath(): string {
  return "/my-keys?payment=return";
}

export function setPostAuthRedirect(path: string) {
  if (path.startsWith("/") && !path.startsWith("//")) {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
  }
}

export function consumePostAuthRedirect(fallback = "/"): string {
  const path = sessionStorage.getItem(AUTH_REDIRECT_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return fallback;
}

export function saveSession(token: string, email: string) {
  localStorage.setItem("vpn_token", token);
  localStorage.setItem("vpn_authenticated", "true");
  localStorage.setItem("vpn_user_email", email);
}

export function clearSession() {
  localStorage.removeItem("vpn_token");
  localStorage.removeItem("vpn_authenticated");
  localStorage.removeItem("vpn_user_email");
}
