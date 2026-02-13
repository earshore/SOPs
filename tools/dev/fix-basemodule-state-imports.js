/**
 * 自动修复 BaseModule.js 和 state.js 的导入引用
 * 将 .js 扩展名改为 TypeScript 导入（无扩展名）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// 需要修复的文件列表
const filesToFix = [
  // BaseModule.js 引用
  'src/modules/home/homeDisplay.js',
  'src/modules/app_center/views/master_prompt/data/index.js',
  'src/modules/amz_hub/views/practice/promotions/index.js',
  'src/modules/amz_hub/views/practice/marketing_calendar/index.js',
  'src/modules/amz_hub/views/knowledge/seo_strategy/index.js',
  'src/modules/amz_hub/views/knowledge/eu_insights/index.js',
  'src/modules/amz_hub/views/knowledge/ecosystem/index.js',
  
  // state.js 引用
  'src/modules/app_center/views/keyword_hunter/analysis/index.js',
  'src/modules/app_center/views/keyword_hunter/process/index.js',
  'src/modules/app_center/views/master_prompt/services/historyService.js',
  'src/modules/app_center/views/master_prompt/scraper/index.js',
  'src/modules/app_center/views/keyword_hunter/input/index.js',
  'src/modules/app_center/views/master_prompt/promptlab/index.js',
];

// 替换规则
const replacements = [
  {
    pattern: /from ['"](.*)\/BaseModule\.js['"]/g,
    replacement: 'from "$1/BaseModule"',
    description: 'BaseModule.js → BaseModule'
  },
  {
    pattern: /from ['"](.*)\/state\.js['"]/g,
    replacement: 'from "$1/state"',
    description: 'state.js → state'
  }
];

let totalChanges = 0;
let filesModified = 0;

console.log('开始修复 BaseModule 和 state 导入引用...\n');

filesToFix.forEach(filePath => {
  const fullPath = path.resolve(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  let fileChanged = false;
  let fileChanges = 0;
  
  replacements.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      fileChanges += matches.length;
      fileChanged = true;
    }
  });
  
  if (fileChanged) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    filesModified++;
    totalChanges += fileChanges;
    console.log(`✅ ${filePath} (${fileChanges} 处修改)`);
  }
});

console.log(`\n修复完成！`);
console.log(`- 修改文件数: ${filesModified}`);
console.log(`- 总修改数: ${totalChanges}`);
