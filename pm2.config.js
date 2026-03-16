module.exports = {
  apps: [
    {
      name: 'cert-manager',
      script: 'dist/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      // Daily restart at 9:00 AM to reload certificates
      cron_restart: '0 9 * * *',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
    },
  ],
};