import { defineConfig } from 'vite';
import { resolve } from 'path';
import checker from 'vite-plugin-checker';

export default defineConfig({
    plugins: [
        checker({
            typescript: true,
            // 暂时禁用ESLint检查，避免配置冲突
            // eslint: {
            //     lintCommand: 'eslint "./src/**/*.{js,ts,jsx,tsx}"'
            // }
        })
    ],
    root: './',

    // 开发服务器配置
    server: {
        port: 3000,
        open: true,
        cors: true,
        // 代理配置 - 解决开发环境 CORS 问题
        proxy: {
            // 代理 /v1 路径到生产环境的 LLM Gateway
            '/v1': {
                target: 'https://llm-gateway.hongecb.store',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path,
                configure: (proxy, options) => {
                    proxy.on('error', (err, req, res) => {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log('Sending Request to the Target:', req.method, req.url);
                    });
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
                    });
                }
            }
        }
    },

    // 构建配置
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false, // 生产环境关闭sourcemap减小体积
        // 代码分割优化
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                // 手动分包策略 - 回退到简单对象形式避免 Alpine 组件问题
                manualChunks: {
                    // 核心框架
                    'vendor-core': ['alpinejs'],
                    // 图表库
                    'vendor-charts': ['chart.js'],
                    // 网格布局
                    'vendor-grid': ['gridstack'],
                    // Markdown渲染
                    'vendor-markdown': ['marked'],
                    // 工具库
                    'vendor-utils': ['clsx', 'tailwind-merge', 'jsonrepair', 'zod']
                },
                // 优化chunk命名
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name.split('.');
                    const ext = info[info.length - 1];
                    if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
                        return 'assets/images/[name]-[hash].[ext]';
                    } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
                        return 'assets/fonts/[name]-[hash].[ext]';
                    } else if (ext === 'css') {
                        return 'assets/css/[name]-[hash].[ext]';
                    }
                    return 'assets/[name]-[hash].[ext]';
                }
            }
        },
        // 生产环境压缩
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // 生产环境移除console
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'] // 移除特定console方法
            }
        },
        // Chunk大小警告阈值
        chunkSizeWarningLimit: 500,
        // CSS代码分割
        cssCodeSplit: true,
        // 启用CSS压缩
        cssMinify: true,
        // 资源内联阈值(小于4KB的资源内联为base64)
        assetsInlineLimit: 4096,
        // 启用gzip压缩提示
        reportCompressedSize: true
    },

    // 路径别名 (与 tsconfig.json 保持一致)
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@common': resolve(__dirname, 'src/common'),
            '@services': resolve(__dirname, 'src/services'),
            '@modules': resolve(__dirname, 'src/modules'),
            '@components': resolve(__dirname, 'src/components'),
            '@types': resolve(__dirname, 'src/types')
        },
        // 支持 .ts 和 .js 文件扩展名解析
        extensions: ['.ts', '.js', '.json']
    },

    // CSS 处理
    css: {
        devSourcemap: true
    }
});
