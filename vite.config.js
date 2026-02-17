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
                // 手动分包策略
                manualChunks(id) {
                    // 第三方依赖
                    if (id.includes('node_modules')) {
                        // Alpine.js核心
                        if (id.includes('alpinejs')) {
                            return 'vendor-alpine';
                        }
                        // 图表库
                        if (id.includes('chart.js')) {
                            return 'vendor-charts';
                        }
                        // 网格布局
                        if (id.includes('gridstack')) {
                            return 'vendor-grid';
                        }
                        // Markdown渲染
                        if (id.includes('marked')) {
                            return 'vendor-markdown';
                        }
                        // Zustand状态管理
                        if (id.includes('zustand')) {
                            return 'vendor-zustand';
                        }
                        // 其他工具库
                        if (id.includes('clsx') || id.includes('tailwind-merge') || 
                            id.includes('jsonrepair') || id.includes('zod')) {
                            return 'vendor-utils';
                        }
                        // 其他第三方库统一打包
                        return 'vendor-other';
                    }
                    
                    // 核心基础设施(合并到一个chunk避免循环依赖)
                    if (id.includes('/src/common/EventBus.ts') ||
                        id.includes('/src/common/constants/') ||
                        id.includes('/src/services/loggerService.ts') ||
                        id.includes('/src/common/di/Container.ts') ||
                        id.includes('/src/common/errors/') ||
                        id.includes('/src/common/config/') ||
                        id.includes('/src/common/utils/') ||
                        id.includes('/src/services/')) {
                        return 'core';
                    }
                    
                    // 路由系统
                    if (id.includes('/src/common/router/')) {
                        return 'router';
                    }
                    
                    // UI组件
                    if (id.includes('/src/common/ui/') || 
                        id.includes('/src/common/components/')) {
                        return 'ui';
                    }
                    
                    // 状态管理
                    if (id.includes('/src/stores/')) {
                        return 'stores';
                    }
                    
                    // 业务模块按模块分包,并进一步细分
                    if (id.includes('/src/modules/app_center/')) {
                        // Master Analysis子模块
                        if (id.includes('/views/master_analysis/')) {
                            return 'module-master-analysis';
                        }
                        // Keyword Hunter子模块
                        if (id.includes('/views/keyword_hunter/')) {
                            return 'module-keyword-hunter';
                        }
                        // App Center主模块
                        return 'module-app-center';
                    }
                    if (id.includes('/src/modules/amz_hub/')) {
                        return 'module-amz-hub';
                    }
                    if (id.includes('/src/modules/sops/')) {
                        // SOPs模块较大,按分类细分
                        if (id.includes('/views/growth/')) {
                            // Growth模块进一步细分(457KB → 按子模块拆分)
                            if (id.includes('/npi_tracker/')) {
                                return 'module-sops-growth-npi';
                            }
                            if (id.includes('/restricted_words/')) {
                                return 'module-sops-growth-restricted';
                            }
                            if (id.includes('/ppc_advertising/')) {
                                return 'module-sops-growth-ppc';
                            }
                            // 其他growth子模块合并
                            return 'module-sops-growth-other';
                        }
                        if (id.includes('/views/backend/')) {
                            return 'module-sops-backend';
                        }
                        if (id.includes('/views/safety/')) {
                            return 'module-sops-safety';
                        }
                        if (id.includes('/views/service/')) {
                            return 'module-sops-service';
                        }
                        return 'module-sops';
                    }
                    if (id.includes('/src/modules/more/')) {
                        return 'module-more';
                    }
                    if (id.includes('/src/modules/home/')) {
                        return 'module-home';
                    }
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
                pure_funcs: ['console.log', 'console.info', 'console.debug'], // 移除特定console方法
                passes: 2, // 多次压缩以获得更好效果
                // 🔧 紧急修复: 禁用可能破坏 Alpine.js 组件的压缩选项
                arrows: false, // 不转换箭头函数
                booleans: false, // 不优化布尔值
                collapse_vars: false, // 不折叠变量
                comparisons: false, // 不优化比较表达式
                computed_props: false, // 不优化计算属性
                hoist_funs: false, // 不提升函数声明
                hoist_props: false, // 不提升属性
                hoist_vars: false, // 不提升变量
                if_return: false, // 不优化if-return
                inline: false, // 不内联函数
                join_vars: false, // 不合并变量声明
                keep_fargs: true, // 保留未使用的函数参数
                keep_fnames: true, // 保留函数名
                loops: false, // 不优化循环
                negate_iife: false, // 不否定立即执行函数
                properties: false, // 不优化属性访问
                reduce_funcs: false, // 不优化函数
                reduce_vars: false, // 不优化变量
                sequences: false, // 不使用逗号序列
                side_effects: false, // 不移除无副作用的语句
                switches: false, // 不优化switch
                top_retain: null, // 不移除顶层未使用的函数
                typeofs: false, // 不优化typeof
                unsafe: false, // 不使用不安全的优化
                unsafe_arrows: false, // 不使用不安全的箭头函数优化
                unsafe_comps: false, // 不使用不安全的比较优化
                unsafe_Function: false, // 不使用不安全的Function优化
                unsafe_math: false, // 不使用不安全的数学优化
                unsafe_methods: false, // 不使用不安全的方法优化
                unsafe_proto: false, // 不使用不安全的原型优化
                unsafe_regexp: false, // 不使用不安全的正则优化
                unsafe_undefined: false, // 不使用不安全的undefined优化
                unused: false // 不移除未使用的变量和函数
            },
            mangle: {
                safari10: true, // 兼容Safari 10
                keep_fnames: true // 保留函数名，避免 Alpine 组件注册失败
            },
            format: {
                comments: false // 移除注释
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
        reportCompressedSize: true,
        // 目标浏览器
        target: 'es2015',
        // 启用模块预加载
        modulePreload: {
            polyfill: true
        }
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
