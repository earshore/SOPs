import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        },
        // 生产环境压缩
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false, // 保留 console
                drop_debugger: true
            }
        }
    },

    // 路径别名 (与 jsconfig.json 保持一致)
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@common': resolve(__dirname, 'src/common'),
            '@services': resolve(__dirname, 'src/services'),
            '@modules': resolve(__dirname, 'src/modules'),
            '@components': resolve(__dirname, 'src/components')
        }
    },

    // CSS 处理
    css: {
        devSourcemap: true
    }
});
