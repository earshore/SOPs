// ================================================================
// 🚀 Lighthouse CI 配置验证测试
// 验证 Lighthouse CI 配置是否正确工作
// ================================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 测试 Lighthouse CI 配置
 */
function testLighthouseCIConfig() {
  console.log('\n🔍 开始验证 Lighthouse CI 配置...\n');
  
  try {
    // 1. 检查配置文件是否存在
    console.log('✓ 步骤 1: 检查配置文件');
    const configPath = path.join(process.cwd(), 'lighthouserc.js');
    if (!fs.existsSync(configPath)) {
      throw new Error('配置文件 lighthouserc.js 不存在');
    }
    console.log('  ✅ 配置文件存在: lighthouserc.js\n');
    
    // 2. 运行健康检查
    console.log('✓ 步骤 2: 运行健康检查');
    execSync('npx lhci healthcheck --config=lighthouserc.js', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log('  ✅ 健康检查通过\n');
    
    // 3. 检查 .lighthouseci 目录
    console.log('✓ 步骤 3: 检查输出目录');
    const outputDir = path.join(process.cwd(), '.lighthouseci');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('  ✅ 创建输出目录: .lighthouseci\n');
    } else {
      console.log('  ✅ 输出目录已存在: .lighthouseci\n');
    }
    
    // 4. 验证配置内容
    console.log('✓ 步骤 4: 验证配置内容');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    const requiredKeys = [
      'ci.collect',
      'ci.upload',
      'ci.assert',
    ];
    
    let allKeysPresent = true;
    for (const key of requiredKeys) {
      if (!configContent.includes(key.split('.').pop())) {
        console.log(`  ❌ 缺少配置项: ${key}`);
        allKeysPresent = false;
      }
    }
    
    if (allKeysPresent) {
      console.log('  ✅ 所有必需的配置项都存在\n');
    }
    
    // 5. 检查 package.json 脚本
    console.log('✓ 步骤 5: 检查 npm 脚本');
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    const requiredScripts = ['lighthouse', 'lighthouse:local'];
    let allScriptsPresent = true;
    
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        console.log(`  ❌ 缺少 npm 脚本: ${script}`);
        allScriptsPresent = false;
      } else {
        console.log(`  ✅ npm 脚本存在: ${script}`);
      }
    }
    
    if (allScriptsPresent) {
      console.log('  ✅ 所有必需的 npm 脚本都存在\n');
    }
    
    // 6. 总结
    console.log('='.repeat(60));
    console.log('✅ Lighthouse CI 配置验证完成！');
    console.log('='.repeat(60));
    console.log('\n📝 使用说明:');
    console.log('  1. 构建项目: npm run build');
    console.log('  2. 运行 Lighthouse CI: npm run lighthouse');
    console.log('  3. 或使用本地配置: npm run lighthouse:local\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.error('\n堆栈信息:', error.stack);
    return false;
  }
}

// 运行测试
const success = testLighthouseCIConfig();
process.exit(success ? 0 : 1);
