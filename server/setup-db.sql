-- Запустить ОДИН РАЗ от суперпользователя postgres на сервере:
-- sudo -u postgres psql -d vpnsite -f setup-db.sql

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

GRANT CONNECT ON DATABASE vpnsite TO main;
GRANT USAGE, CREATE ON SCHEMA public TO main;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO main;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO main;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO main;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO main;
