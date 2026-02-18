// tools/dev/migrate-event-constants.js
// 批量替换硬编码的事件名称为事件常量
// 保持UTF-8编码

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 事件名称映射表
const EVENT_MAPPINGS = [
    { pattern: /'route-change'/g, replacement: 'APP_EVENTS.ROUTE_CHANGE' },
    { pattern: /"route-change"/g, replacement: 'APP_EVENTS.ROUTE_CHANGE' },
    { pattern: /'app:data-updated'/g, replacement: 'APP_EVENTS.DATA_UPDATED' },
    { pattern: /"app:data-updated"/g, replacement: 'APP_EVENTS.DATA_UPDATED' },
    { pattern: /'history-updated'/g, replacement: 'APP_EVENTS.HISTORY_UPDATED' },
    { pattern: /"history-updated"/g, replacement: 'APP_EVENTS.HISTORY_UPDATED' },
    { pattern: /'open-settings'/g, replacement: 'APP_EVENTS.SETTINGS_OPEN' },
    { pattern: /"open-settings"/g, replacement: 'APP_EVENTS.SETTINGS_OPEN' },
    { pattern: /'close-settings'/g, replacement: 'APP_EVENTS.SETTINGS_CLOSE' },
    { pattern: /"close-settings"/g, replacement: 'APP_EVENTS.SETTINGS_CLOSE' },
    { pattern: /'registerActions'/g, replacement: 'APP_EVENTS.REGISTER_ACTIONS' },
    { pattern: /"registerActions"/g, replacement: 'APP_EVENTS.REGISTER_ACTIONS' },
];

// 需要添加导入的文件列表
const filesNeedingImport = new Set();

function needsEventConstantsImport(content) {
    // 检查是否已经导入了事件常量
    return !content.includes('APP_EVENTS') && 
           !content.includes('from \'../../../../../common/constants/eventConstants\'') &&
           !content.includes('from "../../../../../common/constants/eventConstants"') &&
           !content.includes('from \'../../../../common/constants/eventConstants\'') &&
           !content.includes('from "../common/constants/eventConstants"');
}

function addEventConstantsImport(content, filePath) {
    // 计算相对路径深度
    const depth = filePath.split(path.sep).filter(p => p && p !== 'src').length - 1;
    const relativePath = '../'.repeat(depth) + 'common/constants/eventConstants';
    
    // 查找最后一个import语句的位置
    const importRegex = /import\s+.*?from\s+['"].*?['"];?\s*\n/g;
    let lastImportMatch;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
        lastImportMatch = match;
    }
    
    if (lastImportMatch) {
        const insertPos = lastImportMatch.index + lastImportMatch[0].length;
        const importStatement = `import { APP_EVENTS } from '${relativePath}';\n`;
        return content.slice(0, insertPos) + importStatement + content.slice(insertPos);
    }
    
    // 如果没有找到import语句，在文件开头添加
    return `import { APP_EVENTS } from '${relativePath}';\n\n` + content;
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        let modified = false;
        
        // 应用所有事件名称替换
        for (const { pattern, replacement } of EVENT_MAPPINGS) {
            if (pattern.test(content)) {
                content = content.replace(pattern, replacement);
                modified = true;
            }
        }
        
        // 如果内容被修改且需要导入
        if (modified && needsEventConstantsImport(content)) {
            const relativeFilePath = path.relative(path.join(__dirname, '../../src'), filePath);
            content = addEventConstantsImport(content, relativeFilePath);
            filesNeedingImport.add(filePath);
        }
        
        // 只在内容改变时写入
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (e) {
        console.error(`❌ Error processing ${filePath}:`, e.message);
        return false;
    }
}

function processDirectory(dir, excludeDirs = ['node_modules', 'dist', 'tests', '.git']) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let updatedCount = 0;
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            if (!excludeDirs.includes(file.name)) {
                updatedCount += processDirectory(fullPath, excludeDirs);
            }
        } else if (file.name.endsWith('.js') && !file.name.endsWith('.test.js')) {
            if (processFile(fullPath)) {
                updatedCount++;
            }
        }
    }
    
    return updatedCount;
}

console.log('🚀 开始迁移硬编码事件名称到事件常量...\n');

const srcPath = path.join(__dirname, '../../src');
const updatedCount = processDirectory(srcPath);

console.log(`\n✅ 迁移完成！`);
console.log(`📊 更新了 ${updatedCount} 个文件`);
console.log(`📦 添加导入的文件数: ${filesNeedingImport.size}`);
