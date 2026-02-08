/**
 * colorSchemes.ts - 统一颜色方案配置 v2.0
 * 
 * 基于全局设计系统升级，与系统设置面板、使用指南等组件保持视觉一致性
 * 
 * 设计规范:
 * - 渐变图标容器 (gradient icon containers with colored shadows)
 * - 左侧渐变色条 (left accent bar)
 * - 顶部悬浮线 (top hover reveal line)
 * - 带色阴影系统 (colored shadow system)
 * - 统一圆角体系 (rounded-xl / rounded-2xl)
 * - 微交互动效 (scale, translate, opacity transitions)
 */

// ═══════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════

/**
 * 基础颜色方案 - 卡片、按钮等通用组件
 */
export interface ColorScheme {
  // ── Card Container ──
  border: string;
  bg: string;
  shadow: string;
  glow: string;

  // ── Icon Container (gradient style) ──
  iconBg: string;
  iconGradient: string;
  iconText: string;
  iconScale: string;
  iconShadow: string;

  // ── Small Icon Badge (inline items) ──
  badgeBg: string;
  badgeText: string;

  // ── Typography ──
  titleText: string;
  text: string;
  subtitleText: string;

  // ── Accent Elements ──
  accentBar: string;
  topLine: string;
  arrow: string;

  // ── Version Tag ──
  versionBg: string;
  versionBorder: string;
  versionText: string;

  // ── Section Header ──
  headerBg: string;
  headerBorder: string;

  // ── Sidebar / Nav Items ──
  hoverBg: string;
  hoverBorder: string;
  hoverText: string;
  icon: string;
  hoverIcon: string;

  // ── Interactive States ──
  activeBg: string;
  activeText: string;
  activeIcon: string;

  // ── Button Variants ──
  buttonGradient: string;
  buttonHoverGradient: string;
  buttonShadow: string;

  // ── Tip / Info Card ──
  tipBg: string;
  tipBorder: string;
  tipIcon: string;
  tipText: string;

  // ── Status Indicator ──
  dot: string;
  dotPulse: string;
}

/**
 * 可用的颜色方案名称
 */
export type ColorSchemeName =
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'emerald'
  | 'teal'
  | 'green'
  | 'amber'
  | 'orange'
  | 'red'
  | 'rose'
  | 'pink'
  | 'cyan'
  | 'slate';

// ═══════════════════════════════════════════════════════════
// Color Scheme Factory
// ═══════════════════════════════════════════════════════════

/**
 * 生成颜色方案 - 消除重复定义，通过颜色名称自动派生所有样式
 */
function createScheme(
  color: string,
  options?: {
    gradientTo?: string;      // 渐变终止色，默认同色系深一档
    secondaryColor?: string;  // 双色渐变的第二色
  }
): ColorScheme {
  const to = options?.gradientTo || color;
  const secondary = options?.secondaryColor || color;

  return {
    // ── Card Container ──
    border: `border-${color}-200/80 hover:border-${color}-300`,
    bg: `hover:bg-${color}-50/30`,
    shadow: `shadow-sm hover:shadow-md hover:shadow-${color}-200/30`,
    glow: `group-hover/card:ring-2 group-hover/card:ring-${color}-200/50`,

    // ── Icon Container (gradient style) ──
    iconBg: `bg-${color}-100`,
    iconGradient: `bg-gradient-to-br from-${color}-500 to-${to}-600`,
    iconText: `text-${color}-500`,
    iconScale: 'group-hover/card:scale-110 transition-transform duration-300',
    iconShadow: `shadow-lg shadow-${color}-500/20`,

    // ── Small Icon Badge ──
    badgeBg: `bg-${color}-100`,
    badgeText: `text-${color}-500`,

    // ── Typography ──
    titleText: `text-slate-800 group-hover/card:text-${color}-700`,
    text: 'text-slate-600',
    subtitleText: 'text-slate-400',

    // ── Accent Elements ──
    accentBar: `bg-gradient-to-b from-${color}-400 to-${secondary}-500`,
    topLine: `bg-gradient-to-r from-${color}-400 to-${secondary}-500`,
    arrow: `text-${color}-500`,

    // ── Version Tag ──
    versionBg: `bg-${color}-100`,
    versionBorder: `group-hover/card:border-${color}-300`,
    versionText: `text-${color}-600`,

    // ── Section Header ──
    headerBg: `bg-gradient-to-r from-${color}-50/80 to-${secondary}-50/50`,
    headerBorder: `border-${color}-100/80`,

    // ── Sidebar / Nav Items ──
    hoverBg: `hover:bg-${color}-50/50`,
    hoverBorder: `hover:border-${color}-200`,
    hoverText: `hover:text-${color}-700`,
    icon: 'text-slate-400',
    hoverIcon: `group-hover:text-${color}-600`,

    // ── Interactive States ──
    activeBg: `bg-${color}-50`,
    activeText: `text-${color}-700`,
    activeIcon: `text-${color}-600`,

    // ── Button Variants ──
    buttonGradient: `bg-gradient-to-r from-${color}-600 to-${to}-600`,
    buttonHoverGradient: `hover:from-${color}-700 hover:to-${to}-700`,
    buttonShadow: `shadow-lg shadow-${color}-500/25 hover:shadow-${color}-500/40`,

    // ── Tip / Info Card ──
    tipBg: `bg-gradient-to-r from-${color}-50/80 to-${secondary}-50/50`,
    tipBorder: `border-${color}-100/60`,
    tipIcon: `text-${color}-500`,
    tipText: `text-${color}-700/80`,

    // ── Status Indicator ──
    dot: `bg-${color}-400`,
    dotPulse: `bg-${color}-400 animate-pulse`,
  };
}

