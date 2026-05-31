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

export async function verifySmtpConnection() {
  await getTransporter().verify();
}
