/**
 * 自动生成 Tailwind 配置文件
 * 从 design-tokens.ts 生成 tailwind.config.generated.js
 * 
 * 运行: npm run generate:tailwind
 */

import { DESIGN_TOKENS } from '../../src/common/config/design-tokens';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateTailwindConfig(): string {
  const lines: string[] = [];
  
  // 文件头部
  lines.push('/**');
  lines.push(' * Tailwind 配置 - 自动生成文件');
  lines.push(' * ⚠️ 请勿手动编辑此文件！');
  lines.push(' * 修改 src/common/config/design-tokens.ts 后运行 npm run generate:tokens');
  lines.push(' * 生成时间: ' + new Date().toISOString());
  lines.push(' */');
  lines.push('');
  lines.push('/** @type {import(\'tailwindcss\').Config} */');
  lines.push('export default {');
  lines.push('  content: [');
  lines.push('    "./index.html",');
  lines.push('    "./src/**/*.{js,ts,jsx,tsx,html}",');
  lines.push('    "./src/components/**/*.html",');
  lines.push('    "./src/modules/**/*.html"');
  lines.push('  ],');
  lines.push('  theme: {');
  lines.push('    extend: {');
  lines.push('');
  
  // 1. 颜色配置
  lines.push('      // 颜色系统');
  lines.push('      colors: {');
  
  // 基础色板
  for (const [paletteName, shades] of Object.entries(DESIGN_TOKENS.colors.palettes)) {
    lines.push(`        ${paletteName}: {`);
    for (const [shade, value] of Object.entries(shades)) {
      lines.push(`          ${shade}: '${value}',`);
    }
    lines.push('        },');
  }
  
  // 语义颜色
  lines.push('        // 语义颜色');
  lines.push('        primary: {');
  lines.push('          DEFAULT: \'var(--color-primary)\',');
  lines.push('          light: \'var(--color-primary-light)\',');
  lines.push('          dark: \'var(--color-primary-dark)\',');
  lines.push('          darker: \'var(--color-primary-darker)\'');
  lines.push('        },');
  lines.push('        secondary: {');
  lines.push('          DEFAULT: \'var(--color-secondary)\',');
  lines.push('          light: \'var(--color-secondary-light)\',');
  lines.push('          dark: \'var(--color-secondary-dark)\'');
  lines.push('        },');
  lines.push('        accent: {');
  lines.push('          DEFAULT: \'var(--color-accent)\',');
  lines.push('          light: \'var(--color-accent-light)\',');
  lines.push('          dark: \'var(--color-accent-dark)\'');
  lines.push('        },');
  lines.push('        success: \'var(--color-success)\',');
  lines.push('        warning: \'var(--color-warning)\',');
  lines.push('        danger: \'var(--color-danger)\',');
  lines.push('        error: \'var(--color-error)\',');
  lines.push('        info: \'var(--color-info)\'');
  lines.push('      },');
  lines.push('');
  
  // 2. 间距配置
  lines.push('      // 间距系统');
  lines.push('      spacing: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.spacing)) {
    lines.push(`        '${key}': '${value}',`);
  }
  lines.push('      },');
  lines.push('');
  
  // 3. 字体配置
  lines.push('      // 字体系统');
  lines.push('      fontFamily: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.fontFamily)) {
    const fonts = Array.isArray(value) ? value.map(f => `'${f}'`).join(', ') : `'${value}'`;
    lines.push(`        ${key}: [${fonts}],`);
  }
  lines.push('      },');
  lines.push('');
  
  lines.push('      fontSize: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.fontSize)) {
    if (Array.isArray(value)) {
      const [size, config] = value;
      if (config && typeof config === 'object') {
        lines.push(`        '${key}': ['${size}', ${JSON.stringify(config)}],`);
      } else {
        lines.push(`        '${key}': '${size}',`);
      }
    } else {
      lines.push(`        '${key}': '${value}',`);
    }
  }
  lines.push('      },');
  lines.push('');
  
  lines.push('      fontWeight: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.fontWeight)) {
    lines.push(`        ${key}: '${value}',`);
  }
  lines.push('      },');
  lines.push('');
  
  lines.push('      lineHeight: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.lineHeight)) {
    lines.push(`        ${key}: '${value}',`);
  }
  lines.push('      },');
  lines.push('');
  
  lines.push('      letterSpacing: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.typography.letterSpacing)) {
    lines.push(`        ${key}: '${value}',`);
  }
  lines.push('      },');
  lines.push('');
  
  // 4. 圆角配置
  lines.push('      // 圆角系统');
  lines.push('      borderRadius: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.borderRadius)) {
    if (key === 'DEFAULT') {
      lines.push(`        DEFAULT: '${value}',`);
    } else {
      lines.push(`        '${key}': '${value}',`);
    }
  }
  lines.push('      },');
  lines.push('');
  
  // 5. 阴影配置
  lines.push('      // 阴影系统');
  lines.push('      boxShadow: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.boxShadow)) {
    if (key === 'DEFAULT') {
      lines.push(`        DEFAULT: '${value}',`);
    } else {
      lines.push(`        '${key}': '${value}',`);
    }
  }
  lines.push('      },');
  lines.push('');
  
  // 6. Z-index 配置
  lines.push('      // Z-index 层级');
  lines.push('      zIndex: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.zIndex)) {
    // 特殊处理 auto 值
    if (value === 'auto') {
      lines.push(`        '${key}': 'auto',`);
    } else {
      lines.push(`        '${key}': ${typeof value === 'string' ? `'${value}'` : value},`);
    }
  }
  lines.push('      },');
  lines.push('');
  
  // 7. 动画配置
  lines.push('      // 动画系统');
  lines.push('      transitionTimingFunction: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.animation.easing)) {
    lines.push(`        '${key}': '${value}',`);
  }
  lines.push('      },');
  lines.push('');
  
  lines.push('      transitionDuration: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.animation.duration)) {
    lines.push(`        '${key}': '${value}',`);
  }
  lines.push('      },');
  lines.push('');
  
  // 8. 断点配置
  lines.push('      // 断点系统');
  lines.push('      screens: {');
  for (const [key, value] of Object.entries(DESIGN_TOKENS.breakpoints)) {
    lines.push(`        '${key}': '${value}',`);
  }
  lines.push('      },');
  lines.push('');
  
  // 9. 容器配置
  lines.push('      // 容器系统');
  lines.push('      maxWidth: {');
  lines.push(`        container: '${DESIGN_TOKENS.container.maxWidth}'`);
  lines.push('      }');
  
  lines.push('    }');
  lines.push('  },');
  lines.push('  plugins: []');
  lines.push('};');
  
  return lines.join('\n');
}

// 生成并写入文件
const configContent = generateTailwindConfig();
const outputPath = resolve(__dirname, '../../config/tailwind.config.generated.js');

try {
  writeFileSync(outputPath, configContent, 'utf-8');
  console.log('✅ Tailwind 配置生成成功:', outputPath);
  console.log(`📊 生成了 ${configContent.split('\n').length} 行配置代码`);
} catch (error) {
  console.error('❌ Tailwind 配置生成失败:', error);
  process.exit(1);
}
