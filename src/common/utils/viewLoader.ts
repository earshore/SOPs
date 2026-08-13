// src/common/utils/viewLoader.ts
// ================================================================
// 🎯 P1 增强: 按需加载（Lazy Loading），大幅提升首屏速度
// 🎯 P2 优化: 使用 Vite glob import 替代 fetch，解决生产环境 404 问题
// 🎯 P3 优化: 本地持久化缓存 (LocalStorage Cache)
// ================================================================

import { APP_VERSION } from '../constants/constants';
import { StorageService, CACHE_PREFIXES } from '@/services/storageService';
import { getViewPathByRoute } from '../config/menuConfig';
import { SystemError } from '@/common/errors/AppError';
import { createSafeFragment, escapeHtml } from '@/common/utils/security';
import { assembleSettingsTemplate } from '@/components/settings/loader';

const CACHE_PREFIX = CACHE_PREFIXES.VIEW;
const LEGACY_CACHE_PREFIX = 'view_cache_';
const VIEW_CACHE_SCHEMA_VERSION = 'view-v3';
const VIEW_CACHE_VERSION = `${APP_VERSION}:${VIEW_CACHE_SCHEMA_VERSION}`;
let hasCleanedOldViewCache = false;

/**
 * 视图配置接口
 */
export interface ViewConfig {
  path: string;
  target: string;
  isLoaded: boolean;
}

/**
 * 视图注册表类型
 */
export type ViewRegistry = Record<string, ViewConfig>;

/**
 * HTML模块加载器类型
 */
export type HtmlModuleLoader = () => Promise<string>;
export type HtmlModules = Record<string, HtmlModuleLoader>;

/**
 * 缓存统计信息
 */
export interface CacheStats {
  count: number;
  size: number;
  items: Array<{
    key: string;
    size: number;
    sizeKB: string;
  }>;
}

/**
 * 视图加载选项
 */
export interface ViewLoadOptions {
  useCache?: boolean;
  forceReload?: boolean;
  /** @deprecated 页面进入动画已移除；保留该字段以兼容历史调用。 */
  disableFadeIn?: boolean;
}

/**
 * 获取带版本的缓存键
 */
function getCacheKey(path: string): string {
  return `${CACHE_PREFIX}${VIEW_CACHE_VERSION}_${path}`;
}

/**
 * 检查缓存
 */
