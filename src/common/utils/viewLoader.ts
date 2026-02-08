// src/common/utils/viewLoader.ts
// ================================================================
// 🎯 P1 增强: 按需加载（Lazy Loading），大幅提升首屏速度
// 🎯 P2 优化: 使用 Vite glob import 替代 fetch，解决生产环境 404 问题
// 🎯 P3 优化: 本地持久化缓存 (LocalStorage Cache)
// ================================================================

import { APP_VERSION } from '../constants/constants';
import { StorageService } from '../../services/storageService';

const CACHE_PREFIX = 'view_cache_';

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
}

/**
 * 获取带版本的缓存键
 */
function getCacheKey(path: string): string {
    return `${CACHE_PREFIX}${APP_VERSION}_${path}`;
}

/**
 * 检查缓存
 */
function checkCache(path: string): string | null {
    try {
        const key = getCacheKey(path);
        const cached = StorageService.getRaw(key, null);
        if (cached) {
            // console.log(`[ViewLoader] Cache Hit: ${path}`);
            return cached;
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
    return null;
}

/**
 * 设置缓存
 */
function setCache(path: string, content: string): void {
    try {
        const key = getCacheKey(path);
        StorageService.setRaw(key, content);
        
        // 简单的清理逻辑：清理旧版本缓存
        // 遍历 localStorage，删除以 CACHE_PREFIX 开头但不匹配当前版本的 key
        // 仅在首次设置时偶尔执行，避免性能损耗？或者简单点，每次都检查太重了。
        // 这里仅简单设置。清理逻辑可以放在应用启动时统一执行一次。
    } catch (e) {
        console.warn('Cache write error:', e);
    }
}

/**
 * 清理旧版本缓存 (Exported for main.js or init)
 * 🔧 优化: 智能清理，只删除旧版本缓存，保留当前版本
 */
export function clearOldCache(): void {
    try {
        const keysToRemove: string[] = [];
        const currentVersionPrefix = `${CACHE_PREFIX}${APP_VERSION}_`;
        
        // 获取所有存储的键
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // 只清除旧版本的缓存，保留当前版本
            if (key && key.startsWith(CACHE_PREFIX) && !key.startsWith(currentVersionPrefix)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(k => StorageService.remove(k));
        
        if (keysToRemove.length > 0) {
            console.log(`[ViewLoader] 清理了 ${keysToRemove.length} 个旧版本缓存项`);
        }
    } catch (e) {
        console.warn('[ViewLoader] 缓存清理失败:', e);
    }
}

/**
 * 获取缓存使用情况
 */
export function getCacheStats(): CacheStats {
    const stats: CacheStats = {
        count: 0,
        size: 0,
        items: []
    };
    
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                const value = localStorage.getItem(key);
                const itemSize = value ? value.length * 2 : 0; // UTF-16编码，每字符2字节
                
                stats.count++;
                stats.size += itemSize;
                stats.items.push({
                    key,
                    size: itemSize,
                    sizeKB: (itemSize / 1024).toFixed(2)
                });
            }
        }
    } catch (e) {
        console.warn('[ViewLoader] 获取缓存统计失败:', e);
    }
    
    return stats;
}

/**
 * 使用 Vite 的 import.meta.glob 批量导入所有需要的 HTML 文件
 * query: '?raw' 告诉 Vite 将这些文件作为字符串导入，而不是文件 URL
 * import: 'default' 仅获取内容字符串
 * eager: false (默认) 保持懒加载，只在需要时请求网络 (在构建后变为分开的 chunk)
 */
const htmlModules = import.meta.glob([
    '/src/modules/**/*.html',
    '/src/components/**/*.html'
], {
    query: '?raw',
    import: 'default'
}) as HtmlModules;

/**
 * 视图配置注册表 - 仅保留目标容器映射
 * URL 现在是用来在 htmlModules 中查找的 key
 */
