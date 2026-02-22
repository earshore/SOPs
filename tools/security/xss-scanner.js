#!/usr/bin/env node
// tools/xss-scanner.js
// ================================================================
// 🔒 P0修复: XSS风险自动扫描工具
// 扫描所有JS文件中的innerHTML使用,生成风险报告和修复建议
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
    srcDir: path.join(__dirname, '../src'),
    excludeDirs: ['node_modules', 'dist', 'tests', 'test'],
    outputFile: path.join(__dirname, '../docs/XSS_SCAN_REPORT.md'),
    
    // 风险模式
    patterns: {
        innerHTML: /(\w+)\.innerHTML\s*[=+]\s*(.+)/g,
        outerHTML: /(\w+)\.outerHTML\s*=\s*(.+)/g,
        insertAdjacentHTML: /(\w+)\.insertAdjacentHTML\s*\(/g,
        documentWrite: /document\.write\s*\(/g,
        eval: /eval\s*\(/g
    },
    
    // 高危关键词 (表示可能包含用户输入)
    dangerousKeywords: [
        'userInput', 'user', 'input', 'value', 'data', 'product',
        'asin', 'title', 'description', 'comment', 'review',
        'prompt', 'message', 'content', 'text', 'name',
        'llm', 'response', 'result', 'output'
    ],
    
    // 安全关键词 (表示已经过安全处理)
    safeKeywords: [
        'escapeHtml', 'setSafeHtml', 'setInnerHTML', 'setTemplate',
        'createSafeFragment', 'sanitize', 'escape'
    ]
};

// 风险等级
const RISK_LEVELS = {
    CRITICAL: { level: 'CRITICAL', icon: '🔴', score: 10 },
    HIGH: { level: 'HIGH', icon: '🟠', score: 7 },
    MEDIUM: { level: 'MEDIUM', icon: '🟡', score: 5 },
    LOW: { level: 'LOW', icon: '🟢', score: 3 },
    INFO: { level: 'INFO', icon: '⚪', score: 1 }
};

// 扫描结果
const results = {
    files: [],
    totalRisks: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0
};

/**
 * 递归扫描目录
 */
function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // 跳过排除的目录
            if (CONFIG.excludeDirs.includes(file)) continue;
            scanDirectory(filePath);
        } else if (file.endsWith('.js')) {
            scanFile(filePath);
        }
    }
}

/**
 * 扫描单个文件
 */
function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    
    const fileRisks = [];
    
    // 扫描每种风险模式
    for (const [patternName, pattern] of Object.entries(CONFIG.patterns)) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            const lineContent = lines[lineNumber - 1].trim();
            
            // 提取完整的代码片段（包括多行）
            const fullCode = extractFullCode(lines, lineNumber - 1, lineContent);
            
            // 分析风险等级
            const risk = analyzeRisk(patternName, match, fullCode, content);
            
            fileRisks.push({
                line: lineNumber,
                pattern: patternName,
                code: fullCode,
                risk: risk.level,
                score: risk.score,
                reason: risk.reason,
                suggestion: risk.suggestion
            });
        }
    }
    
    if (fileRisks.length > 0) {
        // 按风险等级排序
        fileRisks.sort((a, b) => b.score - a.score);
        
        results.files.push({
            path: relativePath,
            risks: fileRisks,
            totalScore: fileRisks.reduce((sum, r) => sum + r.score, 0)
        });
        
        results.totalRisks += fileRisks.length;
        
        // 统计各等级数量
        fileRisks.forEach(r => {
            switch (r.risk) {
                case 'CRITICAL': results.criticalCount++; break;
                case 'HIGH': results.highCount++; break;
                case 'MEDIUM': results.mediumCount++; break;
                case 'LOW': results.lowCount++; break;
                case 'INFO': results.infoCount++; break;
            }
        });
    }
}

/**
 * 提取完整的代码片段（处理多行情况）
 */
function extractFullCode(lines, lineIndex, firstLine) {
    // 如果是单行赋值，直接返回
    if (firstLine.includes(';') && !firstLine.endsWith('`')) {
        return firstLine;
    }
    
    // 如果是模板字符串或多行赋值，提取完整内容
    let code = firstLine;
    let currentIndex = lineIndex + 1;
    let openBackticks = (firstLine.match(/`/g) || []).length;
    let openBraces = (firstLine.match(/\{/g) || []).length - (firstLine.match(/\}/g) || []).length;
    let openParens = (firstLine.match(/\(/g) || []).length - (firstLine.match(/\)/g) || []).length;
    
    // 继续读取直到找到结束标记
    while (currentIndex < lines.length && currentIndex < lineIndex + 20) { // 最多20行
        const nextLine = lines[currentIndex].trim();
        code += '\n' + nextLine;
        
        // 更新计数
        openBackticks += (nextLine.match(/`/g) || []).length;
        openBraces += (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
        openParens += (nextLine.match(/\(/g) || []).length - (nextLine.match(/\)/g) || []).length;
        
        // 检查是否结束
        if (openBackticks % 2 === 0 && openBraces <= 0 && openParens <= 0 && nextLine.includes(';')) {
            break;
        }
        
        currentIndex++;
    }
    
    return code;
}

