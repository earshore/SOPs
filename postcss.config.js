import purgecss from '@fullhuman/postcss-purgecss';

export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
        ...(process.env.NODE_ENV === 'production' ? {
            '@fullhuman/postcss-purgecss': purgecss({
                content: [
                    './index.html',
                    './src/**/*.{js,ts,html}'
                ],
                defaultExtractor: content => {
                    // 提取所有可能的类名
                    const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
                    const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
                    return broadMatches.concat(innerMatches);
                },
                safelist: {
                    standard: [
                        /^hljs-/,           // 代码高亮
                        /^fa-/,             // FontAwesome
                        /^fas-/,
                        /^far-/,
                        /^fab-/,
                        /^gridstack-/,      // GridStack
                        /^gs-/,
                        /^chart-/,          // Chart.js
                        /^toast-/,          // Toast通知
                        /^modal-/,          // 模态框
                        /^fade-/,           // 动画
                        /^slide-/,
                        /^pulse-/,
                        /^spin-/,
                        /^card-/,           // 卡片组件
                        /^btn-/,            // 按钮组件
                        /^badge-/,          // 徽章组件
                    ],
                    deep: [
                        /data-theme/,       // 主题属性
                        /data-color/,       // 颜色属性
                        /data-action/,      // 动作属性
                    ],
                    greedy: [
                        /^bg-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-/,
                        /^text-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-/,
                        /^border-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-/,
                        /^from-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-/,
                        /^to-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-/,
                        /^ring-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan)-/,
                    ]
                },
                // 保留所有CSS变量
                variables: true,
                keyframes: true,
            })
        } : {})
    },
}
