import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function tablesExist() {
  const result = await pool.query(`
    SELECT
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS users_exists,
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'verification_codes'
      ) AS codes_exists
  `);

  const { users_exists, codes_exists } = result.rows[0];
  return users_exists && codes_exists;
}

async function currentUserIsOwner(tableName) {
  const res = await pool.query(
    `
    SELECT (pg_get_userbyid(c.relowner) = current_user) AS is_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = $1 AND n.nspname = 'public'
  `,
    [tableName]
  );
  return res.rows.length > 0 ? res.rows[0].is_owner : false;
}

export async function initDb() {
  if (!(await tablesExist())) {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

    try {
      await pool.query(schema);
    } catch (error) {
      if (error.message?.includes("permission denied for schema public")) {
        const err = new Error("DB_PERMISSION_DENIED");
        err.cause = error;
        throw err;
      }
      throw error;
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_change_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      new_email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_email_change_requests_user_id ON email_change_requests(user_id);
  `);

  const isOwner = await currentUserIsOwner("users");
  if (isOwner) {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_first_name VARCHAR(128);
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    `);
  } else {
    console.warn("Database role is not the owner of table 'users'; skipping ALTER TABLE / index creation.");
    console.warn("To add these columns, run the setup script as a superuser or change the table owner.");
    console.warn('Examples:');
    console.warn('  sudo -u postgres psql -d <db> -f setup-db.sql');
    console.warn('  sudo -u postgres psql -d <db> -c "ALTER TABLE users OWNER TO <role>;"');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2),
      days_count INTEGER DEFAULT 30,
      purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      expires_at TIMESTAMPTZ,
      remnawave_inbound_id VARCHAR(255),
      yookassa_payment_id VARCHAR(255),
      payment_status VARCHAR(50) DEFAULT 'pending',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS yookassa_payment_id VARCHAR(255);
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(32) DEFAULT 'new';
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS remnawave_username VARCHAR(255);
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS gb_amount INTEGER;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS confirmation_url TEXT;
    CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_remnawave_inbound_id ON purchases(remnawave_inbound_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
    CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON purchases(yookassa_payment_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_expiry_reminders (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      reminder_kind VARCHAR(8) NOT NULL,
      expires_on DATE NOT NULL,
      sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      UNIQUE (purchase_id, reminder_kind, expires_on)
    );
    CREATE INDEX IF NOT EXISTS idx_subscription_expiry_reminders_purchase
      ON subscription_expiry_reminders(purchase_id);
  `);
}
