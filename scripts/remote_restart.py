#!/usr/bin/env python3
import os
import sys
import paramiko

HOST = "144.31.238.179"
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PASSWORD, timeout=30)
    for cmd in [
        "pm2 restart cafemaniavpn-api --update-env",
        "sleep 4",
        "pm2 list",
        "curl -s http://127.0.0.1:3001/api/health",
        "curl -sk -o /dev/null -w 'site:%{http_code}\\n' https://coffeemaniavpn.ru/api/health",
    ]:
        print("===", cmd, "===")
        _, o, e = c.exec_command(cmd, timeout=30)
        print((o.read() + e.read()).decode())
    c.close()


if __name__ == "__main__":
    main()