const VIEW_REGISTRY: ViewRegistry = {
    // === 核心视图 (Critical) ===
    'home': { path: '/src/modules/home/homeDisplay.html', target: 'main', isLoaded: false },
    'settings': { path: '/src/components/settings/systemSettings.html', target: '#modal-container', isLoaded: false },
    'modals': { path: '/src/components/modal/sharedModals.html', target: '#modal-container', isLoaded: false },

    // === 业务视图 (Lazy) ===
    'sops': { path: '/src/modules/sops/sops.html', target: 'main', isLoaded: false },
    'amz_hub': { path: '/src/modules/amz_hub/amz_hub.html', target: 'main', isLoaded: false },
    'more': { path: '/src/modules/more/more.html', target: 'main', isLoaded: false },

    // App Center 统一 Shell HTML
    'app_center': { path: '/src/modules/app_center/app_center.html', target: 'main', isLoaded: false },
};

/**
 * 渲染错误占位视图
 */
function renderErrorPlaceholder(container: HTMLElement, key: string, error: Error): void {
    const errorHtml = `
        <div class="view-error-placeholder p-8 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-red-200 rounded-xl bg-red-50/30 m-4">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                <i class="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <div>
                <h3 class="text-lg font-bold text-gray-800">视图加载失败: ${key}</h3>
                <p class="text-sm text-gray-500 max-w-md mt-1">${error.message || '未知错误'}</p>
            </div>
            <button 
                onclick="location.reload()" 
                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-sm"
            >
                <i class="fas fa-sync-alt mr-2"></i>刷新页面重试
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', errorHtml);
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
                throw new Error(`Module path not found in glob registry: ${path}`);
            }
            // 2. Load
            html = await loader();
            // 3. Set Cache
            setCache(path, html);
        }

        container.insertAdjacentHTML('beforeend', html);
        config.isLoaded = true;
        console.log(`✅ [ViewLoader] Loaded & Mounted: ${key} -> ${config.target}`);
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
 * 只加载 Home 和 全局模态框
 */
export async function initViews(): Promise<void> {
    clearOldCache();
    const startTime = performance.now();
    console.log("🚀 [ViewLoader] Initializing Critical Views (Bundled)...");

    await Promise.all([
        loadHtml('home'),
        loadHtml('settings'),
        loadHtml('modals')
    ]);

    const elapsed = (performance.now() - startTime).toFixed(0);
    console.log(`✅ [ViewLoader] Critical Views Ready (${elapsed}ms)`);
}

/**
 * 按需加载视图 (路由拦截器调用)
 * @param routeId - 路由ID
 */
export async function ensureViewLoaded(routeId: string): Promise<void> {
    // 动态导入menuConfig以获取视图路径
    const { getViewPathByRoute } = await import('../config/menuConfig');
    const viewPath = getViewPathByRoute(routeId);
    
    if (!viewPath) {
        // 不再警告，因为很多路由是子模块路由，不需要加载主视图
        return;
    }

    // 从路径中提取模块key
    const moduleKey = viewPath.split('/').filter(Boolean)[2]; // 例如: sops, app_center, amz_hub, more
    
    if (moduleKey && VIEW_REGISTRY[moduleKey]) {
        if (!VIEW_REGISTRY[moduleKey].isLoaded) {
            console.log(`⏳ [ViewLoader] Lazy loading module: ${moduleKey} (Mapped from ${routeId})...`);
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
 */
export async function loadTemplate(path: string): Promise<string> {
    try {
        // 尝试标准化路径
        if (!path.startsWith('/')) path = '/' + path;

        // 1. Check Cache
        const cachedHtml = checkCache(path);
        if (cachedHtml) return cachedHtml;

        const loader = htmlModules[path];
        if (!loader) {
            console.error(`[ViewLoader] Template not found in registry: ${path}`);
            // Fallback: 尝试不带前导斜杠
            const altPath = path.substring(1);
            if (htmlModules[altPath]) {
                const html = await htmlModules[altPath]();
                setCache(path, html); // Cache for original path to avoid retry
                return html;
            }

            throw new Error(`Template path not found: ${path}`);
        }
        
        const html = await loader();
        setCache(path, html);
        return html;
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error(`[ViewLoader] Failed to load template [${path}]:`, error);
        return `<div class="p-4 text-red-500">Error loading template: ${error.message}</div>`;
    }
}