/**
 * 分析风险等级
 */
function analyzeRisk(patternName, match, lineContent, _fileContent) {
    let score = 5; // 默认中等风险
    let reasons = [];
    
    // 1. 检查是否包含高危关键词
    const hasDangerousKeyword = CONFIG.dangerousKeywords.some(keyword => 
        lineContent.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasDangerousKeyword) {
        score += 3;
        reasons.push('包含用户输入相关变量');
    }
    
    // 2. 检查是否已使用安全函数
    const hasSafeKeyword = CONFIG.safeKeywords.some(keyword => 
        lineContent.includes(keyword)
    );
    
    if (hasSafeKeyword) {
        score -= 4;
        reasons.push('已使用安全函数');
    }
    
    // 3. 检查是否为静态模板
    if (lineContent.includes('loadTemplate') || lineContent.includes('template.html')) {
        score -= 2;
        reasons.push('静态模板加载');
    }
    
    // 4. 检查是否在字符串模板中
    if (lineContent.includes('${') || lineContent.includes('`')) {
        score += 2;
        reasons.push('使用模板字符串');
    }
    
    // 5. 特殊模式额外加分
    if (patternName === 'eval') {
        score += 5;
        reasons.push('使用eval()函数');
    }
    
    if (patternName === 'documentWrite') {
        score += 3;
        reasons.push('使用document.write()');
    }
    
    // 确定风险等级
    let level, suggestion;
    
    if (score >= 10) {
        level = RISK_LEVELS.CRITICAL;
        suggestion = '🚨 立即修复: 使用 escapeHtml() 转义所有变量';
    } else if (score >= 7) {
        level = RISK_LEVELS.HIGH;
        suggestion = '⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()';
    } else if (score >= 5) {
        level = RISK_LEVELS.MEDIUM;
        suggestion = '📋 建议修复: 审查变量来源,必要时转义';
    } else if (score >= 3) {
        level = RISK_LEVELS.LOW;
        suggestion = '✅ 低风险: 确认为静态内容或已安全处理';
    } else {
        level = RISK_LEVELS.INFO;
        suggestion = 'ℹ️ 信息: 已使用安全函数,无需修改';
    }
    
    return {
        level: level.level,
        score: level.score,
        reason: reasons.join(', ') || '使用innerHTML',
        suggestion
    };
}

/**
 * 生成Markdown报告
 */
function generateReport() {
    // 按总分排序文件
    results.files.sort((a, b) => b.totalScore - a.totalScore);
    
    let report = `# XSS风险扫描报告

**扫描时间**: ${new Date().toLocaleString('zh-CN')}  
**扫描目录**: \`src/\`  
**扫描文件数**: ${results.files.length}  
**发现风险点**: ${results.totalRisks}

---

## 📊 风险统计

| 风险等级 | 数量 | 占比 |
|---------|------|------|
| 🔴 严重 (CRITICAL) | ${results.criticalCount} | ${((results.criticalCount / results.totalRisks) * 100).toFixed(1)}% |
| 🟠 高危 (HIGH) | ${results.highCount} | ${((results.highCount / results.totalRisks) * 100).toFixed(1)}% |
| 🟡 中危 (MEDIUM) | ${results.mediumCount} | ${((results.mediumCount / results.totalRisks) * 100).toFixed(1)}% |
| 🟢 低危 (LOW) | ${results.lowCount} | ${((results.lowCount / results.totalRisks) * 100).toFixed(1)}% |
| ⚪ 信息 (INFO) | ${results.infoCount} | ${((results.infoCount / results.totalRisks) * 100).toFixed(1)}% |

---

## 🎯 修复优先级

### 立即修复 (P0)
需要在发布前修复的严重和高危风险: **${results.criticalCount + results.highCount}** 处

### 计划修复 (P1)
建议在下个版本修复的中危风险: **${results.mediumCount}** 处

### 可选修复 (P2)
低风险和信息级别: **${results.lowCount + results.infoCount}** 处

---

## 📋 详细风险列表

`;

    // 生成每个文件的详细报告
    results.files.forEach((file, index) => {
        const criticalRisks = file.risks.filter(r => r.risk === 'CRITICAL');
        const highRisks = file.risks.filter(r => r.risk === 'HIGH');
        
        report += `### ${index + 1}. \`${file.path}\`\n\n`;
        report += `**风险评分**: ${file.totalScore} | `;
        report += `**风险数量**: ${file.risks.length} `;
        
        if (criticalRisks.length > 0) {
            report += `| 🔴 ${criticalRisks.length} 严重 `;
        }
        if (highRisks.length > 0) {
            report += `| 🟠 ${highRisks.length} 高危`;
        }
        
        report += `\n\n`;
        
        // 列出所有风险点
        file.risks.forEach((risk, riskIndex) => {
            const icon = RISK_LEVELS[risk.risk].icon;
            report += `#### ${icon} 风险 #${riskIndex + 1} - 第 ${risk.line} 行\n\n`;
            report += `**风险等级**: ${risk.risk} (${risk.score}分)  \n`;
            report += `**风险原因**: ${risk.reason}  \n`;
            report += `**代码片段**:\n\`\`\`javascript\n${risk.code}\n\`\`\`\n\n`;
            report += `**修复建议**: ${risk.suggestion}\n\n`;
            
            // 生成修复示例
            if (risk.risk === 'CRITICAL' || risk.risk === 'HIGH') {
                report += generateFixExample(risk.code, risk.pattern);
            }
            
            report += `---\n\n`;
        });
    });
    
    // 添加修复指南
    report += `
## 🔧 修复指南

### 方法1: 使用 escapeHtml (推荐)

\`\`\`javascript
import { escapeHtml } from '@/common/utils/security.js';

// ❌ 危险
element.innerHTML = \`<div>\${userInput}</div>\`;

// ✅ 安全
element.innerHTML = \`<div>\${escapeHtml(userInput)}</div>\`;
\`\`\`

### 方法2: 使用 setTemplate

\`\`\`javascript
import { setTemplate } from '@/common/utils/xssFixer.js';

// ❌ 危险
element.innerHTML = \`<div class="title">\${product.title}</div>\`;

// ✅ 安全
setTemplate(element, '<div class="title">\${title}</div>', { title: product.title });
\`\`\`

### 方法3: 使用 renderList (列表渲染)

\`\`\`javascript
import { renderList } from '@/common/utils/xssFixer.js';

// ❌ 危险
container.innerHTML = products.map(p => \`<div>\${p.title}</div>\`).join('');

// ✅ 安全
renderList(container, products, (p) => \`<div>\${p.title}</div>\`);
\`\`\`

### 方法4: 纯文本使用 textContent

\`\`\`javascript
// ❌ 危险
element.innerHTML = userInput;

// ✅ 安全
element.textContent = userInput;
\`\`\`

---

## 📝 自动修复脚本

运行以下命令生成修复补丁:

\`\`\`bash
node tools/xss-fixer.js --auto-fix
\`\`\`

---

**报告生成**: XSS Scanner v1.0  
**下次扫描**: 修复后重新运行 \`node tools/xss-scanner.js\`
`;

    return report;
}

