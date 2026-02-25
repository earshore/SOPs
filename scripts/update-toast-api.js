#!/usr/bin/env node

/**
 * 批量更新 showToast API 调用
 * 从旧 API: showToast(message, type)
 * 到新 API: showToast(title, { type })
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要处理的文件列表（从构建错误中提取）
const filesToUpdate = [
  'src/common/ui/navigation.ts',
  'src/components/settings/systemSettings.ts',
  'src/main.ts',
  'src/modules/app_center/views/keyword_hunter/analysis/index.ts',
  'src/modules/app_center/views/keyword_hunter/input/index.ts',
  'src/modules/app_center/views/keyword_hunter/process/index.ts',
  'src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts',
  'src/modules/app_center/views/master_analysis/ai_analysis/components/dataLoaders.ts',
  'src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts',
  'src/modules/app_center/views/master_analysis/scraper/components/DataPreview.ts',
  'src/modules/app_center/views/master_analysis/scraper/components/HistoryPanel.ts',
  'src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts',
  'src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts',
  'src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts',
  'src/modules/more/views/explore/prompts/index.ts',
  'src/services/llmServiceWithTimeout.ts'
];

/**
 * 转换 showToast 调用
 * @param {string} content 文件内容
 * @returns {string} 转换后的内容
 */
function transformShowToastCalls(content) {
  // 匹配模式: showToast(message, 'type')
  // 支持单引号、双引号、模板字符串
  const pattern = /showToast\(([^,]+),\s*(['"`])(success|error|warning|info)\2\)/g;
  
  return content.replace(pattern, (match, message, quote, type) => {
    // 清理消息文本的首尾空格
    const cleanMessage = message.trim();
    
    // 转换为新 API
    return `showToast(${cleanMessage}, { type: '${type}' })`;
  });
}

// 主函数
function main() {
  console.log('🚀 开始批量更新 showToast API 调用...\n');
  
  const rootDir = path.resolve(__dirname, '..');
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  filesToUpdate.forEach(filePath => {
    const fullPath = path.join(rootDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      skippedCount++;
      return;
    }
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const transformed = transformShowToastCalls(content);
      
      if (content !== transformed) {
        fs.writeFileSync(fullPath, transformed, 'utf8');
        console.log(`✅ 已更新: ${filePath}`);
        updatedCount++;
      } else {
        console.log(`⏭️  无需更新: ${filePath}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ 处理失败: ${filePath}`, error.message);
      errorCount++;
    }
  });
  
  console.log('\n📊 更新统计:');
  console.log(`   ✅ 已更新: ${updatedCount} 个文件`);
  console.log(`   ⏭️  跳过: ${skippedCount} 个文件`);
  console.log(`   ❌ 失败: ${errorCount} 个文件`);
  console.log('\n✨ 完成！');
}

main();
