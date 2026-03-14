/**
 * 修复重复的import语句
 */

import * as fs from 'fs';
import glob from 'glob';

function fixFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let fixed = false;
  const newLines: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // 检测模式: import { BusinessError... 紧跟 import {
    if (line.includes('import { BusinessError') && 
        i + 1 < lines.length && 
        lines[i + 1].trim() === 'import {') {
      // 跳过下一行的 "import {"
      newLines.push(line);
      i += 2; // 跳过当前行和下一行
      fixed = true;
      continue;
    }
    
    newLines.push(line);
    i++;
  }
  
  if (fixed) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    return true;
  }
  
  return false;
}

async function main() {
  const files = await new Promise<string[]>((resolve, reject) => {
    glob('src/**/*.ts', {
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
    }, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });

  let fixedCount = 0;
  
  for (const file of files) {
    if (fixFile(file)) {
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }
  }
  
  console.log(`\n📊 Total fixed: ${fixedCount} files`);
}

main().catch(console.error);
