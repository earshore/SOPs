import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        // 使用 jsdom 模拟浏览器环境
        environment: 'jsdom',

        // 测试文件匹配
        include: ['src/**/*.test.js', 'src/**/*.spec.js'],

        // 覆盖率配置
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: [
                'src/services/**',
                'src/common/utils/**',
                'src/common/config/**'
            ],
            exclude: [
                'src/**/*.test.js',
                'src/**/*.spec.js'
            ],
            // 覆盖率阈值
            thresholds: {
                lines: 50,
                functions: 50,
                branches: 50,
                statements: 50
            }
        },

        // 全局设置
        globals: true,

        // 报告配置
        reporters: ['verbose']
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
