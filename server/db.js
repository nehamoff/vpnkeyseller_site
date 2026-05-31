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
  if (await tablesExist()) {
    return;
  }

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