// ═══════════════════════════════════════════════════════════
// Color Schemes Registry
// ═══════════════════════════════════════════════════════════

export const COLOR_SCHEMES: Record<ColorSchemeName, ColorScheme> = {

  // ── Primary Blues ──
  blue: createScheme('blue', { gradientTo: 'indigo', secondaryColor: 'indigo' }),

  indigo: createScheme('indigo', { gradientTo: 'violet', secondaryColor: 'violet' }),

  violet: createScheme('violet', { gradientTo: 'purple', secondaryColor: 'purple' }),

  purple: createScheme('purple', { gradientTo: 'violet', secondaryColor: 'pink' }),

  // ── Greens ──
  emerald: createScheme('emerald', { gradientTo: 'teal', secondaryColor: 'teal' }),

  teal: createScheme('teal', { gradientTo: 'cyan', secondaryColor: 'cyan' }),

  green: createScheme('green', { gradientTo: 'emerald', secondaryColor: 'emerald' }),

  // ── Warm Tones ──
  amber: createScheme('amber', { gradientTo: 'orange', secondaryColor: 'orange' }),

  orange: createScheme('orange', { gradientTo: 'amber', secondaryColor: 'red' }),

  // ── Reds & Pinks ──
  red: createScheme('red', { gradientTo: 'rose', secondaryColor: 'rose' }),

  rose: createScheme('rose', { gradientTo: 'pink', secondaryColor: 'pink' }),

  pink: createScheme('pink', { gradientTo: 'rose', secondaryColor: 'purple' }),

  // ── Cool Tones ──
  cyan: createScheme('cyan', { gradientTo: 'blue', secondaryColor: 'blue' }),

  // ── Neutral ──
  slate: createScheme('slate', { gradientTo: 'gray', secondaryColor: 'gray' }),
};

// ═══════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════

/**
 * 获取颜色方案（安全回退到 blue）
 */
export function getColorScheme(color: string): ColorScheme {
  return COLOR_SCHEMES[color as ColorSchemeName] || COLOR_SCHEMES.blue;
}

/**
 * 获取卡片完整样式类名
 * 用于生成统一风格的卡片容器
 * 
 * @example
 * ```ts
 * const classes = getCardClasses('blue');
 * // => "group/card relative rounded-2xl border ... transition-all duration-300 hover:-translate-y-0.5"
 * ```
 */
export function getCardClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'group/card relative rounded-2xl border overflow-hidden',
    s.border,
    s.shadow,
    'transition-all duration-300 hover:-translate-y-0.5',
  ].join(' ');
}

/**
 * 获取卡片顶部悬浮线样式
 * 
 * @example
 * ```html
 * <div class="${getTopLineClasses('emerald')}"></div>
 * ```
 */
export function getTopLineClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'absolute top-0 left-0 right-0 h-1 rounded-t-2xl',
    s.topLine,
    'opacity-0 group-hover/card:opacity-100 transition-opacity duration-300',
  ].join(' ');
}

/**
 * 获取左侧渐变色条样式
 */
export function getAccentBarClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'absolute top-0 left-0 w-1 h-full rounded-l',
    s.accentBar,
  ].join(' ');
}

