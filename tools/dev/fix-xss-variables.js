#!/usr/bin/env node
// tools/fix-xss-variables.js
// ================================================================
// 🔒 P0修复: 自动转义innerHTML中的变量
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    srcDir: path.join(__dirname, '../src'),
    backupDir: path.join(__dirname, '../tools/backups'),
    dryRun: process.argv.includes('--dry-run')
};

const stats = {
    filesProcessed: 0,
    variablesEscaped: 0,
    importsAdded: 0,
    errors: []
};

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;
        
        // 检查是否已导入escapeHtml
        const hasEscapeImport = content.includes('escapeHtml');
        
        // 查找所有包含变量的innerHTML赋值
        const regex = /\.innerHTML\s*=\s*`([^`]*\$\{[^`]*)`/g;
        let match;
        const replacements = [];
        
        while ((match = regex.exec(content)) !== null) {
            const fullMatch = match[0];
            const templateContent = match[1];
            
            // 检查是否已经转义
            if (templateContent.includes('escapeHtml(')) {
                continue;
            }
            
            // 转义所有变量
            const escapedTemplate = templateContent.replace(/\$\{([^}]+)\}/g, (m, varName) => {
                // 跳过已经是函数调用的情况
                if (varName.trim().includes('(')) {
                    return m;
                }
                stats.variablesEscaped++;
                return `\${escapeHtml(${varName})}`;
            });
            
            const newMatch = fullMatch.replace(templateContent, escapedTemplate);
            replacements.push({ old: fullMatch, new: newMatch });
            modified = true;
        }
        
        // 应用替换
        if (modified) {
            replacements.forEach(r => {
                content = content.replace(r.old, r.new);
            });
            
            // 添加import（如果需要）
            if (!hasEscapeImport) {
                // 查找第一个import语句的位置
                const importMatch = content.match(/^import\s+/m);
                if (importMatch) {
                    const insertPos = importMatch.index;
                    const importStatement = "import { escapeHtml } from '@/common/utils/security.js';\n";
                    content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
                    stats.importsAdded++;
                } else {
                    // 没有import语句，添加到文件开头
                    content = "import { escapeHtml } from '@/common/utils/security.js';\n\n" + content;
                    stats.importsAdded++;
                }
            }
            
            if (!CONFIG.dryRun) {
                // 备份
                const backupPath = path.join(
                    CONFIG.backupDir,
                    path.relative(path.join(__dirname, '..'), filePath) + '.bak'
                );
                const backupDir = path.dirname(backupPath);
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf-8'), 'utf-8');
                
                // 写入修改
                fs.writeFileSync(filePath, content, 'utf-8');
            }
            
            stats.filesProcessed++;
            console.log(`✅ ${path.relative(CONFIG.srcDir, filePath)}`);
        }
        
    } catch (error) {
        stats.errors.push({ file: filePath, error: error.message });
        console.error(`❌ ${filePath}: ${error.message}`);
    }
}

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (!['node_modules', 'dist', 'tests'].includes(file)) {
                scanDirectory(filePath);
            }
        } else if (file.endsWith('.js')) {
            processFile(filePath);
        }
    }
}

function main() {
    console.log('🔧 自动转义XSS变量\n');
    console.log(`模式: ${CONFIG.dryRun ? '试运行' : '应用修复'}\n`);
    
    if (!fs.existsSync(CONFIG.backupDir)) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }
    
    scanDirectory(CONFIG.srcDir);
    
    console.log('\n📊 统计结果:');
    console.log(`   - 处理文件: ${stats.filesProcessed}`);
    console.log(`   - 转义变量: ${stats.variablesEscaped}`);
    console.log(`   - 添加导入: ${stats.importsAdded}`);
    console.log(`   - 错误数量: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
        console.log('\n❌ 错误列表:');
        stats.errors.forEach(e => console.log(`   ${e.file}: ${e.error}`));
    }
    
    if (CONFIG.dryRun) {
        console.log('\n💡 这是试运行，没有修改任何文件');
        console.log('   运行 node tools/fix-xss-variables.js 应用修复');
    } else {
        console.log('\n✅ 修复完成！备份文件保存在 tools/backups/');
    }
}

main();
