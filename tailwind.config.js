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
        // 每个模块都有独一无二的主色调
        // ═══════════════════════════════════════════════════════════
        
        // ── Blue (原应用中心配色，已弃用) ──
        'border-blue-100', 'border-blue-200', 'border-blue-300', 'border-blue-500',
        'hover:border-blue-300', 'hover:bg-blue-50/80', 'bg-blue-50', 'bg-blue-50/80', 'bg-blue-100', 'bg-blue-200',
        'hover:shadow-blue-200/40', 'shadow-blue-500/20', 'group-hover/card:bg-blue-500',
        'text-blue-400', 'text-blue-500', 'text-blue-600', 'text-blue-700',
        'group-hover/card:text-blue-700', 'group-hover/card:text-blue-600',
        'group-hover/card:border-blue-300', 'group-hover/card:ring-blue-200/50',
        'from-blue-500', 'to-blue-600', 'focus:ring-blue-500/20', 'focus:border-blue-400',
        'group-focus-within:bg-blue-100', 'group-focus-within:text-blue-500',
        
        // ── Sky (SOPs 流程中心) ──
        'border-sky-100', 'border-sky-200', 'border-sky-300', 'border-sky-500',
        'hover:border-sky-300', 'hover:bg-sky-50/80', 'bg-sky-50', 'bg-sky-50/80', 'bg-sky-100', 'bg-sky-200',
        'hover:shadow-sky-200/40', 'shadow-sky-500/20', 'group-hover/card:bg-sky-500',
        'text-sky-400', 'text-sky-500', 'text-sky-600', 'text-sky-700',
        'group-hover/card:text-sky-700', 'group-hover/card:text-sky-600',
        'group-hover/card:border-sky-300', 'group-hover/card:ring-sky-200/50',
        'from-sky-500', 'to-sky-600', 'focus:ring-sky-500/20', 'focus:border-sky-400',
        'group-focus-within:bg-sky-100', 'group-focus-within:text-sky-500',
        
        // ── Emerald (运营与推广体系分类) ──
        'border-emerald-100', 'border-emerald-200', 'border-emerald-300', 'border-emerald-500',
        'hover:border-emerald-300', 'hover:bg-emerald-50/80', 'bg-emerald-50', 'bg-emerald-50/80', 'bg-emerald-100', 'bg-emerald-200',
        'hover:shadow-emerald-200/40', 'shadow-emerald-500/20', 'group-hover/card:bg-emerald-500',
        'text-emerald-500', 'text-emerald-600', 'text-emerald-700',
        'group-hover/card:text-white', 'group-hover/card:text-emerald-700', 'group-hover/card:text-emerald-600',
        'group-hover/card:border-emerald-300', 'group-hover/card:ring-emerald-200/50',
        'from-emerald-500', 'to-emerald-600', 'focus:ring-emerald-500/20', 'focus:border-emerald-400',
        'group-focus-within:bg-emerald-100', 'group-focus-within:text-emerald-500',
        
        // ── Indigo (Master Analysis) ──
        'border-indigo-100', 'border-indigo-200', 'border-indigo-300', 'border-indigo-500',
        'hover:border-indigo-300', 'hover:bg-indigo-50/80', 'bg-indigo-50', 'bg-indigo-50/80', 'bg-indigo-100', 'bg-indigo-200',
        'hover:shadow-indigo-200/40', 'shadow-indigo-500/20', 'group-hover/card:bg-indigo-500',
        'text-indigo-500', 'text-indigo-600', 'text-indigo-700',
        'group-hover/card:text-indigo-700', 'group-hover/card:text-indigo-600',
        'group-hover/card:border-indigo-300', 'group-hover/card:ring-indigo-200/50',
        'from-indigo-500', 'to-indigo-600', 'focus:ring-indigo-500/20', 'focus:border-indigo-400',
        'group-focus-within:bg-indigo-100', 'group-focus-within:text-indigo-500',
        
        // ── Purple (应用中心) ──
        'border-purple-100', 'border-purple-200', 'border-purple-300', 'border-purple-500',
        'hover:border-purple-300', 'hover:bg-purple-50/80', 'bg-purple-50', 'bg-purple-50/80', 'bg-purple-100', 'bg-purple-200',
        'hover:shadow-purple-200/40', 'shadow-purple-500/20', 'group-hover/card:bg-purple-500',
        'text-purple-400', 'text-purple-500', 'text-purple-600', 'text-purple-700',
        'group-hover/card:text-purple-700', 'group-hover/card:text-purple-600',
        'group-hover/card:border-purple-300', 'group-hover/card:ring-purple-200/50',
        'from-purple-500', 'to-purple-600', 'focus:ring-purple-500/20', 'focus:border-purple-400',
        'group-focus-within:bg-purple-100', 'group-focus-within:text-purple-500',
        
        // ── Fuchsia (Keyword Hunter) ──
        'border-fuchsia-100', 'border-fuchsia-200', 'border-fuchsia-300', 'border-fuchsia-500',
        'hover:border-fuchsia-300', 'hover:bg-fuchsia-50/80', 'bg-fuchsia-50', 'bg-fuchsia-50/80', 'bg-fuchsia-100', 'bg-fuchsia-200',
        'hover:shadow-fuchsia-200/40', 'shadow-fuchsia-500/20', 'group-hover/card:bg-fuchsia-500',
        'text-fuchsia-400', 'text-fuchsia-500', 'text-fuchsia-600', 'text-fuchsia-700',
        'group-hover/card:text-fuchsia-700', 'group-hover/card:text-fuchsia-600',
        'group-hover/card:border-fuchsia-300', 'group-hover/card:ring-fuchsia-200/50',
        'from-fuchsia-500', 'to-fuchsia-600', 'focus:ring-fuchsia-500/20', 'focus:border-fuchsia-400',
        'group-focus-within:bg-fuchsia-100', 'group-focus-within:text-fuchsia-500',
        
        // ── Orange (Amazon 智库) ──
        'border-orange-100', 'border-orange-200', 'border-orange-300', 'border-orange-500',
        'hover:border-orange-300', 'hover:bg-orange-50/80', 'bg-orange-50', 'bg-orange-50/80', 'bg-orange-100', 'bg-orange-200',
        'hover:shadow-orange-200/40', 'shadow-orange-500/20', 'group-hover/card:bg-orange-500',
        'text-orange-500', 'text-orange-600', 'text-orange-700',
        'group-hover/card:text-orange-700', 'group-hover/card:text-orange-600',
        'group-hover/card:border-orange-300', 'group-hover/card:ring-orange-200/50',
        'from-orange-500', 'to-orange-600', 'focus:ring-orange-500/20', 'focus:border-orange-400',
        'group-focus-within:bg-orange-100', 'group-focus-within:text-orange-500',
        
        // ── Cyan (原更多模块配色，已弃用) ──
        'border-cyan-100', 'border-cyan-200', 'border-cyan-300', 'border-cyan-500',
        'hover:border-cyan-300', 'hover:bg-cyan-50/80', 'bg-cyan-50', 'bg-cyan-50/80', 'bg-cyan-100', 'bg-cyan-200',
        'hover:shadow-cyan-200/40', 'shadow-cyan-500/20', 'group-hover/card:bg-cyan-500',
        'text-cyan-500', 'text-cyan-600', 'text-cyan-700',
        'group-hover/card:text-cyan-700', 'group-hover/card:text-cyan-600',
        'group-hover/card:border-cyan-300', 'group-hover/card:ring-cyan-200/50',
        'from-cyan-500', 'to-cyan-600', 'focus:ring-cyan-500/20', 'focus:border-cyan-400',
        'group-focus-within:bg-cyan-100', 'group-focus-within:text-cyan-500',
        
        // ── Lime (更多模块) ──
        'border-lime-100', 'border-lime-200', 'border-lime-300', 'border-lime-500',
        'hover:border-lime-300', 'hover:bg-lime-50/80', 'bg-lime-50', 'bg-lime-50/80', 'bg-lime-100', 'bg-lime-200',
        'hover:shadow-lime-200/40', 'shadow-lime-500/20', 'group-hover/card:bg-lime-500',
        'text-lime-400', 'text-lime-500', 'text-lime-600', 'text-lime-700',
        'group-hover/card:text-lime-700', 'group-hover/card:text-lime-600',
        'group-hover/card:border-lime-300', 'group-hover/card:ring-lime-200/50',
        'from-lime-500', 'to-lime-600', 'focus:ring-lime-500/20', 'focus:border-lime-400',
        'group-focus-within:bg-lime-100', 'group-focus-within:text-lime-500',
        
        // ── Amber (供应链与物流体系) ──
        'border-amber-100', 'border-amber-200', 'border-amber-300', 'border-amber-500',
        'hover:border-amber-300', 'hover:bg-amber-50/80', 'bg-amber-50', 'bg-amber-50/80', 'bg-amber-100', 'bg-amber-200',
        'hover:shadow-amber-200/40', 'shadow-amber-500/20', 'group-hover/card:bg-amber-500',
        'text-amber-500', 'text-amber-600', 'text-amber-700',
        'group-hover/card:text-amber-700', 'group-hover/card:text-amber-600',
        'group-hover/card:border-amber-300', 'group-hover/card:ring-amber-200/50',
        'from-amber-500', 'to-amber-600',
        
        // ── Red (账号安全与风控体系) ──
        'border-red-100', 'border-red-200', 'border-red-300', 'border-red-500',
        'hover:border-red-300', 'hover:bg-red-50/80', 'bg-red-50', 'bg-red-50/80', 'bg-red-100', 'bg-red-200',
        'hover:shadow-red-200/40', 'shadow-red-500/20', 'group-hover/card:bg-red-500',
        'text-red-500', 'text-red-600', 'text-red-700',
        'group-hover/card:text-red-700', 'group-hover/card:text-red-600',
        'group-hover/card:border-red-300', 'group-hover/card:ring-red-200/50',
        'from-red-500', 'to-red-600',
        
        // ── Teal (客服与客户体验体系) ──
        'border-teal-100', 'border-teal-200', 'border-teal-300', 'border-teal-500',
        'hover:border-teal-300', 'hover:bg-teal-50/80', 'bg-teal-50', 'bg-teal-50/80', 'bg-teal-100', 'bg-teal-200',
        'hover:shadow-teal-200/40', 'shadow-teal-500/20', 'group-hover/card:bg-teal-500',
        'text-teal-500', 'text-teal-600', 'text-teal-700',
        'group-hover/card:text-teal-700', 'group-hover/card:text-teal-600',
        'group-hover/card:border-teal-300', 'group-hover/card:ring-teal-200/50',
        'from-teal-500', 'to-teal-600', 'focus:ring-teal-500/20', 'focus:border-teal-400',
        'group-focus-within:bg-teal-100', 'group-focus-within:text-teal-500',
        
        // ── Green (入门实操宝典) ──
        'border-green-100', 'border-green-200', 'border-green-300', 'border-green-500',
        'hover:border-green-300', 'hover:bg-green-50/80', 'bg-green-50', 'bg-green-50/80', 'bg-green-100', 'bg-green-200',
        'hover:shadow-green-200/40', 'shadow-green-500/20', 'group-hover/card:bg-green-500',
        'text-green-500', 'text-green-600', 'text-green-700',
        'group-hover/card:text-green-700', 'group-hover/card:text-green-600',
        'group-hover/card:border-green-300', 'group-hover/card:ring-green-200/50',
        'from-green-500', 'to-green-600', 'focus:ring-green-500/20', 'focus:border-green-400',
        'group-focus-within:bg-green-100', 'group-focus-within:text-green-500',
        
        // ── Violet (运营提升全攻略) ──
        'border-violet-100', 'border-violet-200', 'border-violet-300', 'border-violet-500',
        'hover:border-violet-300', 'hover:bg-violet-50/80', 'bg-violet-50', 'bg-violet-50/80', 'bg-violet-100', 'bg-violet-200',
        'hover:shadow-violet-200/40', 'shadow-violet-500/20', 'group-hover/card:bg-violet-500',
        'text-violet-500', 'text-violet-600', 'text-violet-700',
        'group-hover/card:text-violet-700', 'group-hover/card:text-violet-600',
        'group-hover/card:border-violet-300', 'group-hover/card:ring-violet-200/50',
        'from-violet-500', 'to-violet-600', 'focus:ring-violet-500/20', 'focus:border-violet-400',
        'group-focus-within:bg-violet-100', 'group-focus-within:text-violet-500',
        
        // ── Rose ──
        'border-rose-100', 'border-rose-200', 'border-rose-300', 'border-rose-500',
        'hover:border-rose-300', 'hover:bg-rose-50/80', 'bg-rose-50', 'bg-rose-50/80', 'bg-rose-100', 'bg-rose-200',
        'hover:shadow-rose-200/40', 'shadow-rose-500/20', 'group-hover/card:bg-rose-500',
        'text-rose-500', 'text-rose-600', 'text-rose-700',
        'group-hover/card:text-rose-700', 'group-hover/card:text-rose-600',
        'group-hover/card:border-rose-300', 'group-hover/card:ring-rose-200/50',
        'from-rose-500', 'to-rose-600', 'focus:ring-rose-500/20', 'focus:border-rose-400',
        'group-focus-within:bg-rose-100', 'group-focus-within:text-rose-500',
        
        // ── Pink ──
        'border-pink-100', 'border-pink-200', 'border-pink-300', 'border-pink-500',
        'hover:border-pink-300', 'hover:bg-pink-50/80', 'bg-pink-50', 'bg-pink-50/80', 'bg-pink-100', 'bg-pink-200',
        'hover:shadow-pink-200/40', 'shadow-pink-500/20', 'group-hover/card:bg-pink-500',
        'text-pink-500', 'text-pink-600', 'text-pink-700',
        'group-hover/card:text-pink-700', 'group-hover/card:text-pink-600',
        'group-hover/card:border-pink-300', 'group-hover/card:ring-pink-200/50',
        'from-pink-500', 'to-pink-600', 'focus:ring-pink-500/20', 'focus:border-pink-400',
        'group-focus-within:bg-pink-100', 'group-focus-within:text-pink-500',
        
        // ── Slate ──
        'border-slate-100', 'border-slate-200', 'border-slate-300', 'border-slate-500',
        'hover:border-slate-300', 'hover:bg-slate-50/80', 'bg-slate-50', 'bg-slate-50/80', 'bg-slate-100', 'bg-slate-200',
        'hover:shadow-slate-200/40', 'shadow-slate-500/20', 'group-hover/card:bg-slate-500',
        'text-slate-500', 'text-slate-600', 'text-slate-700',
        'group-hover/card:text-slate-700', 'group-hover/card:text-slate-600',
        'group-hover/card:border-slate-300', 'group-hover/card:ring-slate-200/50',
        'from-slate-500', 'to-slate-600', 'focus:ring-slate-500/20', 'focus:border-slate-400',
        'group-focus-within:bg-slate-100', 'group-focus-within:text-slate-500',
        
        // ── 通用交互效果 ──
        'group-hover/card:scale-110', 'group-hover/card:opacity-100', 'group-hover/card:translate-x-0',
        'group-hover/card:text-slate-600', 'group-hover/card:shadow-md', 'group-hover/card:ring-2',
        'hover:-translate-y-1', 'hover:shadow-lg', 'group-hover/card:text-white'
    ]
}
