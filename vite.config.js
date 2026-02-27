import { defineConfig } from 'vite';
import { resolve } from 'path';
import checker from 'vite-plugin-checker';

export default defineConfig({
    plugins: [
        checker({
            typescript: {
                tsconfigPath: 'tsconfig.json',
                buildMode: false // 只在构建时检查,开发时跳过
            }
        })
    ],
    root: './',

    // 依赖优化配置
    optimizeDeps: {
        include: [
            'alpinejs',
            'marked',
            'zod',
            'zustand',
            'clsx',
            'tailwind-merge',
            'jsonrepair'
        ],
        exclude: [
            'chart.js', // 懒加载
            'gridstack'  // 懒加载
        ],
        // 强制预构建，避免首次加载慢
        force: false,
        // 禁用依赖发现，加快启动
        entries: ['index.html']
    },

    // 开发服务器配置
    server: {
        port: 5173,
        open: false,
        cors: true,
        // 代理配置 - 解决开发环境 CORS 问题
        proxy: {
            // 代理 /v1 路径到自定义 AI Gateway
            '/v1': {
                target: 'https://ai-gateway.hongecb.store',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('🔴 [Proxy Error]', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('🔵 [Proxy Request]', req.method, req.url, '→', proxyReq.path);
                    });
                    proxy.on('proxyRes', (proxyRes, req, _res) => {
                        console.log('🟢 [Proxy Response]', proxyRes.statusCode, req.url);
                    });
                }
            }
        }
    },

    // 构建配置
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true, // 生产环境关闭sourcemap减小体积
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
                    // 图表库（懒加载，但构建时仍需分包）
                    'vendor-charts': ['chart.js'],
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
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
                passes: 2,
                arrows: true,
                booleans: true,
                collapse_vars: true,
                comparisons: true,
                computed_props: true,
                hoist_funs: true,
                hoist_props: true,
                if_return: true,
                join_vars: true,
                keep_fargs: false,
                keep_fnames: false,
                loops: true,
                negate_iife: true,
                properties: true,
                reduce_funcs: true,
                reduce_vars: true,
                sequences: true,
                side_effects: true,
                switches: true,
                typeofs: true,
                unused: true,
                conditionals: true,
                dead_code: true,
                evaluate: true,
                inline: 2
            },
            mangle: {
                safari10: true,
                keep_fnames: false
            },
            format: {
                comments: false,
                ascii_only: true
            }
        },
        // Chunk大小警告阈值
        chunkSizeWarningLimit: 500,
        // CSS代码分割
        cssCodeSplit: true,
        // 启用CSS压缩 - 使用lightningcss获得更好的性能
        cssMinify: 'lightningcss',
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
            '@types': resolve(__dirname, 'src/types'),
            '@router': resolve(__dirname, 'src/common/router'),
            '@router/navigo': resolve(__dirname, 'src/common/router/navigo'),
            '@router/legacy': resolve(__dirname, 'src/common/router/legacy')
        },
        // 支持 .ts 和 .js 文件扩展名解析
        extensions: ['.ts', '.js', '.json']
    },

    // CSS 处理
    css: {
        devSourcemap: true,
        preprocessorOptions: {
            css: {
                charset: false // 减少体积，移除@charset声明
            }
        }
    }
});
