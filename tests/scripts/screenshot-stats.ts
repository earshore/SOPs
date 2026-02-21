// tests/scripts/screenshot-stats.ts
// ================================================================
// 📊 截图统计脚本
// 查看失败截图的统计信息
// ================================================================

import { ScreenshotManager } from '../helpers/screenshot-manager';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 显示截图统计信息
 */
async function main() {
  console.log('📊 截图统计信息\n');

  const manager = ScreenshotManager.getInstance();
  const stats = manager.getStats();

  // 基本统计
  console.log('='.repeat(60));
  console.log('基本信息:');
  console.log('='.repeat(60));
  console.log(`总截图数:     ${stats.total}`);
  console.log(`总大小:       ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (stats.total > 0) {
    console.log(`平均大小:     ${(stats.totalSize / stats.total / 1024).toFixed(2)} KB`);
    
    if (stats.oldestDate && stats.newestDate) {
      console.log(`最早截图:     ${stats.oldestDate.toLocaleString('zh-CN')}`);
      console.log(`最新截图:     ${stats.newestDate.toLocaleString('zh-CN')}`);
      
      const daysDiff = Math.ceil(
        (stats.newestDate.getTime() - stats.oldestDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`时间跨度:     ${daysDiff} 天`);
    }
  }

  // 按浏览器分布
  if (Object.keys(stats.byBrowser).length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('按浏览器分布:');
    console.log('='.repeat(60));
    
    const sortedBrowsers = Object.entries(stats.byBrowser)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [browser, count] of sortedBrowsers) {
      const percentage = ((count / stats.total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / stats.total * 40));
      console.log(`${browser.padEnd(15)} ${count.toString().padStart(4)} (${percentage}%) ${bar}`);
    }
  }

  // 按测试文件分布
  console.log('\n' + '='.repeat(60));
  console.log('按测试文件分布 (Top 10):');
  console.log('='.repeat(60));
  
  const indexPath = path.join('tests/screenshots', 'index.json');
  if (fs.existsSync(indexPath)) {
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const byFile: Record<string, number> = {};
    
    for (const entry of indexData) {
      const file = entry.metadata.testFile;
      byFile[file] = (byFile[file] || 0) + 1;
    }
    
    const sortedFiles = Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedFiles.length > 0) {
      for (const [file, count] of sortedFiles) {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        console.log(`${file.padEnd(45)} ${count.toString().padStart(4)} (${percentage}%)`);
      }
    } else {
      console.log('暂无数据');
    }
  } else {
    console.log('索引文件不存在');
  }

  // 磁盘使用情况
  console.log('\n' + '='.repeat(60));
  console.log('磁盘使用情况:');
  console.log('='.repeat(60));
  
  const screenshotDir = 'tests/screenshots';
  if (fs.existsSync(screenshotDir)) {
    const totalSize = calculateDirectorySize(screenshotDir);
    console.log(`截图目录总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // 检查子目录
    const subdirs = ['failures', 'temp'];
    for (const subdir of subdirs) {
      const subdirPath = path.join(screenshotDir, subdir);
      if (fs.existsSync(subdirPath)) {
        const size = calculateDirectorySize(subdirPath);
        const fileCount = countFiles(subdirPath);
        console.log(`  ${subdir.padEnd(15)} ${(size / 1024 / 1024).toFixed(2)} MB (${fileCount} 文件)`);
      }
    }
  }

  // 建议
  console.log('\n' + '='.repeat(60));
  console.log('建议:');
  console.log('='.repeat(60));
  
  if (stats.total === 0) {
    console.log('✅ 太棒了！没有失败的测试。');
  } else if (stats.total > 50) {
    console.log('⚠️  截图数量较多，建议运行清理命令:');
    console.log('   npm run screenshots:cleanup');
  } else if (stats.totalSize > 50 * 1024 * 1024) {
    console.log('⚠️  截图占用空间较大，建议清理旧截图:');
    console.log('   npm run screenshots:cleanup -- --max-age 3');
  } else {
    console.log('✅ 截图数量和大小在合理范围内。');
  }

  // HTML 索引链接
  const htmlIndexPath = path.join(screenshotDir, 'index.html');
  if (fs.existsSync(htmlIndexPath)) {
    console.log('\n📄 查看详细信息:');
    console.log(`   file:///${path.resolve(htmlIndexPath).replace(/\\/g, '/')}`);
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * 计算目录大小
 */
function calculateDirectorySize(dirPath: string): number {
  let totalSize = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      totalSize += calculateDirectorySize(filePath);
    } else {
      totalSize += stats.size;
    }
  }

  return totalSize;
}

/**
 * 统计文件数量
 */
function countFiles(dirPath: string): number {
  let count = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      count += countFiles(filePath);
    } else {
      count++;
    }
  }

  return count;
}

// 运行主函数
main().catch(error => {
  console.error('❌ 获取统计信息失败:', error);
  process.exit(1);
});
