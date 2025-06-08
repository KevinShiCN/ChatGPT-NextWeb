const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'app', 'locales');

// 获取所有语言文件
const localeFiles = fs.readdirSync(localesDir)
  .filter(file => file.endsWith('.ts') && file !== 'index.ts');

console.log(`Found ${localeFiles.length} locale files`);

// 对每个文件进行处理
localeFiles.forEach(file => {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 使用正则表达式匹配并删除SaasTips字段
  const regex = /(\s+)SaasTips\s*:\s*["'].*["']\s*,/g;
  const newContent = content.replace(regex, '');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${file}`);
  } else {
    console.log(`No changes needed for ${file}`);
  }
});

console.log('All locale files updated successfully!'); 