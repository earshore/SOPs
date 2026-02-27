/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,html}",
        "./src/components/**/*.html",
        "./src/modules/**/*.html",
    ],
    theme: {
        extend: {
            // 🎨 与 CSS 变量系统同步的设计令牌
            colors: {
                // 🎨 与 CSS 变量系统完全同步
                primary: {
                    DEFAULT: '#3b82f6',      // --color-primary (blue-500)
                    light: '#60a5fa',        // blue-400
                    dark: '#2563eb',         // blue-600
                    darker: '#1d4ed8',       // blue-700
                },
                secondary: {
                    DEFAULT: '#64748b',      // --color-secondary (slate-500)
                    light: '#94a3b8',        // slate-400
                    dark: '#475569',         // slate-600
                },
                accent: {
                    DEFAULT: '#6366f1',      // --color-accent (indigo-500)
                    light: '#818cf8',        // indigo-400
                    dark: '#4f46e5',         // indigo-600
                },
                success: '#10b981',          // green-500
                warning: '#f59e0b',          // amber-500
                danger: '#ef4444',           // red-500
                info: '#3b82f6',             // blue-500
            },
            fontFamily: {
                sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Syne', 'DM Sans', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
            },
            fontSize: {
                '2xs': '0.625rem',   // 10px
                'xs': '0.75rem',     // 12px
                'sm': '0.8125rem',   // 13px
                'base': '0.875rem',  // 14px - 应用默认
                'md': '1rem',        // 16px
                'lg': '1.125rem',    // 18px
                'xl': '1.25rem',     // 20px
                '2xl': '1.5rem',     // 24px
                '3xl': '1.875rem',   // 30px
                '4xl': '2.25rem',    // 36px
                '5xl': '3rem',       // 48px
                '6xl': '3.75rem',    // 60px
            },
            spacing: {
                '2xs': '0.375rem',   // 6px
                'xs': '0.5rem',      // 8px
                'sm': '0.75rem',     // 12px
                'md': '1rem',        // 16px
                'lg': '1.5rem',      // 24px
                'xl': '2rem',        // 32px
                '2xl': '3rem',       // 48px
                '3xl': '4rem',       // 64px
                '4xl': '6rem',       // 96px
                '5xl': '8rem',       // 128px
            },
            borderRadius: {
                'xs': '2px',
                'sm': '4px',
                'md': '8px',
                'lg': '12px',
                'xl': '16px',
                '2xl': '24px',
                '3xl': '32px',
            },
            boxShadow: {
                'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
                'sm': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
                'lg': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -5px rgba(0, 0, 0, 0.03)',
                'xl': '0 20px 40px -10px rgba(0, 0, 0, 0.10)',
                '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                'inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
                'primary-sm': '0 2px 8px rgba(59, 130, 246, 0.15)',
                'primary-md': '0 4px 14px rgba(59, 130, 246, 0.20)',
                'primary-lg': '0 8px 25px rgba(59, 130, 246, 0.25)',
            },
            transitionDuration: {
                'fastest': '100ms',
                'fast': '200ms',
                'normal': '300ms',
                'slow': '400ms',
                'slower': '500ms',
                'slowest': '700ms',
            },
            transitionTimingFunction: {
                'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
                'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            },
            backdropBlur: {
                'xs': '2px',
                'sm': '4px',
                'md': '8px',
                'lg': '12px',
                'xl': '16px',
                '2xl': '24px',
                '3xl': '40px',
            },
            zIndex: {
                'hide': '-1',
                'base': '0',
                'raised': '1',
                'dropdown': '30',
                'sticky': '35',
                'header': '40',
                'overlay': '50',
                'modal-backdrop': '55',
                'modal': '60',
                'popover': '70',
                'toast': '80',
                'tooltip': '90',
                'max': '9999',
            },
        },
    },
    plugins: [],
    safelist: []
}
