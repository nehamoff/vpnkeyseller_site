import { Mail, FileText, Shield, ExternalLink } from "lucide-react";

export function About() {
  const links = [
    { icon: Mail, label: "Email", value: "support@coffemania-vpn.ru", href: "mailto:support@coffemania-vpn.ru" },
    { icon: FileText, label: "Пользовательское соглашение", href: "#" },
    { icon: FileText, label: "Политика конфиденциальности", href: "#" },
    { icon: Shield, label: "Условия использования", href: "#" },
  ];

  const legalInfo = [
    { label: "Название компании", value: 'ООО "Кофемания ВПН"' },
    { label: "ИНН", value: "1234567890" },
    { label: "ОГРН", value: "1234567890123" },
    { label: "Юридический адрес", value: "г. Москва, ул. Примерная, д. 1, офис 100" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="surface-card-lg backdrop-blur-xl rounded-3xl p-8">
        <h2 className="text-2xl font-semibold text-coffee-espresso mb-6">О сервисе</h2>
        <div className="prose prose-gray">
          <p className="text-coffee-espresso/80 leading-relaxed">
            Кофемания VPN — это надежный и безопасный VPN-сервис, который обеспечивает конфиденциальность
            вашего интернет-соединения. Мы используем современные технологии шифрования для защиты ваших
            данных и обеспечения свободного доступа к интернету.
          </p>
          <p className="text-coffee-espresso/80 leading-relaxed mt-4">
            Наша миссия — сделать интернет открытым и безопасным для каждого пользователя. Мы не храним
            логи активности и гарантируем полную анонимность при использовании нашего сервиса.
          </p>
        </div>
      </div>

      <div className="surface-card-lg backdrop-blur-xl rounded-3xl p-8">
        <h2 className="text-2xl font-semibold text-coffee-espresso mb-6">Контакты и документы</h2>
        <div className="space-y-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center justify-between bg-card border border-coffee-latte/50 shadow-coffee rounded-xl p-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-coffee-mocha" />
                  <div>
                    <p className="font-semibold text-coffee-espresso">{link.label}</p>
                    {link.value && <p className="text-sm text-coffee-mocha">{link.value}</p>}
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-coffee-latte group-hover:text-coffee-espresso transition-colors" />
              </a>
            );
          })}
        </div>
      </div>

      <div className="surface-card-lg backdrop-blur-xl rounded-3xl p-8">
        <h2 className="text-2xl font-semibold text-coffee-espresso mb-6">Юридическая информация</h2>
        <div className="space-y-4">
          {legalInfo.map((info) => (
            <div
              key={info.label}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-card border border-coffee-latte/50 shadow-coffee rounded-xl p-4"
            >
              <span className="text-coffee-mocha mb-1 sm:mb-0">{info.label}</span>
              <span className="font-semibold text-coffee-espresso">{info.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-coffee-espresso to-coffee-espresso/90 rounded-3xl shadow-xl p-8 text-white text-center">
        <h3 className="text-xl font-semibold mb-2">Нужна помощь?</h3>
        <p className="text-coffee-cappuccino mb-4">Свяжитесь с нашей службой поддержки</p>
        <a
          href="mailto:support@coffemania-vpn.ru"
          className="inline-block px-6 py-3 bg-card text-coffee-espresso rounded-xl hover:shadow-lg transition-all"
        >
          Написать в поддержку
        </a>
      </div>
    </div>
  );
}
