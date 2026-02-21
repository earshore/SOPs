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
                    // 使用 greedy 模式保留所有 Tailwind 核心工具类
                    greedy: [
                        // 布局和定位
                        /^(static|fixed|absolute|relative|sticky)$/,
                        /^(top|right|bottom|left)-/,
                        /^inset-/,
                        // 显示和可见性
                        /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden)$/,
                        /^(visible|invisible|opacity-)/,
                        // 尺寸
                        /^w-/,
                        /^h-/,
                        /^(min|max)-(w|h)-/,
                        // 溢出
                        /^overflow-/,
                        // Flexbox
                        /^flex-/,
                        /^(justify|items|content|self)-/,
                        /^(grow|shrink)-/,
                        /^order-/,
                        /^gap-/,
                        // Grid
                        /^grid-/,
                        /^col-/,
                        /^row-/,
                        // 间距
                        /^-?m[lrtbxy]?-/,
                        /^p[lrtbxy]?-/,
                        /^space-/,
                        // Z-index
                        /^-?z-/,
                        // 颜色方案 (保留所有颜色)
                        /^(bg|text|border|from|to|via|ring|shadow|outline|decoration|divide|placeholder|caret)-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan|gray|zinc|neutral|stone|white|black|transparent|current)(-\d+)?(\/\d+)?$/,
                        // 边框
                        /^border(-[lrtbxy])?(-\d+)?$/,
                        /^rounded(-[lrtb])?(-\d+)?$/,
                        // 阴影和效果
                        /^shadow-/,
                        /^ring-/,
                        /^blur-/,
                        /^brightness-/,
                        /^contrast-/,
                        /^grayscale/,
                        // 过渡和动画
                        /^transition-/,
                        /^duration-/,
                        /^ease-/,
                        /^delay-/,
                        /^animate-/,
                        // 变换
                        /^(scale|rotate|translate|skew)-/,
                        /^transform/,
                        // 字体和文本
                        /^text-/,
                        /^font-/,
                        /^leading-/,
                        /^tracking-/,
                        /^(underline|line-through|no-underline)$/,
                        /^(uppercase|lowercase|capitalize|normal-case)$/,
                        /^(truncate|text-ellipsis|text-clip)$/,
                        /^whitespace-/,
                        /^break-/,
                        // 背景
                        /^bg-/,
                        // 光标和指针
                        /^cursor-/,
                        /^pointer-events-/,
                        /^select-/,
                        // 其他常用类
                        /^(appearance-none|outline-none)$/,
                        /^(sr-only|not-sr-only)$/,
                    ]
                },
                    deep: [
                        /data-theme/,       // 主题属性
                        /data-color/,       // 颜色属性
                        /data-action/,      // 动作属性
                    ]
                },
                // 保留所有CSS变量
                variables: true,
                keyframes: true,
            })
        } : {})
    },
}
