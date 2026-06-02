import { useEffect, useState } from "react";
import {
  Mail,
  Lock,
  Send,
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
import bannerTg from "../../../photo/bannertg.png";

const TELEGRAM_BOT = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";
const TELEGRAM_BOT_BANNER_URL = "https://t.me/coffemaniaVPNbot?start=17";

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
    <div className="flex items-center justify-between gap-4 bg-card border border-coffee-latte/50 shadow-coffee rounded-xl p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-coffee-cappuccino/60 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-coffee-mocha" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-coffee-mocha/90 mb-0.5">{label}</p>
          <p className="text-coffee-espresso font-medium truncate">{value}</p>
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

  useEffect(() => {
    loadProfile()
      .catch((err) => {
        setProfileError(err instanceof ApiError ? err.message : "Не удалось загрузить профиль");
      })
      .finally(() => setLoading(false));
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
        <Loader2 className="w-8 h-8 animate-spin text-coffee-mocha/90" />
      </div>
    );
  }

  const emailInitial = (displayName || email).charAt(0).toUpperCase();
  const emailDisplay = hasRealEmail ? email : "Не указан";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile header card */}
      <div className="surface-card-lg backdrop-blur-xl rounded-3xl p-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coffee-espresso to-coffee-espresso/90 flex items-center justify-center text-white text-2xl font-semibold shadow-lg">
              {emailInitial}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-coffee-espresso">Личный кабинет</h2>
              <p className="text-coffee-mocha/90 text-sm mt-1">{displayName}</p>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={() => {
                setIsEditing(true);
                setProfileError("");
                setProfileSuccess("");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-coffee-espresso text-white rounded-xl hover:shadow-lg transition-all shrink-0"
            >
              <Edit2 className="w-4 h-4" />
              Редактировать
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 bg-coffee-cappuccino text-coffee-espresso/80 rounded-xl hover:shadow-lg transition-all shrink-0"
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
          <div className="mt-6 pt-6 border-t border-coffee-latte/50">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-coffee-espresso/80" />
              <h3 className="text-lg font-semibold text-coffee-espresso">Безопасность аккаунта</h3>
            </div>
            <p className="text-sm text-coffee-mocha/90 mb-4">
              Управляйте данными аккаунта и привязками.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {hasRealEmail && (
                <button
                  onClick={openEmailDialog}
                  className="flex items-center justify-between gap-3 p-4 bg-card border border-coffee-latte/50 rounded-xl hover:border-coffee-mocha hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-coffee-espresso">Сменить Email</p>
                      <p className="text-xs text-coffee-mocha/90 mt-0.5">Подтверждение кодом</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-coffee-latte group-hover:text-coffee-espresso/80 transition-colors" />
                </button>
              )}

              {hasRealEmail && (
                <button
                  onClick={openPasswordDialog}
                  className="flex items-center justify-between gap-3 p-4 bg-card border border-coffee-latte/50 rounded-xl hover:border-coffee-mocha hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-coffee-espresso">Сменить пароль</p>
                      <p className="text-xs text-coffee-mocha/90 mt-0.5">Уведомление на почту</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-coffee-latte group-hover:text-coffee-espresso/80 transition-colors" />
                </button>
              )}

              {!telegramLinked && (
                <button
                  onClick={() => {
                    setTelegramLinkError("");
                    setTelegramDialogOpen(true);
                  }}
                  className="flex items-center justify-between gap-3 p-4 bg-card border border-coffee-latte/50 rounded-xl hover:border-coffee-mocha hover:shadow-md transition-all text-left group sm:col-span-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <p className="font-medium text-coffee-espresso">Привязать Telegram</p>
                      <p className="text-xs text-coffee-mocha/90 mt-0.5">Для доступа к подпискам Remnawave</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-coffee-latte group-hover:text-coffee-espresso/80 transition-colors" />
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
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl rounded-2xl">
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
                  <label className="block text-sm text-coffee-espresso/80 mb-1.5">Текущий email</label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-coffee-cappuccino/40 border border-coffee-latte/50 rounded-xl text-coffee-mocha text-sm">
                    <User className="w-4 h-4 shrink-0" />
                    {email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-coffee-espresso/80 mb-1.5">Новый email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-latte" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-card border border-coffee-latte/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20"
                      placeholder="new@email.com"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-coffee-espresso/80 mb-1.5">Текущий пароль</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-latte" />
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-card border border-coffee-latte/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20"
                      placeholder="Для подтверждения"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRequestEmailChange}
                  disabled={savingEmail}
                  className="w-full bg-coffee-espresso text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
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
                  className="w-full bg-coffee-espresso text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
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
                  className="w-full text-sm text-coffee-mocha/90 hover:text-coffee-espresso py-1"
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
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl rounded-2xl">
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
              <label className="block text-sm text-coffee-espresso/80 mb-1.5">Текущий пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-latte" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-card border border-coffee-latte/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20"
                  autoComplete="current-password"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-coffee-espresso/80 mb-1.5">Новый пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-latte" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-card border border-coffee-latte/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20"
                  placeholder="Минимум 8 символов"
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-coffee-espresso/80 mb-1.5">Подтвердите пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-latte" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-card border border-coffee-latte/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="w-full bg-coffee-espresso text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
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
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl rounded-2xl">
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
                <div className="absolute inset-0 flex items-center justify-center surface-card rounded-xl z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-coffee-mocha" />
                </div>
              )}
              <TelegramLoginWidget botUsername={TELEGRAM_BOT} onAuth={handleLinkTelegram} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <a
        href={TELEGRAM_BOT_BANNER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-3xl overflow-hidden border border-coffee-latte/40 shadow-coffee-lg hover:shadow-coffee-xl hover:border-coffee-mocha/30 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coffee-espresso focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Открыть Telegram-бот Кофемания VPN"
      >
        <img
          src={bannerTg}
          alt="Пользуйся нами в Телеграм — новости, поддержка и обновления в боте @coffemaniaVPNbot"
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
}
