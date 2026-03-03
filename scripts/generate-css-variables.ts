/**
 * 自动生成 CSS 变量文件
 * 从 design-tokens.ts 生成 variables.generated.css
 * 
 * 运行: npm run generate:css-vars
 */

import { DESIGN_TOKENS } from '../src/common/config/design-tokens';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateCSSVariables(): string {
  const lines: string[] = [];
  
  // 文件头部注释
  lines.push('/**');
  lines.push(' * CSS 变量 - 自动生成文件');
  lines.push(' * ⚠️ 请勿手动编辑此文件！');
  lines.push(' * 修改 src/common/config/design-tokens.ts 后运行 npm run generate:tokens');
  lines.push(' * 生成时间: ' + new Date().toISOString());
  lines.push(' */');
  lines.push('');
  lines.push(':root {');
  lines.push('');
  
  // 1. 生成颜色变量
  lines.push('  /* ========================================');
  lines.push('     颜色系统 - 基础色板');
  lines.push('     ======================================== */');
  lines.push('');
  
  for (const [paletteName, shades] of Object.entries(DESIGN_TOKENS.colors.palettes)) {
    lines.push(`  /* ${paletteName.charAt(0).toUpperCase() + paletteName.slice(1)} */`);
    for (const [shade, value] of Object.entries(shades)) {
      lines.push(`  --color-${paletteName}-${shade}: ${value};`);
    }
    lines.push('');
  }
  
  // 2. 生成间距变量
  lines.push('  /* ========================================');
  lines.push('     间距系统');
  lines.push('     ======================================== */');
  lines.push('');
  
  for (const [key, value] of Object.entries(DESIGN_TOKENS.spacing)) {
    // 将小数点转换为连字符，符合CSS变量命名规范
    const cssKey = key.replace('.', '-');
    lines.push(`  --spacing-${cssKey}: ${value};`);
  }
  lines.push('');
  
  // 3. 生成字体变量
  lines.push('  /* ========================================');
  lines.push('     字体系统');
  lines.push('     ======================================== */');
  lines.push('');
  
  // 字体家族
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.fontFamily)) {
    lines.push(`  --font-${key}: ${Array.isArray(value) ? value.join(', ') : value};`);
  }
  lines.push('');
  
  // 字体大小
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.fontSize)) {
    const [size, config] = Array.isArray(value) ? value : [value, {}];
    lines.push(`  --text-${key}: ${size};`);
    if (config && typeof config === 'object' && 'lineHeight' in config) {
      lines.push(`  --text-${key}-line-height: ${config.lineHeight};`);
    }
  }
  lines.push('');
  
  // 字重
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.fontWeight)) {
    lines.push(`  --font-${key}: ${value};`);
  }
  lines.push('');
  
  // 行高
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.lineHeight)) {
    lines.push(`  --leading-${key}: ${value};`);
  }
  lines.push('');
  
  // 字间距
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.letterSpacing)) {
    lines.push(`  --tracking-${key}: ${value};`);
  }
  lines.push('');
  
  // 4. 生成圆角变量
  lines.push('  /* ========================================');
  lines.push('     圆角系统');
  lines.push('     ======================================== */');
  lines.push('');
  
  for (const [key, value] of Object.entries(DESIGN_TOKENS.borderRadius)) {
    const varName = key === 'DEFAULT' ? 'rounded' : `rounded-${key}`;
    lines.push(`  --${varName}: ${value};`);
  }
  lines.push('');
  
  // 5. 生成阴影变量
  lines.push('  /* ========================================');
  lines.push('     阴影系统');
  lines.push('     ======================================== */');
  lines.push('');
  
  for (const [key, value] of Object.entries(DESIGN_TOKENS.boxShadow)) {
    const varName = key === 'DEFAULT' ? 'shadow' : `shadow-${key}`;
    lines.push(`  --${varName}: ${value};`);
  }
  lines.push('');
  
  // 6. 生成 Z-index 变量
  lines.push('  /* ========================================');
  lines.push('     Z-index 层级系统');
  lines.push('     ======================================== */');
  lines.push('');
  
  for (const [key, value] of Object.entries(DESIGN_TOKENS.zIndex)) {
    lines.push(`  --z-${key}: ${value};`);
  }
  lines.push('');
  
  // 7. 生成动画变量
  lines.push('  /* ========================================');
  lines.push('     动画系统');
  lines.push('     ======================================== */');
  lines.push('');
  
  // 缓动函数
  for (const [key, value] of Object.entries(DESIGN_TOKENS.animation.easing)) {
    lines.push(`  --ease-${key}: ${value};`);
  }
  lines.push('');
  
  // 动画时长
  for (const [key, value] of Object.entries(DESIGN_TOKENS.animation.duration)) {
    lines.push(`  --duration-${key}: ${value};`);
  }
  lines.push('');
  
  // 8. 生成容器变量
  lines.push('  /* ========================================');
  lines.push('     容器系统');
  lines.push('     ======================================== */');
  lines.push('');
  
  lines.push(`  --container-max-width: ${DESIGN_TOKENS.container.maxWidth};`);
  for (const [key, value] of Object.entries(DESIGN_TOKENS.container.padding)) {
    const varName = key === 'DEFAULT' ? 'container-padding' : `container-padding-${key}`;
    lines.push(`  --${varName}: ${value};`);
  }
  lines.push('');
  
  lines.push('}');
  lines.push('');
  
  // 9. 生成语义颜色变量（在 :root 之后）
  lines.push('/* ========================================');
  lines.push('   语义颜色令牌');
  lines.push('   ======================================== */');
  lines.push('');
  lines.push(':root {');
  lines.push('  /* 主色系 */');
  lines.push('  --color-primary: var(--color-blue-500);');
  lines.push('  --color-primary-light: var(--color-blue-400);');
  lines.push('  --color-primary-dark: var(--color-blue-600);');
  lines.push('  --color-primary-darker: var(--color-blue-700);');
  lines.push('');
  lines.push('  --color-secondary: var(--color-slate-500);');
  lines.push('  --color-secondary-light: var(--color-slate-400);');
  lines.push('  --color-secondary-dark: var(--color-slate-600);');
  lines.push('');
  lines.push('  --color-accent: var(--color-indigo-500);');
  lines.push('  --color-accent-light: var(--color-indigo-400);');
  lines.push('  --color-accent-dark: var(--color-indigo-600);');
  lines.push('');
  lines.push('  /* 状态色 */');
  lines.push('  --color-success: var(--color-green-500);');
  lines.push('  --color-warning: var(--color-amber-500);');
  lines.push('  --color-danger: var(--color-red-500);');
  lines.push('  --color-error: var(--color-red-500);');
  lines.push('  --color-info: var(--color-blue-500);');
  lines.push('');
  lines.push('  /* 文本色 */');
  lines.push('  --text-primary: var(--color-slate-900);');
  lines.push('  --text-secondary: var(--color-slate-600);');
  lines.push('  --text-tertiary: var(--color-slate-500);');
  lines.push('  --text-disabled: var(--color-slate-400);');
  lines.push('  --text-inverse: #ffffff;');
  lines.push('');
  lines.push('  /* 背景色 */');
  lines.push('  --bg-primary: #ffffff;');
  lines.push('  --bg-secondary: var(--color-slate-50);');
  lines.push('  --bg-tertiary: var(--color-slate-100);');
  lines.push('  --bg-surface: #ffffff;');
  lines.push('  --bg-overlay: rgba(0, 0, 0, 0.5);');
  lines.push('');
  lines.push('  /* 边框色 */');
  lines.push('  --border-default: var(--color-slate-200);');
  lines.push('  --border-light: var(--color-slate-100);');
  lines.push('  --border-dark: var(--color-slate-300);');
  lines.push('  --border-focus: var(--color-blue-500);');
  lines.push('}');
  
  return lines.join('\n');
}

// 生成并写入文件
const cssContent = generateCSSVariables();
const outputPath = resolve(__dirname, '../src/css/foundation/variables.generated.css');

try {
  writeFileSync(outputPath, cssContent, 'utf-8');
  console.log('✅ CSS 变量生成成功:', outputPath);
  console.log(`📊 生成了 ${cssContent.split('\n').length} 行 CSS 代码`);
} catch (error) {
  console.error('❌ CSS 变量生成失败:', error);
  process.exit(1);
}
