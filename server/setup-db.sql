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

GRANT CONNECT ON DATABASE vpnsite TO main;
GRANT USAGE, CREATE ON SCHEMA public TO main;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO main;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO main;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO main;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO main;
