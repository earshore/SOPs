#!/usr/bin/env node
// tools/xss-fixer.js
// ================================================================
// 🔒 P0修复: XSS自动修复工具
// 根据扫描报告自动生成修复补丁
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
    srcDir: path.join(__dirname, '../src'),
    reportFile: path.join(__dirname, '../docs/XSS_SCAN_REPORT.md'),
    patchDir: path.join(__dirname, '../tools/patches'),
    backupDir: path.join(__dirname, '../tools/backups'),
    
    // 修复模式
    mode: process.argv.includes('--auto-fix') ? 'auto' : 'manual',
    dryRun: process.argv.includes('--dry-run'),
    
    // 修复策略
    strategies: {
        // 静态模板 - 信任内容
        staticTemplate: {
            pattern: /loadTemplate|template\.html/,
            action: 'trust'
        },
        
        // 模板字符串 - 转义变量
        templateString: {
            pattern: /`.*\$\{.*\}.*`/,
            action: 'escape'
        },
        
        // 纯变量赋值 - 使用textContent
        pureVariable: {
            pattern: /innerHTML\s*=\s*(\w+)$/,
            action: 'textContent'
        },
        
        // 列表渲染 - 使用renderList
        listRender: {
            pattern: /\.map\(.*\)\.join\(/,
            action: 'renderList'
        }
    }
};

// 修复统计
const stats = {
    totalFiles: 0,
    fixedFiles: 0,
    totalRisks: 0,
    fixedRisks: 0,
    skippedRisks: 0,
    errors: []
};

/**
 * 主函数
 */
function main() {
    console.log('🔧 XSS自动修复工具\n');
    console.log(`模式: ${CONFIG.mode === 'auto' ? '自动修复' : '手动审查'}`);
    console.log(`试运行: ${CONFIG.dryRun ? '是' : '否'}\n`);
    
    // 创建必要的目录
    if (!fs.existsSync(CONFIG.patchDir)) {
        fs.mkdirSync(CONFIG.patchDir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.backupDir)) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }
    
    // 读取扫描报告
    if (!fs.existsSync(CONFIG.reportFile)) {
        console.error('❌ 未找到扫描报告,请先运行: node tools/xss-scanner.js');
        process.exit(1);
    }
    
    const report = fs.readFileSync(CONFIG.reportFile, 'utf-8');
    const risks = parseReport(report);
    
    console.log(`📋 发现 ${risks.length} 个风险点\n`);
    
    // 按文件分组
    const fileGroups = groupByFile(risks);
    stats.totalFiles = Object.keys(fileGroups).length;
    stats.totalRisks = risks.length;
    
    // 处理每个文件
    for (const [filePath, fileRisks] of Object.entries(fileGroups)) {
        processFile(filePath, fileRisks);
    }
    
    // 输出统计
    printStats();
}

/**
 * 解析扫描报告
 */
function parseReport(report) {
    const risks = [];
    const fileRegex = /### \d+\. `(.+?)`/g;
    const riskRegex = /#### (.+?) 风险 #\d+ - 第 (\d+) 行[\s\S]*?\*\*风险等级\*\*: (\w+)[\s\S]*?\*\*代码片段\*\*:\s*```javascript\s*(.+?)\s*```/g;
    
    let currentFile = null;
    let fileMatch;
    
    while ((fileMatch = fileRegex.exec(report)) !== null) {
        currentFile = fileMatch[1];
        
        // 提取该文件的所有风险
        const fileSection = report.substring(fileMatch.index);
        const nextFileIndex = fileSection.indexOf('### ', 10);
        const fileContent = nextFileIndex > 0 ? fileSection.substring(0, nextFileIndex) : fileSection;
        
        let riskMatch;
        const riskRegexLocal = new RegExp(riskRegex.source, riskRegex.flags);
        
        while ((riskMatch = riskRegexLocal.exec(fileContent)) !== null) {
            risks.push({
                file: currentFile,
                line: parseInt(riskMatch[2]),
                level: riskMatch[3],
                code: riskMatch[4].trim()
            });
        }
    }
    
    return risks;
}

