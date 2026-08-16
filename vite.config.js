import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
import { promisify } from 'util';
import { gzip, brotliCompress, constants as zlibConstants } from 'zlib';
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
import { patchDeepChatBundleSource } from './config/patch-deep-chat-bundle.mjs';

// ES 模块兼容的 __dirname 定义
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');
const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const deepChatBundleSource = require.resolve('deep-chat/dist/deepChat.bundle.js');
const deepChatBundlePublicPath = '/assets/vendor/deepChat.bundle.js';
const devServerForwardConsole = {
  enabled: true,
  unhandledErrors: true,
  logLevels: ['error', 'warn'],
};
const compressibleAssetPattern = /\.(js|mjs|json|css|html)$/i;
const domainShellChunkPattern = /(?:^|\/)domain-shells-[^/]+\.js$/;

export function assertNoDomainShellChunk(bundle) {
  const chunks = Object.values(bundle).filter(output => output.type === 'chunk');
  const domainShellChunk = chunks.find(chunk => domainShellChunkPattern.test(chunk.fileName));

  if (domainShellChunk) {
    throw new Error(`Unexpected domain-shells chunk: ${domainShellChunk.fileName}`);
  }

  const entryImport = chunks
    .filter(chunk => chunk.isEntry)
    .flatMap(chunk => chunk.imports)
    .find(importedFileName => domainShellChunkPattern.test(importedFileName));

  if (entryImport) {
    throw new Error(`Entry chunk statically imports domain-shells: ${entryImport}`);
  }
}

export function resolveManualChunkName(id) {
  const normalizedId = id.replace(/\\/g, '/');
  const skillMatch = normalizedId.match(
    /\/vendor\/amazon-skills\/amazon-([^/]+)\/SKILL\.md(?:\?.*)?$/i
  );
  if (skillMatch?.[1]) {
    return 'skill-content-' + skillMatch[1].charAt(0).toLowerCase();
  }

  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  if (normalizedId.includes('/node_modules/@alpinejs/csp/')) {
    return 'vendor-core';
  }
  if (normalizedId.includes('/node_modules/@fortawesome/')) {
    if (normalizedId.includes('brands')) {
      return 'vendor-fa-brands';
    }
    return 'vendor-fa-core';
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
}

function createDomainShellEntryGuardPlugin() {
  return {
    name: 'sops:domain-shell-entry-guard',
    apply: 'build',
    generateBundle(_outputOptions, bundle) {
      assertNoDomainShellChunk(bundle);
    },
  };
}

function getAppVersion() {
  // package.json is the single source of truth for the displayed app version.
  // Do not use `git describe`: lightweight/non-semver tags (e.g. "latest")
  // would otherwise surface as the UI version label.
  const version = typeof packageJson.version === 'string' ? packageJson.version.trim() : '';
  return version || '0.0.0';
}

async function collectCompressibleFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async entry => {
      const fullPath = resolve(directory, entry.name);

      if (entry.isDirectory()) {
        return collectCompressibleFiles(fullPath);
      }

      return entry.isFile() && compressibleAssetPattern.test(entry.name) ? [fullPath] : [];
    })
  );

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

      await Promise.all(
        files.map(async filePath => {
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
                [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
              },
            }),
          ]);

          await Promise.all([
            writeFile(`${filePath}.gz`, gzipSource),
            writeFile(`${filePath}.br`, brotliSource),
          ]);
        })
      );
    },
  };
}

