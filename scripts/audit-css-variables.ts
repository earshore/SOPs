/**
 * CSS 变量审查脚本
 * 
 * 功能:
 * 1. 扫描所有 CSS 文件中使用的变量
 * 2. 检查是否符合命名规范
 * 3. 识别需要迁移的变量
 * 4. 生成迁移报告
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface VariableUsage {
  variable: string;
  file: string;
  line: number;
  context: string;
}

interface AuditResult {
  compliant: VariableUsage[];
  nonCompliant: VariableUsage[];
  deprecated: VariableUsage[];
  unknown: VariableUsage[];
}

// 命名规范模式
const NAMING_PATTERNS = {
  // 基础色板: --color-{palette}-{shade}
  colorPalette: /^--color-(slate|gray|blue|sky|indigo|violet|purple|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal|cyan)-(\d{2,3})$/,
  
  // 语义颜色: --color-{semantic}
  colorSemantic: /^--color-(primary|secondary|accent|success|warning|danger|error|info)(-light|-dark|-darker)?$/,
  
  // 文本颜色: --text-{variant}
  textColor: /^--text-(primary|secondary|tertiary|disabled|inverse)$/,
  
  // 背景颜色: --bg-{variant}
  bgColor: /^--bg-(primary|secondary|tertiary|surface|overlay)$/,
  
  // 边框颜色: --border-{variant}
  borderColor: /^--border-(default|light|dark|focus)$/,
  
  // 间距: --spacing-{value}
  spacing: /^--spacing-(\d+(\.\d+)?|px)$/,
  
  // 字体: --font-{property}
  font: /^--font-(sans|serif|mono|display|thin|extralight|light|regular|medium|semibold|bold|extrabold|black)$/,
  
  // 文本大小: --text-{size}
  textSize: /^--text-(2xs|xs|sm|base|md|lg|xl|2xl|3xl|4xl|5xl|6xl)(-line-height)?$/,
  
  // 行高: --leading-{variant}
  lineHeight: /^--leading-(none|tight|snug|normal|relaxed|loose)$/,
  
  // 字间距: --tracking-{variant}
  letterSpacing: /^--tracking-(tighter|tight|normal|wide|wider|widest)$/,
  
  // 圆角: --rounded-{size}
  borderRadius: /^--rounded(-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
  
  // 阴影: --shadow-{size}
  boxShadow: /^--shadow(-sm|-md|-lg|-xl|-2xl|-inner)?$/,
  
  // Z-index: --z-{level}
  zIndex: /^--z-(auto|\d+|dropdown|sticky|fixed|modal-backdrop|modal|popover|tooltip|toast|max)$/,
  
  // 缓动: --ease-{variant}
  easing: /^--ease-(linear|in|out|in-out|bounce|smooth)$/,
  
  // 时长: --duration-{value}
  duration: /^--duration-(\d+)$/,
  
  // 容器: --container-{property}
  container: /^--container-(max-width|padding(-sm|-md|-lg|-xl)?)$/,
};

// 已废弃的变量（需要迁移）
const DEPRECATED_VARIABLES = [
  /^--radius-/,  // 旧的圆角命名，应改为 --rounded-
  /^--color-primary-lighter$/,  // 应改为 --color-primary-light
  /^--color-warning-light$/,    // 应改为 --color-amber-400
  /^--color-success-lighter$/,  // 应改为 --color-green-400
];

function getAllCSSFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过 node_modules 和 dist
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        getAllCSSFiles(filePath, fileList);
      }
    } else if (file.endsWith('.css')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function extractVariables(content: string, filePath: string): VariableUsage[] {
  const usages: VariableUsage[] = [];
  const lines = content.split('\n');
  
  // 匹配 var(--variable-name) 或 --variable-name:
  const varPattern = /(?:var\((--[\w-]+)\)|^[\s]*(--[\w-]+)\s*:)/g;
  
  lines.forEach((line, index) => {
    let match;
    while ((match = varPattern.exec(line)) !== null) {
      const variable = match[1] || match[2];
      if (variable) {
        usages.push({
          variable,
          file: filePath,
          line: index + 1,
          context: line.trim()
        });
      }
    }
  });
  
  return usages;
}

function isCompliant(variable: string): boolean {
  return Object.values(NAMING_PATTERNS).some(pattern => pattern.test(variable));
}

function isDeprecated(variable: string): boolean {
  return DEPRECATED_VARIABLES.some(pattern => pattern.test(variable));
}

function auditCSSVariables(): AuditResult {
  const projectRoot = join(__dirname, '..');
  const srcDir = join(projectRoot, 'src');
  
  const cssFiles = getAllCSSFiles(srcDir);
  const result: AuditResult = {
    compliant: [],
    nonCompliant: [],
    deprecated: [],
    unknown: []
  };
  
  console.log(`🔍 扫描 ${cssFiles.length} 个 CSS 文件...\n`);
  
  for (const file of cssFiles) {
    const content = readFileSync(file, 'utf-8');
    const usages = extractVariables(content, relative(projectRoot, file));
    
    for (const usage of usages) {
      if (isDeprecated(usage.variable)) {
        result.deprecated.push(usage);
      } else if (isCompliant(usage.variable)) {
        result.compliant.push(usage);
      } else {
        result.nonCompliant.push(usage);
      }
    }
  }
  
  return result;
}

function generateReport(result: AuditResult): void {
  console.log('═'.repeat(80));
  console.log('CSS 变量审查报告');
  console.log('═'.repeat(80));
  console.log('');
  
  // 统计信息
  const total = result.compliant.length + result.nonCompliant.length + result.deprecated.length;
  const compliantRate = ((result.compliant.length / total) * 100).toFixed(1);
  
  console.log('📊 统计信息:');
  console.log(`   总变量使用: ${total}`);
  console.log(`   ✅ 符合规范: ${result.compliant.length} (${compliantRate}%)`);
  console.log(`   ⚠️  不符合规范: ${result.nonCompliant.length}`);
  console.log(`   🔄 已废弃: ${result.deprecated.length}`);
  console.log('');
  
  // 不符合规范的变量
  if (result.nonCompliant.length > 0) {
    console.log('⚠️  不符合规范的变量:');
    console.log('─'.repeat(80));
    
    const grouped = new Map<string, VariableUsage[]>();
    for (const usage of result.nonCompliant) {
      if (!grouped.has(usage.variable)) {
        grouped.set(usage.variable, []);
      }
      grouped.get(usage.variable)!.push(usage);
    }
    
    for (const [variable, usages] of grouped) {
      console.log(`\n   ${variable} (${usages.length} 处使用)`);
      usages.slice(0, 3).forEach(usage => {
        console.log(`      ${usage.file}:${usage.line}`);
      });
      if (usages.length > 3) {
        console.log(`      ... 还有 ${usages.length - 3} 处`);
      }
    }
    console.log('');
  }
  
  // 已废弃的变量
  if (result.deprecated.length > 0) {
    console.log('🔄 已废弃的变量（需要迁移）:');
    console.log('─'.repeat(80));
    
    const grouped = new Map<string, VariableUsage[]>();
    for (const usage of result.deprecated) {
      if (!grouped.has(usage.variable)) {
        grouped.set(usage.variable, []);
      }
      grouped.get(usage.variable)!.push(usage);
    }
    
    for (const [variable, usages] of grouped) {
      console.log(`\n   ${variable} (${usages.length} 处使用)`);
      
      // 提供迁移建议
      let suggestion = '';
      if (variable.startsWith('--radius-')) {
        suggestion = variable.replace('--radius-', '--rounded-');
      } else if (variable === '--color-primary-lighter') {
        suggestion = '--color-primary-light';
      } else if (variable === '--color-warning-light') {
        suggestion = '--color-amber-400';
      } else if (variable === '--color-success-lighter') {
        suggestion = '--color-green-400';
      }
      
      if (suggestion) {
        console.log(`      建议迁移到: ${suggestion}`);
      }
      
      usages.slice(0, 3).forEach(usage => {
        console.log(`      ${usage.file}:${usage.line}`);
      });
      if (usages.length > 3) {
        console.log(`      ... 还有 ${usages.length - 3} 处`);
      }
    }
    console.log('');
  }
  
  // 总结
  console.log('═'.repeat(80));
  if (result.nonCompliant.length === 0 && result.deprecated.length === 0) {
    console.log('🎉 所有 CSS 变量都符合命名规范！');
  } else {
    console.log('📋 下一步行动:');
    if (result.nonCompliant.length > 0) {
      console.log(`   1. 重命名 ${result.nonCompliant.length} 个不符合规范的变量`);
    }
    if (result.deprecated.length > 0) {
      console.log(`   2. 迁移 ${result.deprecated.length} 个已废弃的变量`);
    }
    console.log('   3. 运行 npm run generate:tokens 重新生成配置');
  }
  console.log('═'.repeat(80));
}

// 执行审查
const result = auditCSSVariables();
generateReport(result);
