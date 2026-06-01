CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);

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

-- Remnawave VPN keys
ALTER TABLE users ADD COLUMN IF NOT EXISTS remnawave_inbound_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vpn_key_created_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_remnawave_inbound_id ON users(remnawave_inbound_id);

-- Таблица покупок/подписок для интеграции с Remnawave
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

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_remnawave_inbound_id ON purchases(remnawave_inbound_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON purchases(yookassa_payment_id);
