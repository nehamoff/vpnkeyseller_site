import { useState } from "react";
import { Mail, FileText, ExternalLink, Send, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const SUPPORT_EMAIL = "coffeemaniavpn@gmail.com";
const TELEGRAM_SUPPORT_URL = "https://t.me/coffeemaniasup2";
const TERMS_URL = "https://telegra.ph/Polzovatelskoe-soglashenie-05-21-30";
const PRIVACY_URL = "https://telegra.ph/Politika-konfidencialnosti-05-21-29";

const contactLinks = [
  {
    icon: Send,
    label: "Поддержка в Telegram",
    value: "@coffeemaniasup2",
    href: TELEGRAM_SUPPORT_URL,
    external: true,
  },
  {
    icon: Mail,
    label: "Email",
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    external: false,
  },
  {
    icon: FileText,
    label: "Пользовательское соглашение",
    href: TERMS_URL,
    external: true,
  },
  {
    icon: FileText,
    label: "Политика конфиденциальности",
    href: PRIVACY_URL,
    external: true,
  },
];

export function About() {
  const [supportOpen, setSupportOpen] = useState(false);
  const [replyEmail, setReplyEmail] = useState("");
  const [subject, setSubject] = useState("Обращение в поддержку Кофемания VPN");
  const [message, setMessage] = useState("");

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    const body = [
      message.trim(),
      "",
      "---",
      replyEmail.trim() ? `Email для ответа: ${replyEmail.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject.trim() || "Поддержка")}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSupportOpen(false);
  };

  const resetSupportForm = () => {
    setReplyEmail("");
    setSubject("Обращение в поддержку Кофемания VPN");
    setMessage("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="surface-card-lg backdrop-blur-xl rounded-3xl p-8">
        <h2 className="text-2xl font-semibold text-coffee-espresso mb-6">О сервисе</h2>
        <div className="space-y-4 text-coffee-espresso/80 leading-relaxed">
          <p>
            Мы собрали команду экспертов, выбрали лучшие серверы и современные протоколы — чтобы вы
            просто пользовались интернетом, не думая о технической стороне.
          </p>
          <p>
            Наши серверы — одни из самых стабильных на рынке: без обрывов, без перегрузок.
            Современные протоколы обеспечивают максимальную скорость и устойчивость соединения в
            любых условиях. Сервис работает на любом устройстве и в любой стране — подключайтесь
            там, где вам удобно.
          </p>
        </div>
      </div>

      <div className="surface-card-lg backdrop-blur-xl rounded-3xl p-8">
        <h2 className="text-2xl font-semibold text-coffee-espresso mb-6">Контакты и документы</h2>
        <div className="space-y-3">
          {contactLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="flex items-center justify-between bg-card border border-coffee-latte/50 shadow-coffee rounded-xl p-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 text-coffee-mocha shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-coffee-espresso">{link.label}</p>
                    {"value" in link && link.value && (
                      <p className="text-sm text-coffee-mocha truncate">{link.value}</p>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-coffee-latte group-hover:text-coffee-espresso transition-colors shrink-0" />
              </a>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-r from-coffee-espresso to-coffee-espresso/90 rounded-3xl shadow-xl p-8 text-white text-center">
        <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-90" />
        <h3 className="text-xl font-semibold mb-2">Нужна поддержка?</h3>
        <p className="text-coffee-cappuccino mb-5 max-w-md mx-auto text-sm">
          Опишите вопрос — откроется письмо на {SUPPORT_EMAIL}. Мы ответим в рабочее время (8:00–00:00
          МСК).
        </p>
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-card text-coffee-espresso rounded-xl hover:shadow-lg transition-all font-semibold"
        >
          <Mail className="w-5 h-5" />
          Написать в поддержку
        </button>
      </div>

      <Dialog
        open={supportOpen}
        onOpenChange={(open) => {
          setSupportOpen(open);
          if (!open) resetSupportForm();
        }}
      >
        <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-coffee-espresso">Написать в поддержку</DialogTitle>
            <DialogDescription>
              Заполните форму и нажмите «Открыть почту» — письмо откроется в вашем почтовом
              приложении на адрес {SUPPORT_EMAIL}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendSupport} className="space-y-4 py-1">
            <div>
              <label className="block text-sm text-coffee-espresso/80 mb-1.5">
                Email для ответа (необязательно)
              </label>
              <input
                type="email"
                value={replyEmail}
                onChange={(e) => setReplyEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 bg-card border border-coffee-latte/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20"
              />
            </div>
            <div>
              <label className="block text-sm text-coffee-espresso/80 mb-1.5">Тема</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-card border border-coffee-latte/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20"
              />
            </div>
            <div>
              <label className="block text-sm text-coffee-espresso/80 mb-1.5">Сообщение</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="Опишите проблему или вопрос…"
                className="w-full px-4 py-2.5 bg-card border border-coffee-latte/50 rounded-xl resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-coffee-espresso/20"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="px-4 py-2.5 rounded-xl text-coffee-mocha hover:bg-coffee-cappuccino/50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-coffee-espresso text-coffee-milk font-semibold hover:bg-coffee-espresso/90 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Открыть почту
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
