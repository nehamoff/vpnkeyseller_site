#!/usr/bin/env python3
import os
import sys
import paramiko

PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")
APP = "/var/www/cafemaniavpn/vpnkeyseller_site"


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect("144.31.238.179", username="root", password=PASSWORD, timeout=60, banner_timeout=60)
    cmd = f"cd {APP} && unset VITE_API_URL && pnpm run build && echo BUILD_OK"
    print("Running build...")
    _, stdout, _ = c.exec_command(cmd, get_pty=True, timeout=600)
    for line in stdout:
        print(line.rstrip())
    print("exit", stdout.channel.recv_exit_status())
    c.close()


if __name__ == "__main__":
    main()
