/**
 * 自动生成设计令牌 TypeScript 类型
 * 从 design-tokens.ts 生成类型定义
 * 
 * 运行: npm run generate:types
 */

import { DESIGN_TOKENS } from '../src/common/config/design-tokens';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateTypes(): string {
  const lines: string[] = [];
  
  // 文件头部
  lines.push('/**');
  lines.push(' * 设计令牌类型定义 - 自动生成文件');
  lines.push(' * ⚠️ 请勿手动编辑此文件！');
  lines.push(' * 修改 src/common/config/design-tokens.ts 后运行 npm run generate:tokens');
  lines.push(' * 生成时间: ' + new Date().toISOString());
  lines.push(' */');
  lines.push('');
  
  // 1. 颜色类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 颜色系统类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  // 色板名称
  const paletteNames = Object.keys(DESIGN_TOKENS.colors.palettes);
  lines.push('/**');
  lines.push(' * 颜色色板名称');
  lines.push(' */');
  lines.push(`export type ColorPaletteName = ${paletteNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  // 色阶
  const shades = Object.keys(DESIGN_TOKENS.colors.palettes.slate);
  lines.push('/**');
  lines.push(' * 颜色色阶 (50-950)');
  lines.push(' */');
  lines.push(`export type ColorShade = ${shades.map(s => `'${s}'`).join(' | ')};`);
  lines.push('');
  
  // 语义颜色名称
  lines.push('/**');
  lines.push(' * 语义颜色名称');
  lines.push(' */');
  lines.push('export type SemanticColorName =');
  lines.push('  | \'primary\'');
  lines.push('  | \'secondary\'');
  lines.push('  | \'accent\'');
  lines.push('  | \'success\'');
  lines.push('  | \'warning\'');
  lines.push('  | \'danger\'');
  lines.push('  | \'error\'');
  lines.push('  | \'info\';');
  lines.push('');
  
  // 2. 间距类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 间距系统类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  const spacingKeys = Object.keys(DESIGN_TOKENS.spacing);
  lines.push('/**');
  lines.push(' * 间距值 (0-96)');
  lines.push(' */');
  lines.push(`export type SpacingValue = ${spacingKeys.map(k => `'${k}'`).join(' | ')};`);
  lines.push('');
  
  // 3. 字体类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 字体系统类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  const fontFamilyNames = Object.keys(DESIGN_TOKENS.typography.fontFamily);
  lines.push('/**');
  lines.push(' * 字体家族名称');
  lines.push(' */');
  lines.push(`export type FontFamilyName = ${fontFamilyNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  const fontSizeNames = Object.keys(DESIGN_TOKENS.typography.fontSize);
  lines.push('/**');
  lines.push(' * 字体大小名称');
  lines.push(' */');
  lines.push(`export type FontSizeName = ${fontSizeNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  const fontWeightNames = Object.keys(DESIGN_TOKENS.typography.fontWeight);
  lines.push('/**');
  lines.push(' * 字重名称');
  lines.push(' */');
  lines.push(`export type FontWeightName = ${fontWeightNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  // 4. 圆角类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 圆角系统类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  const borderRadiusNames = Object.keys(DESIGN_TOKENS.borderRadius);
  lines.push('/**');
  lines.push(' * 圆角大小名称');
  lines.push(' */');
  lines.push(`export type BorderRadiusName = ${borderRadiusNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  // 5. 阴影类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 阴影系统类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  const shadowNames = Object.keys(DESIGN_TOKENS.boxShadow);
  lines.push('/**');
  lines.push(' * 阴影大小名称');
  lines.push(' */');
  lines.push(`export type BoxShadowName = ${shadowNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  // 6. Z-index 类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// Z-index 层级类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  const zIndexNames = Object.keys(DESIGN_TOKENS.zIndex);
  lines.push('/**');
  lines.push(' * Z-index 层级名称');
  lines.push(' */');
  lines.push(`export type ZIndexName = ${zIndexNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  // 7. 动画类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 动画系统类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  const easingNames = Object.keys(DESIGN_TOKENS.animation.easing);
  lines.push('/**');
  lines.push(' * 缓动函数名称');
  lines.push(' */');
  lines.push(`export type EasingName = ${easingNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  const durationNames = Object.keys(DESIGN_TOKENS.animation.duration);
  lines.push('/**');
  lines.push(' * 动画时长名称');
  lines.push(' */');
  lines.push(`export type DurationName = ${durationNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  // 8. 断点类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 断点系统类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  const breakpointNames = Object.keys(DESIGN_TOKENS.breakpoints);
  lines.push('/**');
  lines.push(' * 响应式断点名称');
  lines.push(' */');
  lines.push(`export type BreakpointName = ${breakpointNames.map(n => `'${n}'`).join(' | ')};`);
  lines.push('');
  
  // 9. 工具类型
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 工具类型');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  lines.push('/**');
  lines.push(' * CSS 变量名称构造器');
  lines.push(' */');
  lines.push('export type CSSVariableName<T extends string> = `--${T}`;');
  lines.push('');
  
  lines.push('/**');
  lines.push(' * 颜色 CSS 变量名称');
  lines.push(' */');
  lines.push('export type ColorCSSVariable = CSSVariableName<`color-${ColorPaletteName}-${ColorShade}`>;');
  lines.push('');
  
  lines.push('/**');
  lines.push(' * 间距 CSS 变量名称');
  lines.push(' */');
  lines.push('export type SpacingCSSVariable = CSSVariableName<`spacing-${SpacingValue}`>;');
  lines.push('');
  
  // 10. 设计令牌接口
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// 设计令牌接口');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  
  lines.push('/**');
  lines.push(' * 颜色配置接口');
  lines.push(' */');
  lines.push('export interface ColorConfig {');
  lines.push('  palette: ColorPaletteName;');
  lines.push('  shade: ColorShade;');
  lines.push('  value: string;');
  lines.push('}');
  lines.push('');
  
  lines.push('/**');
  lines.push(' * 主题配置接口');
  lines.push(' */');
  lines.push('export interface ThemeConfig {');
  lines.push('  id: string;');
  lines.push('  name: string;');
  lines.push('  description?: string;');
  lines.push('  colors: {');
  lines.push('    primary: ColorConfig;');
  lines.push('    secondary: ColorConfig;');
  lines.push('    accent: ColorConfig;');
  lines.push('  };');
  lines.push('  darkMode?: boolean;');
  lines.push('}');
  lines.push('');
  
  lines.push('/**');
  lines.push(' * 设计令牌配置接口');
  lines.push(' */');
  lines.push('export interface DesignTokensConfig {');
  lines.push('  colors: {');
  lines.push('    palettes: Record<ColorPaletteName, Record<ColorShade, string>>;');
  lines.push('    semantic: Record<string, string | Record<string, string>>;');
  lines.push('  };');
  lines.push('  spacing: Record<SpacingValue, string>;');
  lines.push('  typography: {');
  lines.push('    fontFamily: Record<FontFamilyName, string[]>;');
  lines.push('    fontSize: Record<FontSizeName, string | [string, Record<string, string>]>;');
  lines.push('    fontWeight: Record<FontWeightName, string>;');
  lines.push('  };');
  lines.push('  borderRadius: Record<BorderRadiusName, string>;');
  lines.push('  boxShadow: Record<BoxShadowName, string>;');
  lines.push('  zIndex: Record<ZIndexName, string | number>;');
  lines.push('  animation: {');
  lines.push('    easing: Record<EasingName, string>;');
  lines.push('    duration: Record<DurationName, string>;');
  lines.push('  };');
  lines.push('  breakpoints: Record<BreakpointName, string>;');
  lines.push('}');
  
  return lines.join('\n');
}

// 生成并写入文件
const typesContent = generateTypes();
const outputPath = resolve(__dirname, '../src/common/types/design-tokens.generated.ts');

try {
  writeFileSync(outputPath, typesContent, 'utf-8');
  console.log('✅ TypeScript 类型生成成功:', outputPath);
  console.log(`📊 生成了 ${typesContent.split('\n').length} 行类型定义`);
} catch (error) {
  console.error('❌ TypeScript 类型生成失败:', error);
  process.exit(1);
}
