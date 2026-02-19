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
        // 动态颜色方案 Safelist - 支持所有模块主题色
        // ═══════════════════════════════════════════════════════════
        
        // 模块主题色: emerald (SOPs), blue (App Center), purple (Keyword Hunter), amber (Hub), cyan (More)
        
        // ── Emerald (SOPs 流程中心) ──
        'border-emerald-100', 'border-emerald-200', 'border-emerald-300', 'border-emerald-500',
        'hover:border-emerald-300', 'hover:bg-emerald-50/80', 'bg-emerald-50', 'bg-emerald-50/80', 'bg-emerald-100',
        'hover:shadow-emerald-200/40', 'shadow-emerald-500/20', 'group-hover/card:bg-emerald-500',
        'text-emerald-500', 'text-emerald-600', 'text-emerald-700',
        'group-hover/card:text-white', 'group-hover/card:text-emerald-700', 'group-hover/card:text-emerald-600',
        'group-hover/card:border-emerald-300', 'group-hover/card:ring-emerald-200/50',
        'from-emerald-500', 'to-emerald-600', 'focus:ring-emerald-500/20', 'focus:border-emerald-400',
        'group-focus-within:bg-emerald-100', 'group-focus-within:text-emerald-500',
        
        // ── Blue (应用中心) ──
        'border-blue-100', 'border-blue-200', 'border-blue-300', 'border-blue-500',
        'hover:border-blue-300', 'hover:bg-blue-50/80', 'bg-blue-50', 'bg-blue-50/80', 'bg-blue-100',
        'hover:shadow-blue-200/40', 'shadow-blue-500/20', 'group-hover/card:bg-blue-500',
        'text-blue-500', 'text-blue-600', 'text-blue-700',
        'group-hover/card:text-blue-700', 'group-hover/card:text-blue-600',
        'group-hover/card:border-blue-300', 'group-hover/card:ring-blue-200/50',
        'from-blue-500', 'to-blue-600', 'focus:ring-blue-500/20', 'focus:border-blue-400',
        'group-focus-within:bg-blue-100', 'group-focus-within:text-blue-500',
        
        // ── Purple (Keyword Hunter) ──
        'border-purple-100', 'border-purple-200', 'border-purple-300', 'border-purple-500',
        'hover:border-purple-300', 'hover:bg-purple-50/80', 'bg-purple-50', 'bg-purple-50/80', 'bg-purple-100',
        'hover:shadow-purple-200/40', 'shadow-purple-500/20', 'group-hover/card:bg-purple-500',
        'text-purple-500', 'text-purple-600', 'text-purple-700',
        'group-hover/card:text-purple-700', 'group-hover/card:text-purple-600',
        'group-hover/card:border-purple-300', 'group-hover/card:ring-purple-200/50',
        'from-purple-500', 'to-purple-600', 'focus:ring-purple-500/20', 'focus:border-purple-400',
        'group-focus-within:bg-purple-100', 'group-focus-within:text-purple-500',
        
        // ── Amber (Amazon 智库) ──
        'border-amber-100', 'border-amber-200', 'border-amber-300', 'border-amber-500',
        'hover:border-amber-300', 'hover:bg-amber-50/80', 'bg-amber-50', 'bg-amber-50/80', 'bg-amber-100',
        'hover:shadow-amber-200/40', 'shadow-amber-500/20', 'group-hover/card:bg-amber-500',
        'text-amber-500', 'text-amber-600', 'text-amber-700',
        'group-hover/card:text-amber-700', 'group-hover/card:text-amber-600',
        'group-hover/card:border-amber-300', 'group-hover/card:ring-amber-200/50',
        'from-amber-500', 'to-amber-600', 'focus:ring-amber-500/20', 'focus:border-amber-400',
        'group-focus-within:bg-amber-100', 'group-focus-within:text-amber-500',
        
        // ── Cyan (更多) ──
        'border-cyan-100', 'border-cyan-200', 'border-cyan-300', 'border-cyan-500',
        'hover:border-cyan-300', 'hover:bg-cyan-50/80', 'bg-cyan-50', 'bg-cyan-50/80', 'bg-cyan-100',
        'hover:shadow-cyan-200/40', 'shadow-cyan-500/20', 'group-hover/card:bg-cyan-500',
        'text-cyan-500', 'text-cyan-600', 'text-cyan-700',
        'group-hover/card:text-cyan-700', 'group-hover/card:text-cyan-600',
        'group-hover/card:border-cyan-300', 'group-hover/card:ring-cyan-200/50',
        'from-cyan-500', 'to-cyan-600', 'focus:ring-cyan-500/20', 'focus:border-cyan-400',
        'group-focus-within:bg-cyan-100', 'group-focus-within:text-cyan-500',
        
        // ── Red (账号安全与风控体系) ──
        'border-red-100', 'border-red-200', 'border-red-300', 'border-red-500',
        'hover:border-red-300', 'hover:bg-red-50/80', 'bg-red-50', 'bg-red-50/80', 'bg-red-100',
        'hover:shadow-red-200/40', 'shadow-red-500/20', 'group-hover/card:bg-red-500',
        'text-red-500', 'text-red-600', 'text-red-700',
        'group-hover/card:text-red-700', 'group-hover/card:text-red-600',
        'group-hover/card:border-red-300', 'group-hover/card:ring-red-200/50',
        'from-red-500', 'to-red-600',
        
        // ── Green (更多菜单备用) ──
        'border-green-100', 'border-green-200', 'border-green-300', 'border-green-500',
        'hover:border-green-300', 'hover:bg-green-50/80', 'bg-green-50', 'bg-green-50/80', 'bg-green-100',
        'hover:shadow-green-200/40', 'shadow-green-500/20', 'group-hover/card:bg-green-500',
        'text-green-500', 'text-green-600', 'text-green-700',
        'group-hover/card:text-green-700', 'group-hover/card:text-green-600',
        'group-hover/card:border-green-300', 'group-hover/card:ring-green-200/50',
        'from-green-500', 'to-green-600',
        
        // ── 通用交互效果 ──
        'group-hover/card:scale-110', 'group-hover/card:opacity-100', 'group-hover/card:translate-x-0',
        'group-hover/card:text-slate-600', 'group-hover/card:shadow-md', 'group-hover/card:ring-2',
        'hover:-translate-y-1', 'hover:shadow-lg', 'group-hover/card:text-white'
    ]
}