/**
 * 获取渐变图标容器样式
 * 用于 section header 中的图标
 * 
 * @param color - 颜色名称
 * @param size - 尺寸: 'sm' (7×7) | 'md' (9×9) | 'lg' (10×10)
 */
export function getIconContainerClasses(
  color: ColorSchemeName,
  size: 'sm' | 'md' | 'lg' = 'md'
): string {
  const s = getColorScheme(color);
  const sizeMap = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-10 h-10 rounded-xl',
  };
  return [
    sizeMap[size],
    s.iconGradient,
    'flex items-center justify-center',
    s.iconShadow,
    s.iconScale,
  ].join(' ');
}

/**
 * 获取小型图标徽章样式
 * 用于列表项中的内联图标
 */
export function getIconBadgeClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
    s.badgeBg,
  ].join(' ');
}

/**
 * 获取版本标签样式
 */
export function getVersionTagClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'px-2 py-0.5 rounded-full text-[10px] font-semibold',
    s.versionBg,
    s.versionText,
  ].join(' ');
}

/**
 * 获取 section header 样式（带左侧色条）
 */
export function getSectionHeaderClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'relative px-5 py-4 border-b',
    s.headerBg,
    s.headerBorder,
  ].join(' ');
}

/**
 * 获取列表项 hover 样式
 */
export function getListItemClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'flex items-center gap-2.5 text-sm px-3 py-2 rounded-xl',
    s.text,
    s.hoverBg,
    'transition-colors duration-200',
  ].join(' ');
}

/**
 * 获取提示/信息卡片样式
 */
export function getTipCardClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'p-3.5 rounded-2xl border flex gap-3',
    s.tipBg,
    s.tipBorder,
  ].join(' ');
}

/**
 * 获取主操作按钮样式
 */
export function getPrimaryButtonClasses(color: ColorSchemeName): string {
  const s = getColorScheme(color);
  return [
    'py-2.5 text-white font-semibold rounded-xl',
    'transition-all duration-200 active:scale-[0.97]',
    'flex items-center justify-center gap-2 text-sm',
    s.buttonGradient,
    s.buttonHoverGradient,
    s.buttonShadow,
  ].join(' ');
}

/**
 * 获取侧边栏导航项样式
 */
export function getSidebarItemClasses(color: ColorSchemeName, isActive = false): string {
  const s = getColorScheme(color);
  if (isActive) {
    return [
      'flex items-center gap-2.5 px-3 py-2 rounded-xl',
      'transition-all duration-200',
      s.activeBg,
      s.activeText,
      `border border-${color}-200/60`,
    ].join(' ');
  }
  return [
    'group flex items-center gap-2.5 px-3 py-2 rounded-xl',
    'transition-all duration-200',
    s.hoverBg,
    s.text,
    s.hoverText,
    'border border-transparent',
    s.hoverBorder,
  ].join(' ');
}

// ═══════════════════════════════════════════════════════════
// Preset Combinations (常用组合快捷方式)
// ═══════════════════════════════════════════════════════════

/**
 * SOP 体系颜色映射
 */
export const SOP_COLORS = {
  operations: 'emerald' as ColorSchemeName,   // 运营与推广
  supplyChain: 'amber' as ColorSchemeName,    // 供应链与物流
  security: 'red' as ColorSchemeName,          // 账号安全与风控
  customerService: 'blue' as ColorSchemeName,  // 客服与客户体验
} as const;

/**
 * 应用中心颜色映射
 */
export const APP_COLORS = {
  masterPrompt: 'blue' as ColorSchemeName,
  keywordHunter: 'purple' as ColorSchemeName,
  dataAnalysis: 'emerald' as ColorSchemeName,
} as const;

/**
 * 智库 Hub 颜色映射
 */
export const HUB_COLORS = {
  knowledge: 'blue' as ColorSchemeName,
  beginner: 'emerald' as ColorSchemeName,
  advanced: 'purple' as ColorSchemeName,
} as const;

/**
 * 导航 Tab 颜色映射
 */
export const TAB_COLORS = {
  overview: 'blue' as ColorSchemeName,
  sops: 'emerald' as ColorSchemeName,
  apps: 'purple' as ColorSchemeName,
  hub: 'amber' as ColorSchemeName,
  more: 'cyan' as ColorSchemeName,
} as const;

// ═══════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════

export default COLOR_SCHEMES;