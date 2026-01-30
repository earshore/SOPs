import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        // 使用 jsdom 模拟浏览器环境
        environment: 'jsdom',

        // 测试文件匹配
        include: ['src/**/*.test.js', 'src/**/*.spec.js', 'tests/**/*.test.js'],

        // 设置文件
        setupFiles: ['./tests/setup.js'],

        // 覆盖率配置
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: [
                'src/**/*.js'
            ],
            exclude: [
                'src/**/*.test.js',
                'src/**/*.spec.js',
                'src/main.js',
                'src/workers/**',
                'src/**/constants/**'
            ],
            // 覆盖率阈值 (逐步提升)
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 55,
                statements: 60
            }
        },

        // 全局设置
        globals: true,

        // 报告配置
        reporters: ['verbose', 'html'],

        // 测试超时
        testTimeout: 10000,

        // 钩子超时
        hookTimeout: 10000
    },

    // 路径别名 (与 jsconfig.json / vite.config.js 保持一致)
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@common': resolve(__dirname, 'src/common'),
            '@services': resolve(__dirname, 'src/services'),
            '@modules': resolve(__dirname, 'src/modules'),
            '@components': resolve(__dirname, 'src/components')
        }
    }
});
