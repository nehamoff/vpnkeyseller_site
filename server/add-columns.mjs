import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

try {
    console.log('Adding missing columns to users table...');

    await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS remnawave_inbound_id VARCHAR(255);
  `);
    console.log('✓ remnawave_inbound_id column added');

    await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS vpn_key_created_at TIMESTAMPTZ;
  `);
    console.log('✓ vpn_key_created_at column added');

    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_remnawave_inbound_id ON users(remnawave_inbound_id);
  `);
    console.log('✓ Index created');

    console.log('\n✓ All columns added successfully!');
    process.exit(0);
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
