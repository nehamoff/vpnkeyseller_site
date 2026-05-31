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

    ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_first_name VARCHAR(128);
    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
  `);
}
