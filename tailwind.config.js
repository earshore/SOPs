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
    // Tailwind safelist 只保留动态生成的类
    // 静态类由 PurgeCSS 的 content 扫描自动保留
    safelist: [
        // 动态颜色方案（运行时生成的类）
        {
            pattern: /(bg|text|border|from|to|ring)-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-(50|100|200|300|400|500|600|700)(\/\d+)?/,
            variants: ['hover', 'focus', 'group-hover', 'group-focus-within'],
        },
    ]
}
