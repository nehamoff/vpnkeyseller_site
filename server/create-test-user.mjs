import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

try {
    const email = 'testuser@example.com';
    const password = 'Test123456';
    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
        "INSERT INTO users (email, password_hash, email_verified) VALUES ($1, $2, true) ON CONFLICT (email) DO UPDATE SET password_hash = $2 RETURNING id, email",
        [email, hash]
    );

    console.log('✓ Тестовый пользователь создан:');
    console.log('  Email:', email);
    console.log('  Пароль:', password);
    process.exit(0);
} catch (e) {
    console.error('Ошибка:', e.message);
    process.exit(1);
}
