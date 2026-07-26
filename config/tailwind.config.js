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
  safelist: []
};

