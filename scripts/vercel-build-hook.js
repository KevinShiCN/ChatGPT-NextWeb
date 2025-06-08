// 在 Vercel 构建完成后发送通知
const https = require('https');

async function sendNotification() {
  return new Promise((resolve, reject) => {
    // 从环境变量中获取通知 URL，如果没有则使用默认值
    const barkToken = process.env.BARK_TOKEN || 'xkjJ655M94DX66TmeDXYxW';
    const barkTitle = encodeURIComponent(process.env.BARK_TITLE || 'NextChat项目已重新部署');
    const barkGroup = process.env.BARK_GROUP || 'Vercel';
    const deployEnv = process.env.VERCEL_ENV || 'production';
    
    // 构建通知 URL
    const url = `https://api.day.app/${barkToken}/${barkTitle}?group=${barkGroup}&env=${deployEnv}`;
    
    console.log(`正在发送部署通知到 Bark...`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('通知发送成功:', data);
        resolve(data);
      });
    }).on('error', (err) => {
      console.error('发送通知时出错:', err.message);
      reject(err);
    });
  });
}

// 如果直接运行此脚本，发送通知
if (require.main === module) {
  sendNotification()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { sendNotification }; 