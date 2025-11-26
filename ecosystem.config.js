// PM2 конфигурация для ReadLine Bot
module.exports = {
  apps: [
    {
      name: 'ReadLine',
      script: './dist/index.js',
      instances: 1,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Автоматично перезавантажувати при exit
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // Delay перед перезавантаженням в мс
      listen_timeout: 3000,
      kill_timeout: 5000,
    },
  ],
};
