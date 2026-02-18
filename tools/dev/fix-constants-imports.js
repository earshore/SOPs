/**
 * fix-constants-imports.js - 修复 constants.js 到 constants.ts 的导入引用
 * 
 * 使用方法: node tools/dev/fix-constants-imports.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要修复的文件列表
const filesToFix = [
  'tests/unit/systemSettings.test.js',
  'src/modules/app_center/views/master_prompt/scraper/index.js',
  'src/modules/app_center/views/master_prompt/services/scraperService.js',
  'src/modules/app_center/views/master_prompt/services/parserService.js',
  'src/modules/app_center/views/master_prompt/promptlab/index.js',
  'src/modules/app_center/views/master_prompt/data/index.js',
  'src/common/utils/ui.js',
  'src/common/utils/viewLoader.ts',
  'src/components/settings/systemSettings.js'
];

let totalFixed = 0;

filesToFix.forEach(filePath => {
  const fullPath = path.resolve(path.dirname(__dirname), '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // 替换 constants.js 为 constants (移除 .js 扩展名)
  content = content.replace(
    /from ['"](.*)\/constants\/constants\.js['"]/g,
    'from \'$1/constants/constants\''
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ 已修复: ${filePath}`);
    totalFixed++;
  } else {
    console.log(`⏭️  无需修复: ${filePath}`);
  }
});

console.log(`\n🎉 完成！共修复 ${totalFixed} 个文件`);
