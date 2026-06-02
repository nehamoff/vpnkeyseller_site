import { pool } from "./db.js";
import { sendSubscriptionExpiringSoonEmail } from "./email.js";

const REMINDER_CONFIG = [
  { kind: "3d", daysLeft: 3, offsetDays: 3 },
  { kind: "1d", daysLeft: 1, offsetDays: 1 },
  { kind: "0d", daysLeft: 0, offsetDays: 0 },
];

/**
 * Активные покупки, у которых дата окончания (МСК) = сегодня + offsetDays.
 */
async function findPurchasesForReminder(offsetDays) {
  const result = await pool.query(
    `
    SELECT
      p.id AS purchase_id,
      p.package_name,
      p.expires_at,
      u.email
    FROM purchases p
    INNER JOIN users u ON u.id = p.user_id
    WHERE p.status = 'active'
      AND p.remnawave_inbound_id IS NOT NULL
      AND p.expires_at IS NOT NULL
      AND u.email_verified = true
      AND u.email NOT LIKE '%@telegram.local'
      AND (p.expires_at AT TIME ZONE 'Europe/Moscow')::date =
          ((NOW() AT TIME ZONE 'Europe/Moscow')::date + $1::integer)
    `,
    [offsetDays]
  );
  return result.rows;
}

async function wasReminderSent(purchaseId, reminderKind, expiresOn) {
  const result = await pool.query(
    `
    SELECT 1 FROM subscription_expiry_reminders
    WHERE purchase_id = $1 AND reminder_kind = $2 AND expires_on = $3::date
    LIMIT 1
    `,
    [purchaseId, reminderKind, expiresOn]
  );
  return result.rows.length > 0;
}

async function markReminderSent(purchaseId, reminderKind, expiresOn) {
  await pool.query(
    `
    INSERT INTO subscription_expiry_reminders (purchase_id, reminder_kind, expires_on)
    VALUES ($1, $2, $3::date)
    ON CONFLICT (purchase_id, reminder_kind, expires_on) DO NOTHING
    `,
    [purchaseId, reminderKind, expiresOn]
  );
}

function expiresOnMskDate(expiresAt) {
  const d = new Date(expiresAt);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

/**
 * Отправляет письма за 3 дня, за 1 день и в день окончания подписки.
 * @returns {{ sent: number, skipped: number, errors: number }}
 */
export async function runSubscriptionExpiryReminders() {
  if (process.env.SUBSCRIPTION_REMINDERS_ENABLED === "false") {
    return { sent: 0, skipped: 0, errors: 0, disabled: true };
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("[Reminders] SMTP не настроен — пропуск напоминаний о подписке");
    return { sent: 0, skipped: 0, errors: 0, disabled: true };
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const { kind, daysLeft, offsetDays } of REMINDER_CONFIG) {
    const rows = await findPurchasesForReminder(offsetDays);

    for (const row of rows) {
      const expiresOn = expiresOnMskDate(row.expires_at);

      try {
        if (await wasReminderSent(row.purchase_id, kind, expiresOn)) {
          skipped += 1;
          continue;
        }

        await sendSubscriptionExpiringSoonEmail({
          email: row.email,
          packageName: row.package_name,
          expiresAt: row.expires_at,
          daysLeft,
        });

        await markReminderSent(row.purchase_id, kind, expiresOn);
        sent += 1;
        console.log(
          `[Reminders] ${kind} → ${row.email} (purchase #${row.purchase_id}, до ${expiresOn})`
        );
      } catch (err) {
        errors += 1;
        console.error(
          `[Reminders] Ошибка ${kind} для purchase #${row.purchase_id}:`,
          err.message
        );
      }
    }
  }

  return { sent, skipped, errors };
}

const HOUR_MS = 60 * 60 * 1000;

export function startSubscriptionReminderScheduler() {
  if (process.env.SUBSCRIPTION_REMINDERS_ENABLED === "false") {
    console.log("[Reminders] Планировщик отключён (SUBSCRIPTION_REMINDERS_ENABLED=false)");
    return;
  }

  const intervalHours = Number(process.env.SUBSCRIPTION_REMINDERS_INTERVAL_HOURS || 1);
  const intervalMs = Math.max(1, intervalHours) * HOUR_MS;

  const tick = async () => {
    try {
      const result = await runSubscriptionExpiryReminders();
      if (result.sent > 0 || result.errors > 0) {
        console.log(
          `[Reminders] Готово: отправлено ${result.sent}, пропущено ${result.skipped}, ошибок ${result.errors}`
        );
      }
    } catch (err) {
      console.error("[Reminders] Сбой планировщика:", err);
    }
  };

  setTimeout(() => {
    void tick();
  }, 15_000);

  setInterval(() => {
    void tick();
  }, intervalMs);

  console.log(
    `[Reminders] Планировщик напоминаний о подписке: каждые ${intervalHours} ч (МСК, −3/−1/0 дней)`
  );
}
