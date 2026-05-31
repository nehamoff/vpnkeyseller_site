import { useEffect, useState } from "react";
import {
  Mail,
  Lock,
  Send,
  History,
  Edit2,
  X,
  Loader2,
  CheckCircle2,
  Calendar,
  KeyRound,
  ChevronRight,
  Shield,
  User,
  Link2,
} from "lucide-react";
import { authApi, saveSession, ApiError, type UserProfile } from "../../lib/api";
import {
  TelegramLoginWidget,
  getUserDisplayName,
  isRealEmail,
} from "./TelegramLoginWidget";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "./ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const TELEGRAM_BOT = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";

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

function Alert({ type, message }: { type: "success" | "error"; message: string }) {
  if (type === "success") {
    return (
      <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-xl">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{message}</span>
      </div>
    );
  }
  return <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{message}</div>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white/80 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <p className="text-gray-900 font-medium truncate">{value}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function Dashboard() {
  const [isEditing, setIsEditing] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramLabel, setTelegramLabel] = useState("Не подключен");
  const [hasRealEmail, setHasRealEmail] = useState(true);

  const [subscriptions, setSubscriptions] = useState<Record<string, unknown>[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [remnawaveConfigured, setRemnawaveConfigured] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"form" | "verify">("form");
  const [pendingNewEmail, setPendingNewEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [telegramLinkError, setTelegramLinkError] = useState("");
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const loadProfile = () =>
    authApi.me().then(({ user }) => {
      setProfile(user);
      setEmail(user.email);
      setDisplayName(getUserDisplayName(user));
      setMemberSince(formatDate(user.created_at));
      setHasRealEmail(isRealEmail(user.email));
      setTelegramLinked(Boolean(user.telegram_id));
      setTelegramLabel(
        user.telegram_username
          ? `@${user.telegram_username} · привязан`
          : user.telegram_id
            ? `${user.telegram_first_name || "Telegram"} · привязан`
            : "Не подключен",
      );
    });

  const loadSubscriptions = () => {
    setSubscriptionsLoading(true);
    return authApi
      .subscriptions()
      .then((data) => {
        setRemnawaveConfigured(data.configured);
        setSubscriptions(data.subscriptions);
      })
      .catch(() => setSubscriptions([]))
      .finally(() => setSubscriptionsLoading(false));
  };

  useEffect(() => {
    loadProfile()
      .catch((err) => {
        setProfileError(err instanceof ApiError ? err.message : "Не удалось загрузить профиль");
      })
      .finally(() => setLoading(false));

    loadSubscriptions();
  }, []);

  const resetEmailDialog = () => {
    setNewEmail("");
    setEmailPassword("");
    setEmailCode("");
    setEmailStep("form");
    setPendingNewEmail("");
    setEmailError("");
    setEmailSuccess("");
  };

  const resetPasswordDialog = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  const openEmailDialog = () => {
    resetEmailDialog();
    setEmailDialogOpen(true);
  };

  const openPasswordDialog = () => {
    resetPasswordDialog();
    setPasswordDialogOpen(true);
  };

  const handleRequestEmailChange = async () => {
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail.trim()) {
      setEmailError("Введите новый email");
      return;
    }

    if (newEmail.trim().toLowerCase() === email.toLowerCase()) {
      setEmailError("Новый email совпадает с текущим");
      return;
    }

    if (!emailPassword) {
      setEmailError("Введите текущий пароль");
      return;
    }

    setSavingEmail(true);
    try {
      const result = await authApi.requestEmailChange(newEmail, emailPassword);
      setEmailStep("verify");
      setPendingNewEmail(result.newEmail);
      setEmailCode("");
      setEmailSuccess(`Код отправлен на ${result.newEmail}`);
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : "Не удалось отправить код");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    setEmailError("");
    setEmailSuccess("");

    if (emailCode.length !== 6) {
      setEmailError("Введите 6-значный код");
      return;
    }

    setSavingEmail(true);
    try {
      const result = await authApi.verifyEmailChange(emailCode);
      saveSession(result.token, result.user.email);
      setEmail(result.user.email);
      setProfileSuccess("Email успешно изменён");
      setEmailDialogOpen(false);
      resetEmailDialog();
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : "Не удалось подтвердить email");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Введите текущий пароль");
      return;
    }

    if (!newPassword) {
      setPasswordError("Введите новый пароль");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }

    setSavingPassword(true);
    try {
      const result = await authApi.changePassword(currentPassword, newPassword);
      setProfileSuccess(result.message);
      setPasswordDialogOpen(false);
      resetPasswordDialog();
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Не удалось изменить пароль");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLinkTelegram = async (data: Parameters<typeof authApi.linkTelegram>[0]) => {
    setTelegramLinkError("");
    setTelegramLinkLoading(true);
    try {
      const result = await authApi.linkTelegram(data);
      saveSession(localStorage.getItem("vpn_token") || "", getUserDisplayName(result.user));
      await loadProfile();
      await loadSubscriptions();
      setProfileSuccess(result.message);
      setTelegramDialogOpen(false);
    } catch (err) {
      setTelegramLinkError(err instanceof ApiError ? err.message : "Не удалось привязать Telegram");
    } finally {
      setTelegramLinkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const emailInitial = (displayName || email).charAt(0).toUpperCase();
  const emailDisplay = hasRealEmail ? email : "Не указан";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile header card */}
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 p-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white text-2xl font-semibold shadow-lg">
              {emailInitial}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Личный кабинет</h2>
              <p className="text-gray-500 text-sm mt-1">{displayName}</p>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={() => {
                setIsEditing(true);
                setProfileError("");
                setProfileSuccess("");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:shadow-lg transition-all shrink-0"
            >
              <Edit2 className="w-4 h-4" />
              Редактировать
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:shadow-lg transition-all shrink-0"
            >
              <X className="w-4 h-4" />
              Готово
            </button>
          )}
        </div>

        {profileSuccess && <div className="mb-4"><Alert type="success" message={profileSuccess} /></div>}
        {profileError && <div className="mb-4"><Alert type="error" message={profileError} /></div>}

        <div className="space-y-3">
          <InfoRow icon={Mail} label="Email" value={emailDisplay} />
          <InfoRow icon={Calendar} label="Дата регистрации" value={memberSince} />
          <InfoRow icon={Send} label="Telegram" value={telegramLabel} />
          {hasRealEmail && <InfoRow icon={Lock} label="Пароль" value="••••••••" />}
        </div>

        {/* Security edit panel */}
        {isEditing && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Безопасность аккаунта</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Управляйте данными аккаунта и привязками.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {hasRealEmail && (
                <button
                  onClick={openEmailDialog}
                  className="flex items-center justify-between gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Сменить Email</p>
                      <p className="text-xs text-gray-500 mt-0.5">Подтверждение кодом</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
                </button>
              )}

              {hasRealEmail && (
                <button
                  onClick={openPasswordDialog}
                  className="flex items-center justify-between gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Сменить пароль</p>
                      <p className="text-xs text-gray-500 mt-0.5">Уведомление на почту</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
                </button>
              )}

              {!telegramLinked && (
                <button
                  onClick={() => {
                    setTelegramLinkError("");
                    setTelegramDialogOpen(true);
                  }}
                  className="flex items-center justify-between gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all text-left group sm:col-span-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Привязать Telegram</p>
                      <p className="text-xs text-gray-500 mt-0.5">Для доступа к подпискам Remnawave</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Change Email Dialog */}
      <Dialog
        open={emailDialogOpen}
        onOpenChange={(open) => {
          setEmailDialogOpen(open);
          if (!open) resetEmailDialog();
        }}
      >
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Сменить Email
            </DialogTitle>
            <DialogDescription>
              {emailStep === "form"
                ? "Укажите новый email и текущий пароль. Код подтверждения придёт на новый адрес."
                : `Введите код из письма, отправленного на ${pendingNewEmail}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {emailSuccess && <Alert type="success" message={emailSuccess} />}
            {emailError && <Alert type="error" message={emailError} />}

            {emailStep === "form" ? (
              <>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Текущий email</label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-sm">
                    <User className="w-4 h-4 shrink-0" />
                    {email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Новый email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      placeholder="new@email.com"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Текущий пароль</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      placeholder="Для подтверждения"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRequestEmailChange}
                  disabled={savingEmail}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {savingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                  Отправить код
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-center py-2">
                  <InputOTP maxLength={6} value={emailCode} onChange={setEmailCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <button
                  onClick={handleVerifyEmailChange}
                  disabled={savingEmail || emailCode.length !== 6}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {savingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                  Подтвердить
                </button>

                <button
                  onClick={() => {
                    setEmailStep("form");
                    setEmailCode("");
                    setPendingNewEmail("");
                    setEmailSuccess("");
                    setEmailError("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-800 py-1"
                >
                  ← Вернуться к вводу email
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) resetPasswordDialog();
        }}
      >
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Сменить пароль
            </DialogTitle>
            <DialogDescription>
              После смены пароля на {email} придёт уведомление.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {passwordSuccess && <Alert type="success" message={passwordSuccess} />}
            {passwordError && <Alert type="error" message={passwordError} />}

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Текущий пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  autoComplete="current-password"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Новый пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  placeholder="Минимум 8 символов"
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Подтвердите пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="w-full bg-gray-900 text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить пароль
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Telegram Dialog */}
      <Dialog
        open={telegramDialogOpen}
        onOpenChange={(open) => {
          setTelegramDialogOpen(open);
          if (!open) setTelegramLinkError("");
        }}
      >
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Привязать Telegram
            </DialogTitle>
            <DialogDescription>
              Нажмите кнопку ниже и подтвердите доступ. Это нужно для загрузки VPN-подписок из Remnawave.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {telegramLinkError && <Alert type="error" message={telegramLinkError} />}
            <div className="relative min-h-[48px] flex items-center justify-center">
              {telegramLinkLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              )}
              <TelegramLoginWidget botUsername={TELEGRAM_BOT} onAuth={handleLinkTelegram} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscriptions from Remnawave */}
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-semibold text-gray-900">Активные подписки</h2>
        </div>

        {subscriptionsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : !telegramLinked ? (
          <div className="text-center py-8 text-gray-500">
            <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Привяжите Telegram, чтобы видеть подписки</p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 text-sm text-gray-900 font-medium hover:underline"
            >
              Перейти к настройкам
            </button>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Активных подписок не найдено</p>
            {!remnawaveConfigured && (
              <p className="text-xs mt-2 text-amber-600">Remnawave API не настроен на сервере</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub, index) => {
              const name = String(sub.username ?? sub.name ?? sub.plan ?? `Подписка ${index + 1}`);
              const status = String(sub.status ?? sub.state ?? "—");
              const expires = sub.expireAt ?? sub.expires_at ?? sub.expire_at;
              return (
                <div
                  key={String(sub.uuid ?? sub.id ?? index)}
                  className="flex items-center justify-between bg-white/80 border border-gray-200 rounded-xl p-4"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{name}</h3>
                    {expires && (
                      <p className="text-sm text-gray-600">
                        до {formatDate(String(expires))}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-green-600">{status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase history (mock) */}
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
