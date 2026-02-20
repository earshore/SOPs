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
        // 动态颜色方案 Safelist
        // 只保留实际使用的动态类
        // ═══════════════════════════════════════════════════════════
        
        // 活跃模块颜色方案（包含所有有效颜色）
        {
            pattern: /(bg|text|border|from|to|ring|shadow)-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-(50|100|200|300|400|500|600|700)(\/\d+)?/,
            variants: ['hover', 'focus', 'group-hover', 'group-focus-within'],
        },
        
        // 通用交互效果 - 明确列出
        'hover:-translate-y-1',
        'hover:-translate-y-0.5',
        'hover:shadow-lg',
        'hover:shadow-md',
        'group-hover/card:text-white',
        'group-hover/card:bg-white/80',
        'group-hover/card:scale-110',
        'group-hover/card:opacity-100',
        'group-hover/card:translate-x-0',
        'group-hover/card:shadow-md',
        'group-hover/card:ring-2',
        'group-hover/card:-translate-y-0.5',
    ]
}
