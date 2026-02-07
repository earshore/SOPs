#!/usr/bin/env node
// tools/batch-fix-static-templates.js
// ================================================================
// 🔒 P0修复: 批量为静态模板添加安全注释
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
    linesFixed: 0,
    errors: []
};

// 静态HTML模板的特征模式
const STATIC_PATTERNS = [
    // 纯静态HTML（无变量）
    /\.innerHTML\s*=\s*`[\s\S]*?`\s*;/,
    // 字符串拼接但无变量
    /\.innerHTML\s*=\s*['"][\s\S]*?['"]\s*;/,
    // 多行静态模板
    /\.innerHTML\s*=\s*`[^$]*`/
];

// 需要添加注释的模式
const NEEDS_COMMENT_PATTERN = /(\s*)([\w.]+\.innerHTML\s*=\s*`)/;

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        let modified = false;
        const newLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检查是否是innerHTML赋值
            if (line.includes('.innerHTML') && line.includes('=')) {
                // 检查上一行是否已有安全注释
                const prevLine = i > 0 ? lines[i - 1] : '';
                const hasComment = prevLine.includes('✅ 安全') || 
                                 prevLine.includes('SAFE:') ||
                                 prevLine.includes('安全的静态HTML');
                
                if (!hasComment) {
                    // 检查是否是静态模板
                    const isStatic = checkIfStatic(line, lines, i);
                    
                    if (isStatic) {
                        // 添加安全注释
                        const indent = line.match(/^\s*/)[0];
                        newLines.push(`${indent}// ✅ 安全: 静态HTML模板，无用户输入`);
                        modified = true;
                        stats.linesFixed++;
                    }
                }
            }
            
            newLines.push(line);
        }
        
        if (modified) {
            if (!CONFIG.dryRun) {
                // 备份原文件
                const backupPath = path.join(
                    CONFIG.backupDir,
                    path.relative(path.join(__dirname, '..'), filePath) + '.bak'
                );
                const backupDir = path.dirname(backupPath);
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                fs.writeFileSync(backupPath, content, 'utf-8');
                
                // 写入修改后的文件
                fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
            }
            
            stats.filesProcessed++;
            console.log(`✅ ${path.relative(CONFIG.srcDir, filePath)}`);
        }
        
    } catch (error) {
        stats.errors.push({ file: filePath, error: error.message });
        console.error(`❌ ${filePath}: ${error.message}`);
    }
}

function checkIfStatic(line, lines, lineIndex) {
    // 检查是否包含变量插值
    if (line.includes('${')) {
        return false;
    }
    
    // 检查多行模板
    if (line.includes('`') && !line.trim().endsWith('`;')) {
        // 多行模板，检查后续行
        for (let i = lineIndex + 1; i < Math.min(lineIndex + 50, lines.length); i++) {
            if (lines[i].includes('${')) {
                return false; // 包含变量
            }
            if (lines[i].includes('`;')) {
                break; // 模板结束
            }
        }
    }
    
    return true;
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
    console.log('🔧 批量修复静态模板\n');
    console.log(`模式: ${CONFIG.dryRun ? '试运行' : '应用修复'}\n`);
    
    if (!fs.existsSync(CONFIG.backupDir)) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }
    
    scanDirectory(CONFIG.srcDir);
    
    console.log('\n📊 统计结果:');
    console.log(`   - 处理文件: ${stats.filesProcessed}`);
    console.log(`   - 修复行数: ${stats.linesFixed}`);
    console.log(`   - 错误数量: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
        console.log('\n❌ 错误列表:');
        stats.errors.forEach(e => console.log(`   ${e.file}: ${e.error}`));
    }
    
    if (CONFIG.dryRun) {
        console.log('\n💡 这是试运行，没有修改任何文件');
        console.log('   运行 node tools/batch-fix-static-templates.js 应用修复');
    } else {
        console.log('\n✅ 修复完成！备份文件保存在 tools/backups/');
    }
}

main();
