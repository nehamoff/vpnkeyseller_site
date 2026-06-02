#!/usr/bin/env python3
"""Deploy local tree to production VPS via SSH/SFTP. Password: env DEPLOY_SSH_PASSWORD."""

from __future__ import annotations

import os
import sys
import tarfile
import tempfile
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ.get("DEPLOY_HOST", "144.31.238.179")
USER = os.environ.get("DEPLOY_USER", "root")
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")
APP_DIR = os.environ.get("DEPLOY_APP_DIR", "/var/www/cafemaniavpn/vpnkeyseller_site")

EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    ".cursor",
    "agent-transcripts",
    "__pycache__",
    ".venv",
    "venv",
    "server/node_modules",
}
EXCLUDE_FILES = {".env", "ngrok.zip", "deploy.tgz"}
EXCLUDE_SUFFIXES = {".zip", ".tgz", ".tar.gz"}


def should_skip(path: Path) -> bool:
    parts = set(path.parts)
    if parts & EXCLUDE_DIRS:
        return True
    if path.name in EXCLUDE_FILES:
        return True
    if path.suffix in {".pyc", ".log"} or path.suffix.lower() in EXCLUDE_SUFFIXES:
        return True
    if "server" in parts and path.name == ".env":
        return True
    return False


def make_archive() -> Path:
    tmp = tempfile.NamedTemporaryFile(suffix=".tgz", delete=False)
    tmp.close()
    archive_path = Path(tmp.name)
    with tarfile.open(archive_path, "w:gz") as tar:
        for item in ROOT.rglob("*"):
            rel = item.relative_to(ROOT)
            if should_skip(rel):
                continue
            tar.add(item, arcname=str(rel).replace("\\", "/"))
    return archive_path


REMOTE_SCRIPT = f"""#!/bin/bash
set -euo pipefail
APP="{APP_DIR}"
ARCHIVE="/tmp/vpnkeyseller-deploy.tgz"

echo "=== extract (keep server/.env) ==="
cd "$APP"
tar -xzf "$ARCHIVE" -C "$APP"
rm -f "$ARCHIVE"

echo "=== node / pnpm ==="
command -v pnpm >/dev/null || npm install -g pnpm
export NODE_ENV=production
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "=== server deps ==="
cd "$APP/server"
npm ci 2>/dev/null || npm install
pip3 install -q --break-system-packages -r requirements.txt 2>/dev/null || \\
  pip3 install -q --break-system-packages yookassa python-dotenv httpx requests

echo "=== frontend build ==="
cd "$APP"
unset VITE_API_URL
pnpm run build

echo "=== pm2 ==="
if pm2 describe cafemaniavpn-api >/dev/null 2>&1; then
  pm2 restart cafemaniavpn-api --update-env
else
  pm2 start "$APP/ecosystem.config.cjs"
fi
pm2 save

echo "=== nginx ==="
nginx -t && systemctl reload nginx

echo "=== health ==="
sleep 2
curl -sf http://127.0.0.1:3001/api/health && echo ""
curl -sk -o /dev/null -w "site:%{{http_code}}\\n" https://coffeemaniavpn.ru/api/health || true

echo "=== DONE ==="
"""


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    if not PASSWORD:
        print("Set DEPLOY_SSH_PASSWORD environment variable.", file=sys.stderr)
        return 1

    archive = make_archive()
    print(f"Archive: {archive} ({archive.stat().st_size // 1024} KB)")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"Connecting to {USER}@{HOST}...")
        client.connect(HOST, username=USER, password=PASSWORD, timeout=45, banner_timeout=45)

        sftp = client.open_sftp()
        remote_archive = "/tmp/vpnkeyseller-deploy.tgz"
        print("Uploading...")
        sftp.put(str(archive), remote_archive)
        sftp.close()

        remote_sh = "/tmp/vpnkeyseller-deploy-run.sh"
        sftp = client.open_sftp()
        with sftp.file(remote_sh, "w") as f:
            f.write(REMOTE_SCRIPT)
        sftp.chmod(remote_sh, 0o755)
        sftp.close()

        print("Running remote deploy (3–8 min)...")
        stdin, stdout, stderr = client.exec_command(f"bash {remote_sh}", get_pty=True, timeout=900)
        for line in stdout:
            print(line.rstrip())
        err = stderr.read().decode(errors="replace")
        if err.strip():
            print(err, file=sys.stderr)
        code = stdout.channel.recv_exit_status()
        return code
    finally:
        client.close()
        archive.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
