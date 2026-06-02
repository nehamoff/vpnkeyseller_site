module.exports = {
    apps: [
        {
            // ============= MAIN APPLICATION =============
            name: "cafemaniavpn-api",
            script: "index.js",
            cwd: "/var/www/cafemaniavpn/server",

            // Clustering
            instances: "max",
            exec_mode: "cluster",

            // Environment
            env: {
                NODE_ENV: "production"
            },

            // Logging
            error_file: "/var/log/pm2/cafemaniavpn-error.log",
            out_file: "/var/log/pm2/cafemaniavpn-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs: true,

            // Performance
            max_memory_restart: "500M",
            node_args: "--max-old-space-size=512",

            // Watch mode (disable in production for stability)
            watch: false,
            ignore_watch: ["node_modules", "dist", ".env"],

            // Restart conditions
            listen_timeout: 3000,
            kill_timeout: 5000,

            // Graceful shutdown
            max_restarts: 10,
            min_uptime: "10s",

            // Auto-restart
            autorestart: true,

            // Custom error handler
            error_handler: true
        }
    ],

    // ============= DEPLOYMENT =============
    deploy: {
        production: {
            user: "deploy",
            host: "your-server-ip",
            ref: "origin/main",
            repo: "https://github.com/yourusername/cafemaniavpn.git",
            path: "/var/www/cafemaniavpn",
            "pre-deploy-local": "echo 'Deploying to production'",
            "post-deploy": "npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env production",
            "pre-deploy": "ssh-add ~/.ssh/deploy_key"
        }
    }
};
