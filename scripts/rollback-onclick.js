#!/usr/bin/env node
/**
 * onclick迁移回滚工具
 * 恢复.backup文件
 */

import { glob } from 'glob';
import fs from 'fs';

console.log('🔙 开始回滚onclick迁移...\n');

const backupFiles = glob.sync('src/**/*.html.backup', { 
  ignore: ['**/node_modules/**', '**/dist/**'] 
});

let restoredCount = 0;

backupFiles.forEach(backupFile => {
  const originalFile = backupFile.replace('.backup', '');
  
  if (fs.existsSync(originalFile)) {
    // 恢复备份
    fs.copyFileSync(backupFile, originalFile);
    // 删除备份文件
    fs.unlinkSync(backupFile);
    
    restoredCount++;
    console.log(`✅ 已恢复: ${originalFile}`);
  }
});

console.log(`\n✅ 共恢复 ${restoredCount} 个文件`);
