/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,html}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
    safelist: [
        // ═══════════════════════════════════════════════════════════
        // 动态颜色方案 Safelist - 优化版
        // 使用正则模式减少重复配置
        // ═══════════════════════════════════════════════════════════
        
        // 活跃模块颜色方案（包含所有有效颜色）
        {
            pattern: /(bg|text|border|from|to|ring|shadow)-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-(50|100|200|300|400|500|600|700)(\/\d+)?/,
            variants: ['hover', 'focus', 'group-hover', 'group-focus-within'],
        },
        
        // 卡片交互效果 - 修复正则表达式
        {
            pattern: /(bg|text|border|ring|shadow|scale|opacity|translate)-(.*)/,
            variants: ['group-hover/card'],
        },
        
        // 通用交互效果
        'hover:-translate-y-1',
        'hover:shadow-lg',
        'group-hover/card:text-white',
        'group-hover/card:scale-110',
        'group-hover/card:opacity-100',
        'group-hover/card:translate-x-0',
        'group-hover/card:shadow-md',
        'group-hover/card:ring-2',
    ]
}
