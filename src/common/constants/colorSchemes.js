// src/common/constants/colorSchemes.js
// ================================================================
// 🎨 统一颜色方案配置
// 消除各渲染函数中重复的颜色方案定义
// ================================================================

/**
 * 颜色方案配置
 * 用于卡片、按钮、侧边栏等组件的统一样式
 */
export const COLOR_SCHEMES = {
    blue: {
        border: 'border-blue-100 hover:border-blue-300',
        bg: 'hover:bg-blue-50/80',
        shadow: 'hover:shadow-lg hover:shadow-blue-200/40',
        iconBg: 'bg-blue-50 group-hover/card:bg-blue-500',
        iconText: 'text-blue-600 group-hover/card:text-white',
        iconScale: 'group-hover/card:scale-110',
        titleText: 'group-hover/card:text-blue-700',
        arrow: 'text-blue-500',
        versionBorder: 'group-hover/card:border-blue-300',
        versionText: 'group-hover/card:text-blue-600',
        glow: 'group-hover/card:ring-2 group-hover/card:ring-blue-200/50',
        // 侧边栏专用
        hoverBg: 'hover:bg-blue-50',
        hoverBorder: 'hover:border-blue-200',
        text: 'text-slate-700',
        hoverText: 'hover:text-blue-700',
        icon: 'text-slate-500',
        hoverIcon: 'group-hover:text-blue-600'
    },
    emerald: {
        border: 'border-emerald-100 hover:border-emerald-300',
        bg: 'hover:bg-emerald-50/80',
        shadow: 'hover:shadow-lg hover:shadow-emerald-200/40',
        iconBg: 'bg-emerald-50 group-hover/card:bg-emerald-500',
        iconText: 'text-emerald-600 group-hover/card:text-white',
        iconScale: 'group-hover/card:scale-110',
        titleText: 'group-hover/card:text-emerald-700',
        arrow: 'text-emerald-500',
        versionBorder: 'group-hover/card:border-emerald-300',
        versionText: 'group-hover/card:text-emerald-600',
        glow: 'group-hover/card:ring-2 group-hover/card:ring-emerald-200/50',
        hoverBg: 'hover:bg-emerald-50',
        hoverBorder: 'hover:border-emerald-200',
        text: 'text-slate-700',
        hoverText: 'hover:text-emerald-700',
        icon: 'text-slate-500',
        hoverIcon: 'group-hover:text-emerald-600'
    },
    amber: {
        border: 'border-amber-100 hover:border-amber-300',
        bg: 'hover:bg-amber-50/80',
        shadow: 'hover:shadow-lg hover:shadow-amber-200/40',
        iconBg: 'bg-amber-50 group-hover/card:bg-amber-500',
        iconText: 'text-amber-600 group-hover/card:text-white',
        iconScale: 'group-hover/card:scale-110',
        titleText: 'group-hover/card:text-amber-700',
        arrow: 'text-amber-500',
        versionBorder: 'group-hover/card:border-amber-300',
        versionText: 'group-hover/card:text-amber-600',
        glow: 'group-hover/card:ring-2 group-hover/card:ring-amber-200/50',
        hoverBg: 'hover:bg-amber-50',
        hoverBorder: 'hover:border-amber-200',
        text: 'text-slate-700',
        hoverText: 'hover:text-amber-700',
        icon: 'text-slate-500',
        hoverIcon: 'group-hover:text-amber-600'
    },
    red: {
        border: 'border-red-100 hover:border-red-300',
        bg: 'hover:bg-red-50/80',
        shadow: 'hover:shadow-lg hover:shadow-red-200/40',
        iconBg: 'bg-red-50 group-hover/card:bg-red-500',
        iconText: 'text-red-600 group-hover/card:text-white',
        iconScale: 'group-hover/card:scale-110',
        titleText: 'group-hover/card:text-red-700',
        arrow: 'text-red-500',
        versionBorder: 'group-hover/card:border-red-300',
        versionText: 'group-hover/card:text-red-600',
        glow: 'group-hover/card:ring-2 group-hover/card:ring-red-200/50',
        hoverBg: 'hover:bg-red-50',
        hoverBorder: 'hover:border-red-200',
        text: 'text-slate-700',
        hoverText: 'hover:text-red-700',
        icon: 'text-slate-500',
        hoverIcon: 'group-hover:text-red-600'
    },
    green: {
        border: 'border-green-100 hover:border-green-300',
        bg: 'hover:bg-green-50/80',
        shadow: 'hover:shadow-lg hover:shadow-green-200/40',
        iconBg: 'bg-green-50 group-hover/card:bg-green-500',
        iconText: 'text-green-600 group-hover/card:text-white',
        iconScale: 'group-hover/card:scale-110',
        titleText: 'group-hover/card:text-green-700',
        arrow: 'text-green-500',
        versionBorder: 'group-hover/card:border-green-300',
        versionText: 'group-hover/card:text-green-600',
        glow: 'group-hover/card:ring-2 group-hover/card:ring-green-200/50',
        hoverBg: 'hover:bg-green-50',
        hoverBorder: 'hover:border-green-200',
        text: 'text-slate-700',
        hoverText: 'hover:text-green-700',
        icon: 'text-slate-500',
        hoverIcon: 'group-hover:text-green-600'
    },
    purple: {
        border: 'border-purple-100 hover:border-purple-300',
        bg: 'hover:bg-purple-50/80',
        shadow: 'hover:shadow-lg hover:shadow-purple-200/40',
        iconBg: 'bg-purple-50 group-hover/card:bg-purple-500',
        iconText: 'text-purple-600 group-hover/card:text-white',
        iconScale: 'group-hover/card:scale-110',
        titleText: 'group-hover/card:text-purple-700',
        arrow: 'text-purple-500',
        versionBorder: 'group-hover/card:border-purple-300',
        versionText: 'group-hover/card:text-purple-600',
        glow: 'group-hover/card:ring-2 group-hover/card:ring-purple-200/50',
        hoverBg: 'hover:bg-purple-50',
        hoverBorder: 'hover:border-purple-200',
        text: 'text-slate-700',
        hoverText: 'hover:text-purple-700',
        icon: 'text-slate-500',
        hoverIcon: 'group-hover:text-purple-600'
    },
    slate: {
        border: 'border-slate-100 hover:border-slate-300',
        bg: 'hover:bg-slate-50/80',
        shadow: 'hover:shadow-lg hover:shadow-slate-200/40',
        iconBg: 'bg-slate-50 group-hover/card:bg-slate-500',
        iconText: 'text-slate-600 group-hover/card:text-white',
        iconScale: 'group-hover/card:scale-110',
        titleText: 'group-hover/card:text-slate-700',
        arrow: 'text-slate-500',
        versionBorder: 'group-hover/card:border-slate-300',
        versionText: 'group-hover/card:text-slate-600',
        glow: 'group-hover/card:ring-2 group-hover/card:ring-slate-200/50',
        hoverBg: 'hover:bg-slate-50',
        hoverBorder: 'hover:border-slate-200',
        text: 'text-slate-700',
        hoverText: 'hover:text-slate-700',
        icon: 'text-slate-500',
        hoverIcon: 'group-hover:text-slate-600'
    }
};

/**
 * 获取颜色方案
 * @param {string} color - 颜色名称
 * @returns {Object} 颜色方案对象
 */
export function getColorScheme(color) {
    return COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;
}

export default COLOR_SCHEMES;
