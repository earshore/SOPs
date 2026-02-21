/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,html}",
        "./src/components/**/*.html",
        "./src/modules/**/*.html",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
    // 只保留确实需要动态生成的类
    // 大部分类应该在模板中静态使用，让 Tailwind 自动扫描
    safelist: []
}
