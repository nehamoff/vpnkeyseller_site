#!/usr/bin/env python3
"""Fix PM2 / PostgreSQL on production."""
import os
import re
import sys

import paramiko

HOST = os.environ.get("DEPLOY_HOST", "144.31.238.179")
USER = os.environ.get("DEPLOY_USER", "root")
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")
APP = "/var/www/cafemaniavpn/vpnkeyseller_site"


def run(client, cmd, timeout=30):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def main():
    if not PASSWORD:
        print("DEPLOY_SSH_PASSWORD required", file=sys.stderr)
        return 1

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=45)

    code, out, _ = run(
        client,
        f"grep '^DATABASE_URL=' {APP}/server/.env 2>/dev/null || true",
    )
    db_line = out.strip()
    if not db_line:
        print("No DATABASE_URL in server/.env")
        client.close()
        return 1

    masked = re.sub(r":([^:@]+)@", r":***@", db_line)
    print("DATABASE_URL:", masked)

    m = re.search(
        r"postgresql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(\w+)",
        db_line.split("=", 1)[1].strip().strip('"').strip("'"),
    )
    if not m:
        print("Cannot parse DATABASE_URL")
        client.close()
        return 1

    pg_user, pg_pass, pg_host, pg_port, pg_db = m.groups()
    pg_port = pg_port or "5432"
    print(f"DB user={pg_user} host={pg_host} port={pg_port} db={pg_db}")

    # Sync postgres password with .env
    safe_pass = pg_pass.replace("'", "''")
    sql = f"ALTER USER {pg_user} WITH PASSWORD '{safe_pass}';"
    fix_cmd = f"sudo -u postgres psql -v ON_ERROR_STOP=1 -c \"{sql}\""
    code, out, err = run(client, fix_cmd)
    print("ALTER USER:", out or err, "exit", code)

    # Test connection
    test_cmd = (
        f"cd {APP}/server && node -e \"import('pg').then(async ({{default:pg}}) => {{"
        f"const p=new pg.Pool({{connectionString:process.env.DATABASE_URL}});"
        f"await p.query('SELECT 1'); console.log('db_ok'); await p.end();"
        f"}}).catch(e=>{{console.error(e.message); process.exit(1);}})\""
    )
    code, out, err = run(
        client,
        f"bash -lc 'set -a; source {APP}/server/.env; set +a; {test_cmd}'",
        timeout=20,
    )
    print("DB test:", (out + err).strip(), "exit", code)

    client.close()
    return 0 if code == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
