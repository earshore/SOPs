// tools/dev/fix-ts-imports.js
// 批量修复对已迁移到TypeScript模块的.js扩展名引用
// 保持UTF-8编码

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 已迁移到TypeScript的模块列表
const TS_MODULES = [
    // Services
    'httpService',
    'storageService',
    'loggerService',
    'errorService',
    'monitoringService',
    'performanceService',
    'PriorityRequestPool',
    'llmService',
    // Utils
    'typeGuards',
    'LoadingManager',
    'security',
    'ModuleLoader',
    'actionRegistry',
    'eventLogger',
    'lazyLibs',
    'pluginLoader',
    'secureStorage',
    'xssFixer',
    'viewLoader',
    // Core
    'Container',
    'EventBus',
    'StateManager',
    'Router',
    'RouteGuard',
    'RouteMiddleware',
    'ErrorHandler',
    'menuConfig',
    'ConfigCenter',
    'eventConstants'
];

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // 为每个TS模块创建替换规则
        for (const moduleName of TS_MODULES) {
            // 匹配 from './path/moduleName.js' 或 from "./path/moduleName.js"
            const pattern1 = new RegExp(`from (['"](.*?/)?)${moduleName}\\.js(['"])`, 'g');
            const pattern2 = new RegExp(`import\\((['"](.*?/)?)${moduleName}\\.js(['"])\\)`, 'g');
            
            if (pattern1.test(content) || pattern2.test(content)) {
                content = content.replace(pattern1, `from $1${moduleName}$3`);
                content = content.replace(pattern2, `import($1${moduleName}$3)`);
            }
        }
        
        // 只在内容改变时写入
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (e) {
        console.error(`❌ Error processing ${filePath}:`, e.message);
        return false;
    }
}

function processDirectory(dir, excludeDirs = ['node_modules', 'dist', '.git']) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let fixedCount = 0;
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            if (!excludeDirs.includes(file.name)) {
                fixedCount += processDirectory(fullPath, excludeDirs);
            }
        } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
            if (processFile(fullPath)) {
                fixedCount++;
            }
        }
    }
    
    return fixedCount;
}

console.log('🚀 开始修复TypeScript模块导入...\n');

const srcPath = path.join(__dirname, '../../src');
const fixedCount = processDirectory(srcPath);

console.log(`\n✅ 修复完成！`);
console.log(`📊 修复了 ${fixedCount} 个文件`);