function createDeepChatBundleAssetPlugin() {
  let outputDir;
  let shouldCopyBundle = false;
  /** @type {string | null} */
  let patchedBundleCache = null;

  async function getPatchedDeepChatBundle(strict) {
    if (patchedBundleCache !== null) {
      return patchedBundleCache;
    }
    const raw = await readFile(deepChatBundleSource, 'utf8');
    patchedBundleCache = patchDeepChatBundleSource(raw, { strict });
    return patchedBundleCache;
  }

  return {
    name: 'sops:deep-chat-bundle-asset',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestPath = request.url?.split('?')[0];
        if (requestPath !== deepChatBundlePublicPath) {
          next();
          return;
        }

        try {
          const body = await getPatchedDeepChatBundle(false);
          response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          response.setHeader('Cache-Control', 'no-cache');
          response.end(body);
        } catch (error) {
          next(error);
        }
      });
    },
    configResolved(config) {
      shouldCopyBundle = config.command === 'build';
      outputDir = resolve(config.root, config.build.outDir);
    },
    async writeBundle() {
      if (!shouldCopyBundle) {
        return;
      }

      const targetPath = resolve(outputDir, deepChatBundlePublicPath.slice(1));
      await mkdir(dirname(targetPath), { recursive: true });
      // 生产构建必须命中补丁，避免 deep-chat 升级后静默回退崩溃
      const body = await getPatchedDeepChatBundle(true);
      await writeFile(targetPath, body, 'utf8');
    },
  };
}

export default defineConfig({
  publicDir: 'public',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(getAppVersion()),
    __BUNDLED_DEV__: 'false',
    __SERVER_FORWARD_CONSOLE__: JSON.stringify(devServerForwardConsole),
  },
  plugins: [
    createDeepChatBundleAssetPlugin(),
    createPrecompressPlugin(),
    createDomainShellEntryGuardPlugin(),
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
      'tests/**/*.spec.ts',
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
      'tests/unit/scraper-panel.test.ts',
    ],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/workers/**',
        'src/**/mockData/**',
        'src/**/types/**',
      ],
      thresholds: {
        lines: 82,
        statements: 80,
        functions: 82,
        branches: 65,
      },
    },
    globals: true,
    reporters: ['verbose', 'html'],
    testTimeout: 10000,
    hookTimeout: 10000,
    threads: true,
    maxWorkers: '33%',
    isolate: true,
  },

  // 依赖优化配置
  optimizeDeps: {
    include: ['@alpinejs/csp', 'marked', 'zod', 'zustand', 'clsx', 'tailwind-merge', 'jsonrepair'],
    exclude: [
      'chart.js', // 懒加载
      'gridstack', // 懒加载
    ],
    // 强制预构建，避免首次加载慢
    force: false,
    // 禁用依赖发现，加快启动
    entries: ['index.html'],
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
      allow: ['..'],
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // 生产环境关闭sourcemap减小体积
    // Avoid eagerly modulepreloading large deferred chunks (settings panel).
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter(
          dep => !dep.includes('system-settings') && !dep.includes('vendor-fa-brands')
        );
      },
    },
    // 代码分割优化
    rolldownOptions: {
      // 常规构建保留真实 warning，只关闭 Rolldown 的插件耗时占比诊断。
      checks: {
        pluginTimings: false,
      },
      // 确保.ts文件被正确处理为.js
      external: [],
      output: {
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
          mangle: true,
          codegen: {
            legalComments: 'none',
          },
        },
        manualChunks: resolveManualChunkName,
        // 优化chunk命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: assetInfo => {
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
        },
      },
    },
    // 生产环境压缩
    minify: 'oxc',
    // Keep a strict per-chunk guard so oversized production assets fail visibly.
    chunkSizeWarningLimit: 450,
    // CSS代码分割
    cssCodeSplit: true,
    // 启用CSS压缩 - 临时使用esbuild进行测试
    cssMinify: 'esbuild',
    // 资源内联阈值(小于4KB的资源内联为base64)
    assetsInlineLimit: 4096,
    // 启用gzip压缩提示
    reportCompressedSize: true,
  },

  // 路径别名 (与 tsconfig.json 保持一致)
  resolve: {
    alias: [{ find: /^@\//, replacement: `${resolve(__dirname, 'src')}/` }],
    // 支持 .ts 和 .js 文件扩展名解析
    extensions: ['.ts', '.js', '.json'],
  },

  // CSS 处理
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false, // 减少体积，移除@charset声明
      },
    },
  },
});