/**
 * 按文件分组
 */
function groupByFile(risks) {
    const groups = {};
    
    for (const risk of risks) {
        if (!groups[risk.file]) {
            groups[risk.file] = [];
        }
        groups[risk.file].push(risk);
    }
    
    return groups;
}

/**
 * 处理单个文件
 */
function processFile(relativePath, risks) {
    const filePath = path.join(__dirname, '..', relativePath);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ 文件不存在: ${relativePath}`);
        stats.errors.push({ file: relativePath, error: '文件不存在' });
        return;
    }
    
    console.log(`\n📄 处理文件: ${relativePath}`);
    console.log(`   风险数量: ${risks.length}`);
    
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // 备份原文件
    if (!CONFIG.dryRun) {
        const backupPath = path.join(CONFIG.backupDir, path.basename(filePath) + '.bak');
        fs.writeFileSync(backupPath, content, 'utf-8');
    }
    
    // 按行号排序(从后往前修复,避免行号变化)
    risks.sort((a, b) => b.line - a.line);
    
    let modified = false;
    const fixes = [];
    
    for (const risk of risks) {
        const lineIndex = risk.line - 1;
        const originalLine = lines[lineIndex];
        
        // 确认代码匹配
        if (!originalLine || !originalLine.includes('innerHTML')) {
            console.log(`   ⚠️  第 ${risk.line} 行: 代码不匹配,跳过`);
            stats.skippedRisks++;
            continue;
        }
        
        // 生成修复
        const fix = generateFix(originalLine, risk);
        
        if (fix) {
            fixes.push({
                line: risk.line,
                original: originalLine,
                fixed: fix.code,
                imports: fix.imports,
                explanation: fix.explanation
            });
            
            lines[lineIndex] = fix.code;
            modified = true;
            stats.fixedRisks++;
            
            console.log(`   ✅ 第 ${risk.line} 行: ${fix.explanation}`);
        } else {
            console.log(`   ⚠️  第 ${risk.line} 行: 无法自动修复,需要手动处理`);
            stats.skippedRisks++;
        }
    }
    
    if (modified) {
        // 添加必要的import
        const imports = collectImports(fixes);
        if (imports.length > 0) {
            const importLines = generateImportLines(imports);
            lines.unshift(...importLines);
        }
        
        // 写入修复后的文件
        if (!CONFIG.dryRun) {
            fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
            console.log(`   💾 已保存修复`);
        } else {
            console.log(`   🔍 试运行模式,未实际修改文件`);
        }
        
        // 生成补丁文件
        generatePatch(relativePath, fixes);
        
        stats.fixedFiles++;
    } else {
        console.log(`   ℹ️  无需修复或无法自动修复`);
    }
}

/**
 * 生成修复代码
 */
function generateFix(line, risk) {
    const trimmed = line.trim();
    
    // 策略1: 静态模板加载 - 信任内容
    if (trimmed.includes('loadTemplate') || trimmed.includes('template.html')) {
        return {
            code: line, // 不修改
            imports: [],
            explanation: '静态模板,已信任'
        };
    }
    
    // 策略2: 纯变量赋值 - 改用textContent
    const pureVarMatch = trimmed.match(/(\s*)(\w+)\.innerHTML\s*=\s*(\w+);?/);
    if (pureVarMatch && !trimmed.includes('`') && !trimmed.includes('+')) {
        const [, indent, element, variable] = pureVarMatch;
        return {
            code: `${indent}${element}.textContent = ${variable};`,
            imports: [],
            explanation: '纯变量赋值 → textContent'
        };
    }
    
    // 策略3: 模板字符串 - 转义变量
    if (trimmed.includes('`') && trimmed.includes('${')) {
        const escaped = trimmed.replace(/\$\{(\w+)\}/g, '${escapeHtml($1)}');
        return {
            code: line.replace(trimmed, escaped),
            imports: ['escapeHtml'],
            explanation: '模板字符串 → escapeHtml转义'
        };
    }
    
    // 策略4: 字符串拼接 - 使用setTemplate
    if (trimmed.includes('+') && trimmed.includes('innerHTML')) {
        // 复杂情况,建议手动处理
        return null;
    }
    
    // 策略5: 列表渲染 - 使用renderList
    if (trimmed.includes('.map(') && trimmed.includes('.join(')) {
        // 需要重构,建议手动处理
        return null;
    }
    
    // 默认: 使用setSafeHtml
    const match = trimmed.match(/(\s*)(\w+)\.innerHTML\s*=\s*(.+);?/);
    if (match) {
        const [, indent, element, value] = match;
        return {
            code: `${indent}setSafeHtml(${element}, ${value});`,
            imports: ['setSafeHtml'],
            explanation: '使用setSafeHtml'
        };
    }
    
    return null;
}

