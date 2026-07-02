/**
 * 设计令牌 - 单一数据源 (Single Source of Truth)
 *
 * 所有视觉属性的唯一定义源，自动生成：
 * - CSS 变量 (src/css/foundation/variables.generated.css)
 * - Tailwind 配置 (tailwind.config.generated.js)
 * - TypeScript 类型 (src/common/types/design-tokens.generated.ts)
 *
 * 修改此文件后运行: npm run generate:tokens
 */

// ═══════════════════════════════════════════════════════════
// 1. 颜色系统
// ═══════════════════════════════════════════════════════════

/**
 * 基础色板 - 11 级梯度 (50-950)
 */
export const COLOR_PALETTES = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
  fuchsia: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    950: '#500724',
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },
  lime: {
    50: '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',
    500: '#84cc16',
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#3f6212',
    900: '#365314',
    950: '#1a2e05',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
} as const;

/**
 * 语义颜色令牌
 */
export const SEMANTIC_COLORS = {
  // 主色系
  primary: {
    DEFAULT: 'var(--color-blue-500)',
    light: 'var(--color-blue-400)',
    dark: 'var(--color-blue-600)',
    darker: 'var(--color-blue-700)',
  },
  secondary: {
    DEFAULT: 'var(--color-slate-500)',
    light: 'var(--color-slate-400)',
    dark: 'var(--color-slate-600)',
  },
  accent: {
    DEFAULT: 'var(--color-indigo-500)',
    light: 'var(--color-indigo-400)',
    dark: 'var(--color-indigo-600)',
  },

  // 状态色
  success: 'var(--color-green-500)',
  warning: 'var(--color-amber-500)',
  danger: 'var(--color-red-500)',
  error: 'var(--color-red-500)',
  info: 'var(--color-blue-500)',

  // 文本色
  text: {
    primary: 'var(--color-slate-900)',
    secondary: 'var(--color-slate-600)',
    tertiary: 'var(--color-slate-500)',
    disabled: 'var(--color-slate-400)',
    inverse: 'var(--color-white)',
  },

  // 背景色
  bg: {
    primary: 'var(--color-white)',
    secondary: 'var(--color-slate-50)',
    tertiary: 'var(--color-slate-100)',
    surface: 'var(--color-white)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // 边框色
  border: {
    DEFAULT: 'var(--color-slate-200)',
    light: 'var(--color-slate-100)',
    dark: 'var(--color-slate-300)',
    focus: 'var(--color-blue-500)',
  },

  // 置信度色系
  confidence: {
    high: {
      bg: 'var(--color-green-100)',
      bgAlpha: 'var(--color-green-500)',
      text: 'var(--color-green-700)',
      textLight: 'var(--color-green-400)',
      border: 'var(--color-green-200)',
    },
    medium: {
      bg: 'var(--color-yellow-100)',
      bgAlpha: 'var(--color-yellow-500)',
      text: 'var(--color-yellow-700)',
      textLight: 'var(--color-yellow-400)',
      border: 'var(--color-yellow-300)',
    },
    low: {
      bg: 'var(--color-orange-100)',
      bgAlpha: 'var(--color-orange-500)',
      text: 'var(--color-orange-700)',
      textLight: 'var(--color-orange-400)',
      border: 'var(--color-orange-300)',
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════
// 2. 间距系统
// ═══════════════════════════════════════════════════════════

/**
 * 间距令牌 - 基于 4px 的倍数系统
 */
export const SPACING = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

// ═══════════════════════════════════════════════════════════
// 3. 字体系统
// ═══════════════════════════════════════════════════════════

/**
 * 字体家族
 */
export const FONT_FAMILY = {
  sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
  serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
  display: ['Syne', 'DM Sans', 'sans-serif'],
} as const;

/**
 * 字体大小 - 基于 1rem = 16px
 */
export const FONT_SIZE = {
  '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
  xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
  sm: ['0.8125rem', { lineHeight: '1.125rem' }], // 13px
  base: ['0.875rem', { lineHeight: '1.25rem' }], // 14px - 应用默认
  md: ['1rem', { lineHeight: '1.5rem' }], // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
  xl: ['1.25rem', { lineHeight: '1.875rem' }], // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
  '5xl': ['3rem', { lineHeight: '1' }], // 48px
  '6xl': ['3.75rem', { lineHeight: '1' }], // 60px
} as const;

/**
 * 字重
 */
export const FONT_WEIGHT = {
  thin: '100',
  extralight: '200',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

/**
 * 行高
 */
export const LINE_HEIGHT = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

/**
 * 字间距
 */
export const LETTER_SPACING = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// ═══════════════════════════════════════════════════════════
// 4. 圆角系统
// ═══════════════════════════════════════════════════════════

export const BORDER_RADIUS = {
  none: '0',
  sm: '0.125rem', // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// ═══════════════════════════════════════════════════════════
// 5. 阴影系统
// ═══════════════════════════════════════════════════════════

export const BOX_SHADOW = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  none: 'none',
} as const;

// ═══════════════════════════════════════════════════════════
// 6. Z-index 层级系统
// ═══════════════════════════════════════════════════════════

export const Z_INDEX = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  'modal-backdrop': '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  toast: '1080',
  max: '9999',
} as const;

// ═══════════════════════════════════════════════════════════
// 7. 动画系统
// ═══════════════════════════════════════════════════════════

/**
 * 缓动函数
 */
export const EASING = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

/**
 * 动画时长
 */
export const DURATION = {
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms',
} as const;

// ═══════════════════════════════════════════════════════════
// 8. 断点系统
// ═══════════════════════════════════════════════════════════

export const BREAKPOINTS = {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
  '3xl': '1920px',
} as const;

// ═══════════════════════════════════════════════════════════
// 9. 容器尺寸
// ═══════════════════════════════════════════════════════════

export const CONTAINER = {
  maxWidth: '1450px',
  padding: {
    DEFAULT: '1rem',
    sm: '1.5rem',
    md: '2rem',
    lg: '2.5rem',
    xl: '3rem',
  },
} as const;

// ═══════════════════════════════════════════════════════════
// 导出所有设计令牌
// ═══════════════════════════════════════════════════════════

export const DESIGN_TOKENS = {
  colors: {
    palettes: COLOR_PALETTES,
    semantic: SEMANTIC_COLORS,
  },
  spacing: SPACING,
  typography: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    fontWeight: FONT_WEIGHT,
    lineHeight: LINE_HEIGHT,
    letterSpacing: LETTER_SPACING,
  },
  borderRadius: BORDER_RADIUS,
  boxShadow: BOX_SHADOW,
  zIndex: Z_INDEX,
  animation: {
    easing: EASING,
    duration: DURATION,
  },
  breakpoints: BREAKPOINTS,
  container: CONTAINER,
} as const;

// 导出类型
export type ColorPaletteName = keyof typeof COLOR_PALETTES;
export type ColorShade = keyof typeof COLOR_PALETTES.slate;
export type SpacingValue = keyof typeof SPACING;
export type FontFamilyName = keyof typeof FONT_FAMILY;
export type FontSizeName = keyof typeof FONT_SIZE;
