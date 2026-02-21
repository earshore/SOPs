/**
 * 运行所有质量检查并生成仪表板
 * 这是质量基线建立的主入口脚本
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(70));
console.log('🎯 系统稳定性优化 - 质量基线建立');
console.log('='.repeat(70));
console.log('');

const steps = [
  {
    name: '代码质量检查',
    icon: '📋',
    command: 'node tests/quality/code-quality-check.ts',
    optional: false
  },
  {
    name: '测试覆盖率统计',
    icon: '🧪',
    command: 'node tests/quality/coverage-stats.js',
    optional: false
  },
  {
    name: 'Lighthouse 性能测试',
    icon: '⚡',
    command: 'node tests/performance/lighthouse-baseline.js',
    optional: true
  },
  {
    name: '生成质量仪表板',
    icon: '📊',
    command: 'node tests/quality/generate-dashboard.js',
    optional: false
  }
];

let completedSteps = 0;
let failedSteps = 0;

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  
  console.log(`\n${step.icon} 步骤 ${i + 1}/${steps.length}: ${step.name}`);
  console.log('-'.repeat(70));
  
  try {
    execSync(step.command, {
      encoding: 'utf-8',
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    
    completedSteps++;
    console.log(`\n✅ ${step.name} 完成`);
  } catch (error) {
    if (step.optional) {
      console.log(`\n⚠️  ${step.name} 失败（可选步骤，继续执行）`);
    } else {
      failedSteps++;
      console.error(`\n❌ ${step.name} 失败`);
      
      // 非可选步骤失败时，询问是否继续
      if (i < steps.length - 1) {
        console.log('\n是否继续执行剩余步骤？');
        console.log('提示: 可以稍后单独运行失败的步骤');
      }
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('📊 质量基线建立完成');
console.log('='.repeat(70));
console.log(`\n✅ 完成步骤: ${completedSteps}/${steps.length}`);
if (failedSteps > 0) {
  console.log(`❌ 失败步骤: ${failedSteps}`);
}

console.log('\n📂 查看结果:');
console.log('  - 质量仪表板: tests/quality/reports/quality-dashboard.html');
console.log('  - 代码质量报告: tests/quality/reports/quality-latest.json');
console.log('  - 覆盖率报告: tests/quality/reports/coverage-baseline.json');
console.log('  - 性能报告: tests/performance/baseline-scores.json');

console.log('\n💡 提示:');
console.log('  - 在浏览器中打开 quality-dashboard.html 查看可视化报告');
console.log('  - 使用 npm run quality:baseline 重新运行此脚本');
console.log('');
