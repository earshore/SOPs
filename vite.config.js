import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: './',

    // 开发服务器配置
    server: {
        port: 3000,
        open: true,
        cors: true
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
