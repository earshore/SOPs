import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { promisify } from 'util';
import { gzip, brotliCompress, constants as zlibConstants } from 'zlib';
import { readdir, readFile, stat, writeFile } from 'fs/promises';

// ES 模块兼容的 __dirname 定义
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');
const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const devServerForwardConsole = {
    enabled: true,
    unhandledErrors: true,
    logLevels: ['error', 'warn']
};
const compressibleAssetPattern = /\.(js|mjs|json|css|html)$/i;

function getAppVersion() {
    try {
        const tag = execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
            cwd: __dirname,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();

        if (tag) {
            return tag.replace(/^v/i, '');
        }
    } catch {
        // Fallback for builds without git metadata.
    }

    return packageJson.version;
}

async function collectCompressibleFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nestedFiles = await Promise.all(entries.map(async (entry) => {
        const fullPath = resolve(directory, entry.name);

        if (entry.isDirectory()) {
            return collectCompressibleFiles(fullPath);
        }

        return entry.isFile() && compressibleAssetPattern.test(entry.name) ? [fullPath] : [];
    }));

    return nestedFiles.flat();
}

function createPrecompressPlugin({ threshold = 10240 } = {}) {
    let outputDir;

    return {
        name: 'sops:precompress-assets',
        apply: 'build',
        configResolved(config) {
            outputDir = resolve(config.root, config.build.outDir);
        },
        async closeBundle() {
            const files = await collectCompressibleFiles(outputDir);

            await Promise.all(files.map(async (filePath) => {
                const { size } = await stat(filePath);
                if (size < threshold) {
                    return;
                }

                const input = await readFile(filePath);
                const [gzipSource, brotliSource] = await Promise.all([
                    gzipAsync(input, { level: zlibConstants.Z_BEST_COMPRESSION }),
                    brotliCompressAsync(input, {
                        params: {
                            [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
                            [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT
                        }
                    })
                ]);

                await Promise.all([
                    writeFile(`${filePath}.gz`, gzipSource),
                    writeFile(`${filePath}.br`, brotliSource)
                ]);
            }));
        }
    };
}

export default defineConfig({
    publicDir: 'public',
    define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(getAppVersion()),
        __BUNDLED_DEV__: 'false',
        __SERVER_FORWARD_CONSOLE__: JSON.stringify(devServerForwardConsole)
    },
    plugins: [
        createPrecompressPlugin()
    ],

    // ================================================================
    // Vitest 测试配置
    // ================================================================
    test: {
        environment: 'jsdom',
        include: [
            'src/**/*.test.ts',
            'src/**/*.test.tsx',
            'src/**/*.spec.ts',
            'tests/**/*.test.ts',
            'tests/**/*.spec.ts'
        ],
        exclude: [
            'tests/e2e/**',
            'tests/performance/**',
            'tests/startup/**',
            'tests/visual/**',
            'tests/integration/router-state.test.ts',
            'tests/integration/routing.test.ts',
            'tests/integration/module-loading.test.ts',
            'tests/integration/http-cache.test.ts',
            'tests/integration/user-flow.test.ts',
            'tests/unit/RouteErrorHandler.test.ts',
            'tests/unit/RouteMiddleware.test.ts',
            'tests/unit/design-tokens.test.ts',
            'tests/unit/scraper-historyPanel.test.ts',
            'tests/unit/scraper-panel.test.ts'
        ],
        setupFiles: ['./tests/setup.ts'],
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
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 55,
                statements: 60
            }
        },
        globals: true,
        reporters: ['verbose', 'html'],
        testTimeout: 10000,
        hookTimeout: 10000,
        threads: true,
        isolate: true
    },

    // 依赖优化配置
    optimizeDeps: {
        include: [
            '@alpinejs/csp',
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
        // 禁用自动打开浏览器，改用 package.json 脚本控制
        open: false,
        cors: true,
        forwardConsole: devServerForwardConsole,
        // 静态资源服务
        fs: {
            strict: false,
            allow: ['..']
        }
    },

    // 构建配置
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false, // 生产环境关闭sourcemap减小体积
        // 代码分割优化
        rollupOptions: {
            // 确保.ts文件被正确处理为.js
            external: [],
            output: {
                manualChunks(id) {
                    const normalizedId = id.replace(/\\/g, '/');
                    if (!normalizedId.includes('/node_modules/')) {
                        return undefined;
                    }

                    if (normalizedId.includes('/node_modules/@alpinejs/csp/')) {
                        return 'vendor-core';
                    }
                    if (normalizedId.includes('/node_modules/chart.js/')) {
                        return 'vendor-charts';
                    }
                    if (normalizedId.includes('/node_modules/marked/')) {
                        return 'vendor-markdown';
                    }
                    if (
                        normalizedId.includes('/node_modules/clsx/') ||
                        normalizedId.includes('/node_modules/tailwind-merge/') ||
                        normalizedId.includes('/node_modules/jsonrepair/') ||
                        normalizedId.includes('/node_modules/zod/')
                    ) {
                        return 'vendor-utils';
                    }

                    return undefined;
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
                passes: 3,
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
                inline: 3,
                unsafe: false,
                unsafe_comps: false,
                unsafe_math: false,
                unsafe_proto: false
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
        chunkSizeWarningLimit: 300,
        // CSS代码分割
        cssCodeSplit: true,
        // 启用CSS压缩 - 临时使用esbuild进行测试
        cssMinify: 'esbuild',
        // 资源内联阈值(小于4KB的资源内联为base64)
        assetsInlineLimit: 4096,
        // 启用gzip压缩提示
        reportCompressedSize: true
    },

    // 路径别名 (与 tsconfig.json 保持一致)
    resolve: {
        alias: [
            { find: /^@router\/navigo\//, replacement: `${resolve(__dirname, 'src/common/router/navigo')}/` },
            { find: /^@router\/legacy\//, replacement: `${resolve(__dirname, 'src/common/router/legacy')}/` },
            { find: /^@router\//, replacement: `${resolve(__dirname, 'src/common/router')}/` },
            { find: /^@common\//, replacement: `${resolve(__dirname, 'src/common')}/` },
            { find: /^@services\//, replacement: `${resolve(__dirname, 'src/services')}/` },
            { find: /^@modules\//, replacement: `${resolve(__dirname, 'src/modules')}/` },
            { find: /^@components\//, replacement: `${resolve(__dirname, 'src/components')}/` },
            { find: /^@types\//, replacement: `${resolve(__dirname, 'src/types')}/` },
            { find: /^@\//, replacement: `${resolve(__dirname, 'src')}/` }
        ],
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