/**
 * 生成修复示例
 */
function generateFixExample(code, pattern) {
    let example = '**修复示例**:\n```javascript\n';
    
    if (pattern === 'innerHTML') {
        // 提取变量名
        const match = code.match(/innerHTML\s*[=+]\s*(.+)/);
        if (match) {
            const value = match[1].trim();
            
            if (value.includes('`') && value.includes('${')) {
                // 模板字符串
                example += `// 原代码\n${code}\n\n`;
                example += `// 修复后\nimport { escapeHtml } from '@/common/utils/security.js';\n`;
                example += code.replace(/\$\{(\w+)\}/g, '${escapeHtml($1)}');
            } else {
                // 普通赋值
                example += `// 原代码\n${code}\n\n`;
                example += `// 修复后\nimport { setSafeHtml } from '@/common/utils/security.js';\n`;
                example += code.replace('innerHTML =', 'textContent =');
            }
        }
    }
    
    example += '\n```\n\n';
    return example;
}

/**
 * 主函数
 */
function main() {
    console.log('🔍 开始扫描XSS风险...\n');
    console.log(`📁 扫描目录: ${CONFIG.srcDir}`);
    console.log(`📄 输出报告: ${CONFIG.outputFile}\n`);
    
    // 扫描目录
    scanDirectory(CONFIG.srcDir);
    
    // 生成报告
    const report = generateReport();
    
    // 写入文件
    fs.writeFileSync(CONFIG.outputFile, report, 'utf-8');
    
    // 输出统计
    console.log('✅ 扫描完成!\n');
    console.log('📊 统计结果:');
    console.log(`   - 扫描文件: ${results.files.length}`);
    console.log(`   - 风险总数: ${results.totalRisks}`);
    console.log(`   - 🔴 严重: ${results.criticalCount}`);
    console.log(`   - 🟠 高危: ${results.highCount}`);
    console.log(`   - 🟡 中危: ${results.mediumCount}`);
    console.log(`   - 🟢 低危: ${results.lowCount}`);
    console.log(`   - ⚪ 信息: ${results.infoCount}`);
    console.log(`\n📄 详细报告: ${CONFIG.outputFile}`);
    
    // 返回退出码
    if (results.criticalCount > 0) {
        console.log('\n⚠️  发现严重风险,请立即修复!');
        process.exit(1);
    } else if (results.highCount > 0) {
        console.log('\n⚠️  发现高危风险,建议尽快修复!');
        process.exit(0);
    } else {
        console.log('\n✅ 未发现严重风险');
        process.exit(0);
    }
}

// 运行
main();
