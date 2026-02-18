// vitest.config.js
// ================================================================
// 🎯 Vitest 测试配置
// 支持单元测试、集成测试、覆盖率报告
// ================================================================

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        // 使用 jsdom 模拟浏览器环境
        environment: 'jsdom',

        // 测试文件匹配 (支持 TypeScript)
        include: [
            'src/**/*.test.ts',
            'src/**/*.test.tsx',
            'src/**/*.spec.ts',
            'tests/**/*.test.ts',
            'tests/**/*.spec.ts'
        ],

        // 设置文件
        setupFiles: ['./tests/setup.ts'],

        // 覆盖率配置
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: [
                'src/**/*.ts',
                'src/**/*.tsx'
            ],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.test.tsx',
                'src/**/*.spec.ts',
                'src/**/*.d.ts',
                'src/main.ts',
                'src/workers/**',
                'src/**/mockData/**',
                'src/**/types/**'
            ],
            // 覆盖率阈值 (根据测试规范)
            // 当前目标: 60% (Week 2完成), 最终目标: 80% (Week 3完成)
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
        hookTimeout: 10000,

        // 并行执行
        threads: true,

        // 隔写环境
        isolate: true
    },

    // 路径别名 (与 tsconfig.json / vite.config.js 保持一致)
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
