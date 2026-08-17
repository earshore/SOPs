/**
 * Tailwind CSS 配置 - 主配置文件
 * 
 * 架构说明:
 * - 基础配置从 tailwind.config.generated.js 自动生成
 * - 本文件添加项目特定的扩展配置
 * - 修改设计令牌请编辑 src/common/config/design-tokens.ts
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import generatedConfig from './tailwind.config.generated.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..').replace(/\\/g, '/');

const content = [
  `${projectRoot}/index.html`,
  `${projectRoot}/src/**/*.{js,ts,jsx,tsx,html}`,
  `${projectRoot}/src/components/**/*.html`,
  `${projectRoot}/src/modules/**/*.html`
];

/** @type {import('tailwindcss').Config} */
export default {
  ...generatedConfig,
  content,
  // 主题轴 (浅/深/系统) 由 ThemeManager 解析为 .dark / data-color-mode-resolved。
  // dark: 变体必须跟随应用主题，绝不直接跟 OS 媒体查询。
  darkMode: ['selector', ':is(.dark, [data-color-mode-resolved="dark"])'],
  theme: {
    ...generatedConfig.theme,
    extend: {
      ...generatedConfig.theme.extend,

      // 项目特定的扩展配置
      colors: {
        ...generatedConfig.theme.extend.colors,
        // 语义色键：blue-* → primary（跟随 Appearance），indigo-* → accent。
        // 值全部 var() 引用运行时 token（ThemeManager 注入），换肤自动生效。
        primary: {
          DEFAULT: 'var(--color-primary)',
          100: 'var(--color-primary-light)',
          400: 'var(--color-primary)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary-dark)',
          700: 'var(--color-primary-darker)',
          800: 'var(--color-primary-darker)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          100: 'var(--color-accent-light)',
          400: 'var(--color-accent)',
          500: 'var(--color-accent)',
          600: 'var(--color-accent)',
          700: 'var(--color-accent)',
          800: 'var(--color-accent)',
        },
      },

      boxShadow: {
        ...generatedConfig.theme.extend.boxShadow,
        // 彩色阴影（项目特有）
        'primary-sm': '0 2px 8px rgba(59, 130, 246, 0.15)',
        'primary-md': '0 4px 14px rgba(59, 130, 246, 0.20)',
        'primary-lg': '0 8px 25px rgba(59, 130, 246, 0.25)',
      },

      transitionTimingFunction: {
        ...generatedConfig.theme.extend.transitionTimingFunction,
        // 自定义缓动函数（项目特有）
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
    },
  },
  plugins: [],
  safelist: [
    // getWorkbenchIconContainerClasses 等运行时拼接的渐变端点类
    // （from-${color}-500 to-${to}-600）不在静态扫描范围，light 下不生成
    // → 渐变终点回退「同色 0% 透明」，白字图标不可读。显式列入。
    {
      pattern:
        /^to-(rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|amber|orange|red|gray)-600$/,
    },
  ],
};

