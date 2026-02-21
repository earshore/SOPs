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
                        // 第三方库前缀
                        /^hljs-/,
                        /^fa-/,
                        /^fas-/,
                        /^far-/,
                        /^fab-/,
                        /^gridstack-/,
                        /^gs-/,
                        /^chart-/,
                        /^toast-/,
                        /^modal-/,
                        /^fade-/,
                        /^slide-/,
                        /^pulse-/,
                        /^spin-/,
                        /^card-/,
                        /^btn-/,
                        /^badge-/,
                        // 核心布局类 - 明确列出
                        'panel',
                        'absolute',
                        'relative',
                        'fixed',
                        'static',
                        'sticky',
                        'top-0',
                        'right-0',
                        'bottom-0',
                        'left-0',
                        'inset-0',
                        'w-full',
                        'h-full',
                        'min-w-full',
                        'min-h-full',
                        'max-w-full',
                        'max-h-full',
                        'overflow-hidden',
                        'overflow-auto',
                        'overflow-y-auto',
                        'overflow-x-hidden',
                        'overflow-visible',
                        'flex',
                        'inline-flex',
                        'flex-1',
                        'flex-col',
                        'flex-row',
                        'hidden',
                        'block',
                        'inline-block',
                        'inline',
                        'grid',
                        'inline-grid',
                        'z-0',
                        'z-10',
                        'z-20',
                        'z-30',
                        'z-40',
                        'z-50',
                        '-z-10',
                        'opacity-0',
                        'opacity-50',
                        'opacity-100',
                        'visible',
                        'invisible',
                        // 常用间距
                        'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'm-8',
                        'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8',
                        'mt-0', 'mt-1', 'mt-2', 'mt-4', 'mt-8',
                        'mb-0', 'mb-1', 'mb-2', 'mb-4', 'mb-8',
                        'ml-0', 'ml-1', 'ml-2', 'ml-4', 'ml-8',
                        'mr-0', 'mr-1', 'mr-2', 'mr-4', 'mr-8',
                        'pt-0', 'pt-1', 'pt-2', 'pt-4', 'pt-8',
                        'pb-0', 'pb-1', 'pb-2', 'pb-4', 'pb-8',
                        'pl-0', 'pl-1', 'pl-2', 'pl-4', 'pl-8',
                        'pr-0', 'pr-1', 'pr-2', 'pr-4', 'pr-8',
                        '-ml-64',
                        'gap-1', 'gap-2', 'gap-3', 'gap-4',
                        // 常用宽度
                        'w-64', 'w-auto',
                        // Flexbox
                        'justify-start', 'justify-end', 'justify-center', 'justify-between',
                        'items-start', 'items-end', 'items-center',
                        'self-start', 'self-end', 'self-center',
                        // 过渡和动画
                        'transition-all',
                        'duration-200', 'duration-300', 'duration-500',
                        'ease-smooth',
                        // 边框和圆角
                        'border', 'border-r', 'border-l', 'border-t', 'border-b',
                        'rounded', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
                        // 背景和文本
                        'bg-white', 'bg-transparent',
                        'text-slate-600', 'text-slate-700',
                        // 其他
                        'pointer-events-none',
                        'scroll-smooth',
                        'backdrop-blur-sm',
                    ],
                    deep: [
                        /data-theme/,
                        /data-color/,
                        /data-action/,
                    ],
                    greedy: [
                        // 动态颜色类
                        /^(bg|text|border|from|to|via|ring|shadow)-(blue|sky|emerald|indigo|purple|fuchsia|orange|lime|amber|red|teal|green|violet|rose|pink|slate|cyan|gray)-(50|100|200|300|400|500|600|700|800|900)(\/\d+)?$/,
                    ]
                },
                // 保留所有CSS变量
                variables: true,
                keyframes: true,
            })
        } : {})
    },
}
