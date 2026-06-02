#!/usr/bin/env python3
"""Fast deploy: only changed app files + build + pm2 restart."""
import os
import sys
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
HOST = "144.31.238.179"
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")
APP = "/var/www/cafemaniavpn/vpnkeyseller_site"

FILES = [
    "server/routes/purchases.js",
    "server/purchase-payment-helpers.js",
    "server/yookassa-wrapper.js",
    "server/yookassa_integration.py",
    "server/python-exec.js",
    "server/db.js",
    "src/app/components/About.tsx",
    "src/app/components/MyKeys.tsx",
    "src/app/components/BuyVPNKey.tsx",
    "src/lib/purchases-api.ts",
    "ecosystem.config.cjs",
]

REMOTE_SCRIPT = f"""#!/bin/bash
set -euo pipefail
APP="{APP}"
cd "$APP"
export NODE_ENV=production
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
cd server && npm ci 2>/dev/null || npm install
cd "$APP"
unset VITE_API_URL
pnpm run build
pm2 restart cafemaniavpn-api --update-env || pm2 start "$APP/ecosystem.config.cjs"
sleep 3
curl -sf http://127.0.0.1:3001/api/health && echo ""
pm2 list | head -8
echo DONE
"""


def main():
    if not PASSWORD:
        print("DEPLOY_SSH_PASSWORD required", file=sys.stderr)
        return 1
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    client.connect(HOST, username="root", password=PASSWORD, timeout=60, banner_timeout=60)

    sftp = client.open_sftp()
    for rel in FILES:
        local = ROOT / rel
        if not local.exists():
            print("skip missing:", rel)
            continue
        remote = f"{APP}/{rel.replace(chr(92), '/')}"
        remote_dir = os.path.dirname(remote)
        parts = []
        p = remote_dir
        while p and p != "/":
            parts.append(p)
            p = os.path.dirname(p)
        for d in reversed(parts):
            try:
                sftp.stat(d)
            except OSError:
                try:
                    sftp.mkdir(d)
                except OSError:
                    pass
        print("upload", rel)
        sftp.put(str(local), remote)
    sftp.close()

    remote_sh = "/tmp/quick-deploy.sh"
    sftp = client.open_sftp()
    with sftp.file(remote_sh, "w") as f:
        f.write(REMOTE_SCRIPT)
    sftp.chmod(remote_sh, 0o755)
    sftp.close()

    print("Building on server...")
    _, stdout, stderr = client.exec_command(f"bash {remote_sh}", get_pty=True, timeout=600)
    for line in stdout:
        print(line.rstrip())
    code = stdout.channel.recv_exit_status()
    err = stderr.read().decode(errors="replace")
    if err.strip():
        print(err, file=sys.stderr)
    client.close()
    return code


if __name__ == "__main__":
    sys.exit(main())