function checkCache(path: string): string | null {
  // 开发环境下禁用缓存，确保模板修改后能立即生效
  if (import.meta.env.DEV) {
    return null;
  }

  try {
    const key = getCacheKey(path);
    const cached = StorageService.getRaw(key, null);
    if (cached) {
      return cached;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * 设置缓存
 */
function setCache(path: string, content: string): void {
  // 开发环境下禁用缓存写入
  if (import.meta.env.DEV) {
    return;
  }

  try {
    const key = getCacheKey(path);
    StorageService.setRaw(key, content);
  } catch {
    // 缓存写入失败不应阻塞视图加载。
  }
}

/**
 * 清理旧版本缓存 (Exported for main.js or init)
 * 🔧 优化: 智能清理，只删除旧版本缓存，保留当前版本
 */
export function clearOldCache(): void {
  try {
    const keysToRemove: string[] = [];
    const currentVersionPrefix = `${CACHE_PREFIX}${VIEW_CACHE_VERSION}_`;

    // 获取所有存储的键
    const allKeys = StorageService.keys();

    // 只清除旧版本的缓存，保留当前版本
    for (const key of allKeys) {
      if (
        (key.startsWith(CACHE_PREFIX) && !key.startsWith(currentVersionPrefix)) ||
        key.startsWith(LEGACY_CACHE_PREFIX)
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => StorageService.remove(k));
  } catch {
    // 旧缓存清理失败不影响当前版本视图加载。
  }
}

function clearOldCacheOnce(): void {
  if (hasCleanedOldViewCache) {
    return;
  }

  clearOldCache();
  hasCleanedOldViewCache = true;
}

/**
 * 获取缓存使用情况
 */
export function getCacheStats(): CacheStats {
  const stats: CacheStats = {
    count: 0,
    size: 0,
    items: [],
  };

  try {
    const allKeys = StorageService.keys();

    for (const key of allKeys) {
      if (key.startsWith(CACHE_PREFIX) || key.startsWith(LEGACY_CACHE_PREFIX)) {
        const value = StorageService.getRaw(key, null);
        const itemSize = value ? value.length * 2 : 0; // UTF-16编码，每字符2字节

        stats.count++;
        stats.size += itemSize;
        stats.items.push({
          key,
          size: itemSize,
          sizeKB: (itemSize / 1024).toFixed(2),
        });
      }
    }
  } catch {
    return stats;
  }

  return stats;
}

/**
 * 使用 Vite 的 import.meta.glob 批量导入所有需要的 HTML 文件
 * query: '?raw' 告诉 Vite 将这些文件作为字符串导入，而不是文件 URL
 * import: 'default' 仅获取内容字符串
 * eager: false (默认) 保持懒加载，只在需要时请求网络 (在构建后变为分开的 chunk)
 */
const rawHtmlModules = import.meta.glob(['../../modules/**/*.html', '../../components/**/*.html'], {
  query: '?raw',
  import: 'default',
}) as Record<string, HtmlModuleLoader>;

const htmlModules = Object.fromEntries(
  Object.entries(rawHtmlModules).map(([path, loader]) => {
    const normalizedPath = path.startsWith('../../')
      ? `/src/${path.replace(/^\.\.\/\.\.\//, '')}`
      : path;
    return [normalizedPath, loader];
  })
) as HtmlModules;

/**
 * 视图配置注册表 - 仅保留目标容器映射
 * URL 现在是用来在 htmlModules 中查找的 key
 */
const VIEW_REGISTRY: ViewRegistry = {
  // === 核心视图 (Critical) ===
  home: { path: '/src/modules/home/homeDisplay.html', target: 'main', isLoaded: false },
  settings: {
    path: '/src/components/settings/systemSettings.html',
    target: '#modal-container',
    isLoaded: false,
  },

  // === 业务视图 (Lazy) ===
  sops: { path: '/src/modules/sops/sops.html', target: 'main', isLoaded: false },
  amz_hub: { path: '/src/modules/amz_hub/amz_hub.html', target: 'main', isLoaded: false },
  more: { path: '/src/modules/more/more.html', target: 'main', isLoaded: false },

  // 工作台 统一 Shell HTML
  app_center: { path: '/src/modules/app_center/app_center.html', target: 'main', isLoaded: false },
};

/**
 * 渲染错误占位视图
 */
function renderErrorPlaceholder(container: HTMLElement, key: string, error: Error): void {
  const safeKey = escapeHtml(key);
  const safeMessage = escapeHtml(error.message || '未知错误');
  const errorHtml = `
        <div class="view-error-placeholder p-8 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-red-200 rounded-xl bg-red-50/30 m-4">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                <i class="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <div>
                <h3 class="text-lg font-bold text-gray-800">视图加载失败: ${safeKey}</h3>
                <p class="text-sm text-gray-500 max-w-md mt-1">${safeMessage}</p>
            </div>
            <button 
                data-action="reload-page-viewloader"
                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-sm"
            >
                <i class="fas fa-sync-alt mr-2"></i>刷新页面重试
            </button>
        </div>
    `;
  // ✅ 安全: errorHtml仅包含静态模板和已转义的key/error.message
  container.appendChild(createSafeFragment(errorHtml));

  // 绑定事件处理器
  const reloadBtn = container.querySelector('[data-action="reload-page-viewloader"]');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      location.reload();
    });
  }
}

/**
 * 加载单个 HTML 模块
 * @returns 返回目标容器元素，失败返回 null
 */
async function loadHtml(key: string): Promise<HTMLElement | null> {
  const config = VIEW_REGISTRY[key];
  // 如果配置不存在或已加载，尝试直接返回容器
  if (!config) return null;

  if (config.isLoaded) {
    return document.querySelector<HTMLElement>(config.target);
  }

  const container = document.querySelector<HTMLElement>(config.target);
  if (!container) {
    console.error(`[ViewLoader] Target container not found: ${config.target}`);
    return null;
  }

  try {
    const path = config.path;

    // 1. Check Cache
    const cachedHtml = checkCache(path);
    let html: string;

    if (cachedHtml) {
      html = cachedHtml;
    } else {
      const loader = htmlModules[path];
      if (!loader) {
        throw new SystemError(
          `Module path not found in glob registry: ${path}`,
          'VIEW_MODULE_NOT_FOUND',
          { module: 'viewLoader', action: 'loadView', path }
        );
      }
      // 2. Load
      html = await loader();
      // 3. Set Cache
      setCache(path, html);
    }

    // TD-SET-01 Phase 2: settings shell carries section-slot markers; inline the
    // fragments here so the injected template is complete before Alpine evaluates
    // x-data (initAlpineSettings runs before the deferred view is injected).
    if (path === '/src/components/settings/systemSettings.html') {
      html = assembleSettingsTemplate(html);
    }

    // ✅ 安全: html来自Vite raw导入的本地静态模板，不包含用户输入
    container.appendChild(createSafeFragment(html));
    config.isLoaded = true;
    return container;
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error(`[ViewLoader] Failed to load [${key}]:`, error);
    renderErrorPlaceholder(container, key, error);
    return null;
  }
}

/**
 * 初始化核心视图
 * 只加载 Home 和 设置
 */
export async function initViews(): Promise<void> {
  clearOldCacheOnce();

  await Promise.all([loadHtml('home'), loadHtml('settings')]);
}

/**
 * 初始化首页视图。
 * 用于启动阶段优先挂载首屏内容，避免等待设置/共享弹窗模板。
 */
export async function initHomeView(): Promise<void> {
  clearOldCacheOnce();

  await loadHtml('home');
}

/**
 * 后台预热非首屏但常用的全局视图。
 */
export async function initDeferredViews(): Promise<void> {
  await loadHtml('settings');
}

/**
 * 按需加载视图 (路由拦截器调用)
 * @param routeId - 路由ID
 */
export async function ensureViewLoaded(routeId: string): Promise<void> {
  // 获取视图路径
  const viewPath = getViewPathByRoute(routeId);

  if (!viewPath) {
    // 不再警告，因为很多路由是子模块路由，不需要加载主视图
    return;
  }

  // 从路径中提取模块key
  const moduleKey = viewPath.split('/').filter(Boolean)[2]; // 例如: sops, app_center, amz_hub, more

  if (moduleKey && VIEW_REGISTRY[moduleKey]) {
    if (!VIEW_REGISTRY[moduleKey].isLoaded) {
      await loadHtml(moduleKey);
    }
  }
}

/**
 * 动态注册新视图 (保留 API 兼容)
 */
export function registerView(_viewConfig: Partial<ViewConfig>): void {
  // 暂不处理动态注册，现有逻辑不需要
}

/**
 * 通用：根据路径加载模版（解决子模块 fetch 404 问题）
 * @param path - 相对 src 的路径, e.g., 'src/modules/sops/views/growth/npi_tracker/template.html'
 * @param options - 加载选项
 */
export async function loadTemplate(path: string, options?: ViewLoadOptions): Promise<string> {
  // 尝试标准化路径
  if (!path.startsWith('/')) path = '/' + path;

  // 1. Check Cache
  const shouldUseCache = options?.useCache !== false && !options?.forceReload;
  const cachedHtml = shouldUseCache ? checkCache(path) : null;
  let html: string;

  if (cachedHtml) {
    html = cachedHtml;
  } else {
    const loader = htmlModules[path];
    if (!loader) {
      console.error(`[ViewLoader] Template not found in registry: ${path}`);
      // Fallback: 尝试不带前导斜杠
      const altPath = path.substring(1);
      if (htmlModules[altPath]) {
        html = await htmlModules[altPath]();
        if (shouldUseCache) {
          setCache(path, html); // Cache for original path to avoid retry
        }
      } else {
        throw new SystemError(`Template path not found: ${path}`, 'VIEW_TEMPLATE_NOT_FOUND', {
          module: 'viewLoader',
          action: 'loadView',
          path,
          attemptedPaths: [path, altPath],
        });
      }
    } else {
      html = await loader();
      if (shouldUseCache) {
        setCache(path, html);
      }
    }
  }

  return html;
}
