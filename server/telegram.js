import crypto from "crypto";

export function verifyTelegramAuth(data, botToken) {
  if (!botToken || !data?.hash) {
    return false;
  }

  const payload = { ...data };
  const checkHash = payload.hash;
  delete payload.hash;

  const dataCheckString = Object.keys(payload)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const authDate = Number(payload.auth_date);
  const isFresh = Number.isFinite(authDate) && Date.now() / 1000 - authDate < 86400;

  return computed === checkHash && isFresh;
}

export function telegramPlaceholderEmail(telegramId) {
  return `tg_${telegramId}@telegram.local`;
}

export function isTelegramPlaceholderEmail(email) {
  return typeof email === "string" && email.endsWith("@telegram.local");
}
