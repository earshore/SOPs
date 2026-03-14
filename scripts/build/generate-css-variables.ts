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

  // 动态生成语义颜色
  function generateSemanticColors(obj: any, prefix: string = 'color') {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // 简单值：--color-success: var(--color-green-500)
        lines.push(`  --${prefix}-${key}: ${value};`);
      } else if (typeof value === 'object' && value !== null) {
        // 嵌套对象
        if (key === 'text' || key === 'bg' || key === 'border') {
          // 特殊前缀处理
          for (const [subKey, subValue] of Object.entries(value)) {
            const varName = subKey === 'DEFAULT' ? key : `${key}-${subKey}`;
            lines.push(`  --${varName}: ${subValue};`);
          }
        } else if (key === 'confidence') {
          // 置信度颜色
          lines.push('');
          lines.push('  /* 置信度色系 */');
          for (const [level, colors] of Object.entries(value as Record<string, any>)) {
            for (const [colorKey, colorValue] of Object.entries(colors)) {
              // 转换驼峰命名：bgAlpha -> bg-alpha
              const cssKey = colorKey.replace(/([A-Z])/g, '-$1').toLowerCase();
              lines.push(`  --confidence-${level}-${cssKey}: ${colorValue};`);
            }
          }
        } else {
          // 其他嵌套对象：primary.light, primary.dark 等
          for (const [subKey, subValue] of Object.entries(value)) {
            const varName = subKey === 'DEFAULT' ? key : `${key}-${subKey}`;
            lines.push(`  --${prefix}-${varName}: ${subValue};`);
          }
        }
        lines.push('');
      }
    }
  }

  generateSemanticColors(DESIGN_TOKENS.colors.semantic);

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
