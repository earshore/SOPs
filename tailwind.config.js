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
        // SOPs Menu Color Schemes - Emerald (运营与推广体系)
        'border-emerald-100', 'hover:border-emerald-300', 'hover:bg-emerald-50/80',
        'hover:shadow-emerald-200/40', 'bg-emerald-50', 'group-hover/card:bg-emerald-500',
        'text-emerald-600', 'group-hover/card:text-white', 'group-hover/card:text-emerald-700',
        'text-emerald-500', 'group-hover/card:border-emerald-300', 'group-hover/card:text-emerald-600',
        'group-hover/card:ring-emerald-200/50',
        
        // Amber (供应链与物流体系)
        'border-amber-100', 'hover:border-amber-300', 'hover:bg-amber-50/80',
        'hover:shadow-amber-200/40', 'bg-amber-50', 'group-hover/card:bg-amber-500',
        'text-amber-600', 'group-hover/card:text-amber-700',
        'text-amber-500', 'group-hover/card:border-amber-300', 'group-hover/card:text-amber-600',
        'group-hover/card:ring-amber-200/50',
        
        // Red (账号安全与风控体系)
        'border-red-100', 'hover:border-red-300', 'hover:bg-red-50/80',
        'hover:shadow-red-200/40', 'bg-red-50', 'group-hover/card:bg-red-500',
        'text-red-600', 'group-hover/card:text-red-700',
        'text-red-500', 'group-hover/card:border-red-300', 'group-hover/card:text-red-600',
        'group-hover/card:ring-red-200/50',
        
        // Blue (客服与客户体验体系 & SOP总览 & 应用中心)
        'border-blue-100', 'hover:border-blue-300', 'hover:bg-blue-50/80',
        'hover:shadow-blue-200/40', 'bg-blue-50', 'group-hover/card:bg-blue-500',
        'text-blue-600', 'group-hover/card:text-blue-700',
        'text-blue-500', 'group-hover/card:border-blue-300', 'group-hover/card:text-blue-600',
        'group-hover/card:ring-blue-200/50',
        
        // Green (更多菜单)
        'border-green-100', 'hover:border-green-300', 'hover:bg-green-50/80',
        'hover:shadow-green-200/40', 'bg-green-50', 'group-hover/card:bg-green-500',
        'text-green-600', 'group-hover/card:text-green-700',
        'text-green-500', 'group-hover/card:border-green-300', 'group-hover/card:text-green-600',
        'group-hover/card:ring-green-200/50',
        
        // Common hover effects
        'group-hover/card:scale-110', 'group-hover/card:opacity-100', 'group-hover/card:translate-x-0',
        'group-hover/card:text-slate-600', 'group-hover/card:shadow-md', 'group-hover/card:ring-2',
        'hover:-translate-y-1', 'hover:shadow-lg'
    ]
}
