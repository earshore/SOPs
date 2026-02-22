export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
        // 🔧 临时禁用 PurgeCSS - 它会删除动态加载模板中的类
        // TODO: 配置 PurgeCSS 正确扫描所有 HTML 模板文件
        // ...(process.env.NODE_ENV === 'production' ? {
        //     '@fullhuman/postcss-purgecss': purgecss({...})
        // } : {})
    },
}
