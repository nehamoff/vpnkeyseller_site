const API_BASE = import.meta.env.VITE_API_URL || "/api";

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
    return request<{ user: { id: number; email: string; email_verified: boolean } }>(
      "/auth/me",
    );
  },

  health() {
    return request<{ ok: boolean }>("/health");
  },
};

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
