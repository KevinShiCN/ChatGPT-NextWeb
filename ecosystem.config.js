module.exports = {
  apps: [{
    name: 'chatgpt-next-web',
    script: 'yarn',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 37405,
      // 在这里添加你的环境变量
      // 建议使用 .env 文件管理
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};