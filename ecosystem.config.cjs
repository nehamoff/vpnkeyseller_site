module.exports = {
  apps: [
    {
      name: "cafemaniavpn-api",
      script: "index.js",
      cwd: "/var/www/cafemaniavpn/vpnkeyseller_site/server",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/pm2/cafemaniavpn-error.log",
      out_file: "/var/log/pm2/cafemaniavpn-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "500M",
      watch: false,
      autorestart: true,
    },
  ],
};
