import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
}

export async function sendVerificationCode(email, code) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || "Кофемания VPN";

  await getTransporter().sendMail({
    from,
    to: email,
    subject: `${code} — код подтверждения ${appName}`,
    text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут.\n\nЕсли вы не регистрировались на ${appName}, просто проигнорируйте это письмо.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Подтверждение регистрации</h2>
        <p style="color: #444;">Ваш код подтверждения для <strong>${appName}</strong>:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111; margin: 24px 0;">${code}</p>
        <p style="color: #666; font-size: 14px;">Код действителен 10 минут.</p>
        <p style="color: #999; font-size: 12px;">Если вы не регистрировались, проигнорируйте это письмо.</p>
      </div>
    `,
  });
}

export async function sendEmailChangeCode(email, code) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || "Кофемания VPN";

  await getTransporter().sendMail({
    from,
    to: email,
    subject: `${code} — подтверждение смены email ${appName}`,
    text: `Код для смены email: ${code}\n\nКод действителен 10 минут.\n\nЕсли вы не запрашивали смену email, проигнорируйте это письмо.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Подтверждение смены email</h2>
        <p style="color: #444;">Код для подтверждения нового email в <strong>${appName}</strong>:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111; margin: 24px 0;">${code}</p>
        <p style="color: #666; font-size: 14px;">Код действителен 10 минут.</p>
        <p style="color: #999; font-size: 12px;">Если вы не меняли email, проигнорируйте это письмо.</p>
      </div>
    `,
  });
}

export async function sendEmailChangedNotification(oldEmail, newEmail) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || "Кофемания VPN";
  const changedAt = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

  const text = `Email вашего аккаунта изменён ${changedAt} (МСК).\nНовый email: ${newEmail}\n\nЕсли это были не вы, немедленно свяжитесь с поддержкой.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111;">Email изменён</h2>
      <p style="color: #444;">Email аккаунта был изменён на <strong>${newEmail}</strong>.</p>
      <p style="color: #666; font-size: 14px;">Дата и время: ${changedAt} (МСК)</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">Если вы не меняли email, немедленно свяжитесь с поддержкой.</p>
    </div>
  `;

  await Promise.all([
    getTransporter().sendMail({
      from,
      to: oldEmail,
      subject: `Email изменён — ${appName}`,
      text: `Старый email: ${oldEmail}\n${text}`,
      html,
    }),
    getTransporter().sendMail({
      from,
      to: newEmail,
      subject: `Email успешно изменён — ${appName}`,
      text: `Ваш новый email подтверждён.\n${text}`,
      html,
    }),
  ]);
}

export async function sendPasswordChangedNotification(email) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || "Кофемания VPN";
  const changedAt = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

  await getTransporter().sendMail({
    from,
    to: email,
    subject: `Пароль изменён — ${appName}`,
    text: `Пароль вашего аккаунта ${email} был успешно изменён ${changedAt} (МСК).\n\nЕсли это были не вы, немедленно свяжитесь с поддержкой.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Пароль изменён</h2>
        <p style="color: #444;">Пароль аккаунта <strong>${email}</strong> был успешно изменён.</p>
        <p style="color: #666; font-size: 14px;">Дата и время: ${changedAt} (МСК)</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">Если вы не меняли пароль, немедленно свяжитесь с поддержкой.</p>
      </div>
    `,
  });
}

function getMyKeysRenewUrl() {
  const raw = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
  const base = raw.split(",")[0].trim().replace(/\/$/, "");
  return `${base}/my-keys`;
}

function formatExpiryDateRu(expiresAt) {
  return new Date(expiresAt).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * @param {{ email: string, packageName: string, expiresAt: Date | string, daysLeft: 0 | 1 | 3 }} params
 */
export async function sendSubscriptionExpiringSoonEmail({
  email,
  packageName,
  expiresAt,
  daysLeft,
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || "Кофемания VPN";
  const renewUrl = getMyKeysRenewUrl();
  const expiryLabel = formatExpiryDateRu(expiresAt);

  let lead;
  if (daysLeft === 0) {
    lead = "Сегодня заканчивается срок действия вашей VPN-подписки.";
  } else if (daysLeft === 1) {
    lead = "Завтра заканчивается срок действия вашей VPN-подписки.";
  } else {
    lead = "Через 3 дня заканчивается срок действия вашей VPN-подписки.";
  }

  const subject = `Ваша подписка скоро закончится — ${appName}`;
  const text = `${lead}

Тариф: ${packageName}
Окончание: ${expiryLabel} (МСК)

Продлите подписку, чтобы не потерять доступ:
${renewUrl}

Если вы уже продлили подписку, проигнорируйте это письмо.`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #3d1c1c;">
      <h2 style="color: #3d1c1c; margin: 0 0 16px;">Ваша подписка скоро закончится</h2>
      <p style="color: #5c4030; line-height: 1.5;">${lead}</p>
      <div style="background: #faf4ef; border: 1px solid #e8ddd0; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Тариф:</strong> ${packageName}</p>
        <p style="margin: 0;"><strong>Окончание:</strong> ${expiryLabel} (МСК)</p>
      </div>
      <p style="color: #5c4030; line-height: 1.5;">Продлите подписку заранее — доступ к VPN сохранится без перерыва.</p>
      <p style="margin: 28px 0;">
        <a href="${renewUrl}"
           style="display: inline-block; background: #3d1c1c; color: #ede0d8; text-decoration: none;
                  padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Продлить подписку
        </a>
      </p>
      <p style="color: #998675; font-size: 12px; margin-top: 24px;">
        Если вы уже продлили подписку, это письмо можно проигнорировать.<br/>
        ${appName}
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });
}

export async function verifySmtpConnection() {
  await getTransporter().verify();
}
