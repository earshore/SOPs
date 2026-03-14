// tests/scripts/cleanup-screenshots.ts
// ================================================================
// 🧹 截图清理脚本
// 手动清理过期的失败截图
// ================================================================

import { ScreenshotManager } from '../helpers/screenshot-manager';

/**
 * 清理截图的主函数
 */
async function main() {
  console.log('🧹 开始清理截图...\n');

  // 解析命令行参数
  const args = process.argv.slice(2);
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--max-age' && args[i + 1]) {
      options.maxAge = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--max-count' && args[i + 1]) {
      options.maxCount = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--all') {
      options.maxAge = 0;
      options.maxCount = 0;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // 创建截图管理器实例
  const manager = ScreenshotManager.getInstance(options);

  // 打印清理前的统计信息
  console.log('📊 清理前统计:');
  manager.printStats();

  // 执行清理
  manager.cleanup();

  // 重新生成 HTML 索引
  manager.generateHtmlIndex();

  console.log('✅ 清理完成！\n');
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
📸 截图清理脚本

用法:
  npm run screenshots:cleanup [选项]

选项:
  --max-age <天数>     保留最近 N 天的截图（默认: 7）
  --max-count <数量>   最多保留 N 个截图（默认: 100）
  --all               删除所有截图
  --help, -h          显示此帮助信息

示例:
  # 清理 3 天前的截图
  npm run screenshots:cleanup -- --max-age 3

  # 只保留最近 50 个截图
  npm run screenshots:cleanup -- --max-count 50

  # 删除所有截图
  npm run screenshots:cleanup -- --all
  `);
}

// 运行主函数
main().catch(error => {
  console.error('❌ 清理失败:', error);
  process.exit(1);
});
