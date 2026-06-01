import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

try {
    console.log('Creating purchases table...');

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
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);
    console.log('✓ purchases table created');

    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
  `);
    console.log('✓ idx_purchases_user_id index created');

    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_purchases_remnawave_inbound_id ON purchases(remnawave_inbound_id);
  `);
    console.log('✓ idx_purchases_remnawave_inbound_id index created');

    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
  `);
    console.log('✓ idx_purchases_status index created');

    console.log('\n✓ All purchases tables and indexes created successfully!');
    process.exit(0);
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
