/**
 * 统一生成所有设计令牌相关文件
 * 
 * 运行: npm run generate:tokens
 */

import { execSync } from 'child_process';

const scripts = [
  { name: 'CSS 变量', command: 'tsx scripts/build/generate-css-variables.ts' },
  { name: 'Tailwind 配置', command: 'tsx scripts/build/generate-tailwind-config.ts' },
  { name: 'TypeScript 类型', command: 'tsx scripts/build/generate-design-token-types.ts' }
];

console.log('🚀 开始生成设计令牌文件...\n');

let successCount = 0;
let failCount = 0;

for (const script of scripts) {
  try {
    console.log(`📝 生成 ${script.name}...`);
    execSync(script.command, { stdio: 'inherit' });
    successCount++;
    console.log('');
  } catch (error) {
    console.error(`❌ ${script.name} 生成失败\n`);
    failCount++;
  }
}

console.log('═'.repeat(60));
console.log(`✅ 成功: ${successCount} 个文件`);
if (failCount > 0) {
  console.log(`❌ 失败: ${failCount} 个文件`);
  process.exit(1);
} else {
  console.log('🎉 所有设计令牌文件生成完成！');
}
