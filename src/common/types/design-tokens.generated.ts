/**
 * 设计令牌类型定义 - 自动生成文件
 * ⚠️ 请勿手动编辑此文件！
 * 修改 src/common/config/design-tokens.ts 后运行 npm run generate:tokens
 * 生成时间: 2026-08-14T12:58:07.658Z
 */

// ═══════════════════════════════════════════════════════════
// 颜色系统类型
// ═══════════════════════════════════════════════════════════

/**
 * 颜色色板名称
 */
export type ColorPaletteName = 'slate' | 'gray' | 'blue' | 'sky' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan';

/**
 * 颜色色阶 (50-950)
 */
export type ColorShade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';

/**
 * 语义颜色名称
 */
export type SemanticColorName =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'error'
  | 'info';

// ═══════════════════════════════════════════════════════════
// 间距系统类型
// ═══════════════════════════════════════════════════════════

/**
 * 间距值 (0-96)
 */
export type SpacingValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '14' | '16' | '20' | '24' | '28' | '32' | '36' | '40' | '44' | '48' | '52' | '56' | '60' | '64' | '72' | '80' | '96' | 'px' | '0.5' | '1.5' | '2.5' | '3.5';

// ═══════════════════════════════════════════════════════════
// 字体系统类型
// ═══════════════════════════════════════════════════════════

/**
 * 字体家族名称
 */
export type FontFamilyName = 'sans' | 'serif' | 'mono' | 'display';

/**
 * 字体大小名称
 */
export type FontSizeName = '2xs' | 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';

/**
 * 字重名称
 */
export type FontWeightName = 'thin' | 'extralight' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';

// ═══════════════════════════════════════════════════════════
// 圆角系统类型
// ═══════════════════════════════════════════════════════════

/**
 * 圆角大小名称
 */
export type BorderRadiusName = 'none' | 'sm' | 'DEFAULT' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

// ═══════════════════════════════════════════════════════════
// 阴影系统类型
// ═══════════════════════════════════════════════════════════

/**
 * 阴影大小名称
 */
export type BoxShadowName = 'sm' | 'DEFAULT' | 'md' | 'lg' | 'xl' | '2xl' | 'inner' | 'none';

// ═══════════════════════════════════════════════════════════
// Z-index 层级类型
// ═══════════════════════════════════════════════════════════

/**
 * Z-index 层级名称
 */
export type ZIndexName = '0' | '10' | '20' | '30' | '40' | '50' | 'auto' | 'dropdown' | 'sticky' | 'fixed' | 'modal-backdrop' | 'modal' | 'popover' | 'tooltip' | 'toast' | 'max';

// ═══════════════════════════════════════════════════════════
// 动画系统类型
// ═══════════════════════════════════════════════════════════

/**
 * 缓动函数名称
 */
export type EasingName = 'linear' | 'in' | 'out' | 'in-out' | 'bounce' | 'smooth';

/**
 * 动画时长名称
 */
export type DurationName = '75' | '100' | '150' | '200' | '300' | '500' | '700' | '1000';

// ═══════════════════════════════════════════════════════════
// 断点系统类型
// ═══════════════════════════════════════════════════════════

/**
 * 响应式断点名称
 */
export type BreakpointName = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

// ═══════════════════════════════════════════════════════════
// 工具类型
// ═══════════════════════════════════════════════════════════

/**
 * CSS 变量名称构造器
 */
export type CSSVariableName<T extends string> = `--${T}`;

/**
 * 颜色 CSS 变量名称
 */
export type ColorCSSVariable = CSSVariableName<`color-${ColorPaletteName}-${ColorShade}`>;

/**
 * 间距 CSS 变量名称
 */
export type SpacingCSSVariable = CSSVariableName<`spacing-${SpacingValue}`>;

// ═══════════════════════════════════════════════════════════
// 设计令牌接口
// ═══════════════════════════════════════════════════════════

/**
 * 颜色配置接口
 */
export interface ColorConfig {
  palette: ColorPaletteName;
  shade: ColorShade;
  value: string;
}

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  id: string;
  name: string;
  description?: string;
  colors: {
    primary: ColorConfig;
    secondary: ColorConfig;
    accent: ColorConfig;
  };
  darkMode?: boolean;
}

/**
 * 设计令牌配置接口
 */
export interface DesignTokensConfig {
  colors: {
    palettes: Record<ColorPaletteName, Record<ColorShade, string>>;
    semantic: Record<string, string | Record<string, string>>;
  };
  spacing: Record<SpacingValue, string>;
  typography: {
    fontFamily: Record<FontFamilyName, string[]>;
    fontSize: Record<FontSizeName, string | [string, Record<string, string>]>;
    fontWeight: Record<FontWeightName, string>;
  };
  borderRadius: Record<BorderRadiusName, string>;
  boxShadow: Record<BoxShadowName, string>;
  zIndex: Record<ZIndexName, string | number>;
  animation: {
    easing: Record<EasingName, string>;
    duration: Record<DurationName, string>;
  };
  breakpoints: Record<BreakpointName, string>;
}