import { pool } from "./db.js";

const BYTES_PER_GB = 1073741824;

/**
 * Сумма докупленных ГБ по ключам пользователя (только выполненные gb_topup).
 * @returns {Promise<Record<string, number>>} username → bytes
 */
export async function getPurchasedGbBytesByEmail(email) {
    const result = await pool.query(
        `SELECT p.remnawave_username AS username,
                COALESCE(SUM(p.gb_amount), 0)::bigint AS gb
         FROM purchases p
         JOIN users u ON u.id = p.user_id
         WHERE u.email = $1
           AND p.purchase_type = 'gb_topup'
           AND p.status = 'active'
           AND p.remnawave_username IS NOT NULL
           AND p.gb_amount > 0
         GROUP BY p.remnawave_username`,
        [email]
    );

    const map = {};
    for (const row of result.rows) {
        map[row.username] = Number(row.gb) * BYTES_PER_GB;
    }
    return map;
}
