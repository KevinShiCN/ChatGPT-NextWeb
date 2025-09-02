module.exports = {
  apps: [{
    name: 'chatgpt-next-web',
    script: 'yarn',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_file: '.env',  // 自动加载 .env 文件
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 37405,  // 使用 .env 中的 PORT
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};