/**
 * 收集需要的imports
 */
function collectImports(fixes) {
    const imports = new Set();
    
    for (const fix of fixes) {
        if (fix.imports) {
            fix.imports.forEach(imp => imports.add(imp));
        }
    }
    
    return Array.from(imports);
}

/**
 * 生成import语句
 */
function generateImportLines(imports) {
    const lines = [];
    
    if (imports.length > 0) {
        lines.push(`// 🔒 P0修复: XSS防护`);
        lines.push(`import { ${imports.join(', ')} } from '@/common/utils/security.js';`);
        lines.push('');
    }
    
    return lines;
}

/**
 * 生成补丁文件
 */
function generatePatch(filePath, fixes) {
    const patchPath = path.join(
        CONFIG.patchDir,
        filePath.replace(/\//g, '_') + '.patch'
    );
    
    let patch = `# XSS修复补丁\n\n`;
    patch += `**文件**: ${filePath}  \n`;
    patch += `**修复数量**: ${fixes.length}  \n`;
    patch += `**生成时间**: ${new Date().toLocaleString('zh-CN')}  \n\n`;
    patch += `---\n\n`;
    
    fixes.forEach((fix, index) => {
        patch += `## 修复 #${index + 1} - 第 ${fix.line} 行\n\n`;
        patch += `**说明**: ${fix.explanation}\n\n`;
        patch += `**原代码**:\n\`\`\`javascript\n${fix.original}\n\`\`\`\n\n`;
        patch += `**修复后**:\n\`\`\`javascript\n${fix.fixed}\n\`\`\`\n\n`;
        
        if (fix.imports && fix.imports.length > 0) {
            patch += `**需要导入**: \`${fix.imports.join(', ')}\`\n\n`;
        }
        
        patch += `---\n\n`;
    });
    
    fs.writeFileSync(patchPath, patch, 'utf-8');
}

/**
 * 输出统计信息
 */
function printStats() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 修复统计\n');
    console.log(`处理文件: ${stats.fixedFiles}/${stats.totalFiles}`);
    console.log(`修复风险: ${stats.fixedRisks}/${stats.totalRisks}`);
    console.log(`跳过风险: ${stats.skippedRisks}`);
    
    if (stats.errors.length > 0) {
        console.log(`\n❌ 错误: ${stats.errors.length}`);
        stats.errors.forEach(err => {
            console.log(`   - ${err.file}: ${err.error}`);
        });
    }
    
    console.log('\n💾 备份目录: ' + CONFIG.backupDir);
    console.log('📄 补丁目录: ' + CONFIG.patchDir);
    
    if (CONFIG.dryRun) {
        console.log('\n🔍 试运行模式,未实际修改文件');
        console.log('   移除 --dry-run 参数以应用修复');
    } else {
        console.log('\n✅ 修复已应用');
        console.log('   如需回滚,请从备份目录恢复文件');
    }
    
    console.log('='.repeat(50));
}

// 运行
main();
