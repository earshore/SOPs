/**
 * 数据导入处理器
 */

import type {
    ScrapedData,
    ProductData,
    ImportResult,
    FileReadResult
} from '../types';
import type { ScrapedProduct, CustomerReview, ScraperSite } from '@/types/modules-business';
import { validateScrapedData } from '../utils/validators';
import { getFlag } from '../utils/formatters';
import { HistoryService } from '../../services/historyService';
import { LANGUAGE_HEADERS } from '../../../../../../common/constants/constants';
import { showToast } from '../../../../../../common/ui';
import eventBus from '../../../../../../common/EventBus';
import { APP_EVENTS, MODULE_EVENTS } from '../../../../../../common/constants/eventConstants';
import { SafeRenderer } from '../../../../../../common/infrastructure/SafeRenderer';
import { ValidationError, BusinessError, SystemError } from '@common/errors/AppError';
/**
 * 读取文件为JSON
 */
export function readFileAsJSON(file: File): Promise<FileReadResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;

                // 验证内容不为空
                if (!content || content.trim().length === 0) {
                    reject(new ValidationError(
                        `文件 ${file.name} 内容为空`,
                        'SCRAPER_IMP_001',
                        'content',
                        content,
                        { module: 'ScraperImportHandler', action: 'readFileAsJSON', filename: file.name }
                    ));
                    return;
                }

                // 尝试解析JSON
                let json: unknown;
                try {
                    json = JSON.parse(content);
                } catch (parseError) {
                    reject(new SystemError(
                        `文件 ${file.name} 不是有效的JSON格式: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                        'SCRAPER_IMP_002',
                        { module: 'ScraperImportHandler', action: 'readFileAsJSON', filename: file.name, contentPreview: content.substring(0, 100) },
                        parseError instanceof Error ? parseError : undefined
                    ));
                    return;
                }

                // 验证JSON不为null或undefined
                if (json === null || json === undefined) {
                    reject(new ValidationError(
                        `文件 ${file.name} JSON内容无效`,
                        'SCRAPER_IMP_003',
                        'json',
                        json,
                        { module: 'ScraperImportHandler', action: 'readFileAsJSON', filename: file.name }
                    ));
                    return;
                }

                resolve({ data: json, filename: file.name });
            } catch (err) {
                console.error(`[Scraper] 解析文件 ${file.name} 失败:`, err);
                reject(new SystemError(
                    `文件 ${file.name} 解析失败: ${err instanceof Error ? err.message : String(err)}`,
                    'SCRAPER_IMP_004',
                    { module: 'ScraperImportHandler', action: 'readFileAsJSON', filename: file.name },
                    err instanceof Error ? err : undefined
                ));
            }
        };

        reader.onerror = () => {
            console.error(`[Scraper] 读取文件 ${file.name} 失败:`, reader.error);
            reject(new SystemError(
                `无法读取文件 ${file.name}: ${reader.error?.message || '未知错误'}`,
                'SCRAPER_IMP_005',
                { module: 'ScraperImportHandler', action: 'readFileAsJSON', filename: file.name },
                reader.error || undefined
            ));
        };

        reader.readAsText(file);
    });
}

/**
 * 获取评论签名（用于去重）
 */
export function getReviewSignature(review: CustomerReview): string {
    // 优先使用 review ID
    if ('id' in review && review.id) return String(review.id);

    // 构建签名
    const date = ('review_date' in review ? review.review_date : '') || '';
    const author = review.author || '';
    const headline = review.headline || review.title || '';

    return `${date}_${author}_${headline.substring(0, 20)}`.trim();
}

/**
 * 合并多站点产品数据
 */
export function mergeProducts(
    productPool: Map<string, Array<ScrapedProduct & { _source_site?: string; _filename?: string }>>,
    targetMarketplace: string,
    currentProductsMap: Map<string, ScrapedProduct>
): ProductData[] {
    const finalProducts: ProductData[] = [];

    for (const [asin, versions] of productPool.entries()) {
        const masterVersion = versions.find(v => v._source_site === targetMarketplace);
        const existingVersion = currentProductsMap.get(asin);
        const baseProduct = existingVersion || masterVersion || versions[0];

        if (!baseProduct) continue;

        const mergedProduct: ScrapedProduct = JSON.parse(JSON.stringify(baseProduct));
        if (!mergedProduct.metadata) mergedProduct.metadata = {};

        const allReviewSources: Array<ScrapedProduct & { _source_site?: string }> = [];
        if (existingVersion) allReviewSources.push(existingVersion);
        allReviewSources.push(...versions);

        const uniqueReviewsMap = new Map<string, CustomerReview>();

        allReviewSources.forEach(ver => {
            if (Array.isArray(ver.customer_reviews)) {
                ver.customer_reviews.forEach((r: CustomerReview) => {
                    const sig = getReviewSignature(r);
                    if (!uniqueReviewsMap.has(sig)) {
                        const reviewWithOrigin = { ...r } as CustomerReview & { _origin_site?: string };
                        if (ver._source_site && ver._source_site !== "Unknown") {
                            reviewWithOrigin._origin_site = ver._source_site;
                        }
                        uniqueReviewsMap.set(sig, reviewWithOrigin);
                    }
                });
            }
        });

        mergedProduct.customer_reviews = Array.from(uniqueReviewsMap.values());

        // 清理临时字段
        const cleanProduct = { ...mergedProduct };
        delete (cleanProduct as ScrapedProduct & { _source_site?: string; _filename?: string })._source_site;
        delete (cleanProduct as ScrapedProduct & { _source_site?: string; _filename?: string })._filename;

        finalProducts.push(cleanProduct);
    }

    return finalProducts;
}

/**
 * 显示站点选择弹窗
 */
export function showMarketplaceSelectionModal(sites: string[]): Promise<string | null> {
    return new Promise((resolve) => {
        const modalId = 'site-select-modal-' + Date.now();
        const backdrop = document.createElement('div');
        backdrop.id = modalId;
        backdrop.className = "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in";

        const SITE_NAME_MAP: Record<string, string> = {
            DE: '德国', FR: '法国', IT: '意大利', ES: '西班牙', NL: '荷兰',
            SE: '瑞典', PL: '波兰', BE: '比利时', IE: '爱尔兰', UK: '英国'
        };

        const content = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white">
                    <h3 class="text-lg font-bold flex items-center gap-2">
                        <i class="fas fa-globe"></i> 检测到多站点数据
                    </h3>
                    <p class="text-blue-100 text-xs mt-1">您导入的文件包含多个市场的数据 (${sites.join(", ")})</p>
                </div>
                
                <div class="p-6">
                    <p class="text-slate-600 text-sm mb-4 font-medium">
                        请选择一个<span class="text-blue-600 font-bold">主站点</span>：
                        <br/><span class="text-xs text-slate-400 font-normal">我们将保留主站点的标题、五点描述、Review，并自动合并其他站点的Review。</span>
                    </p>
                    
                    <div class="space-y-3 mb-6">
                        ${sites.map((site, index) => `
                            <label class="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                <input type="radio" name="site_choice" value="${site}" ${index === 0 ? 'checked' : ''} 
                                    class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                                <span class="ml-3 font-bold text-slate-700 group-hover:text-blue-700"> ${SITE_NAME_MAP[site] || site} - ${site} </span>
                                <span class="ml-auto text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                    ${getFlag(site)}
                                </span>
                            </label>
                        `).join('')}
                    </div>

                    <div class="flex justify-end gap-3">
                        <button id="btn-cancel-${modalId}" class="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm transition-colors">
                            取消导入
                        </button>
                        <button id="btn-confirm-${modalId}" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition-transform transform active:scale-95">
                            确认合并
                        </button>
                    </div>
                </div>
            </div>
        `;

        const renderer = SafeRenderer.getInstance();
        renderer.renderTemplate(backdrop, content);
        document.body.appendChild(backdrop);

        const btnConfirm = document.getElementById(`btn-confirm-${modalId}`) as HTMLButtonElement;
        const btnCancel = document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement;

        let resolved = false;

        const cleanup = () => {
            if (btnConfirm) btnConfirm.removeEventListener('click', handleConfirm);
            if (btnCancel) btnCancel.removeEventListener('click', handleCancel);

            try {
                if (backdrop && document.body.contains(backdrop)) {
                    document.body.removeChild(backdrop);
                }
            } catch (error) {
                console.error('[Scraper] 清理弹窗失败:', error);
            }
        };

        const handleConfirm = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            if (resolved) return;
            resolved = true;

            const selectedInput = backdrop.querySelector('input[name="site_choice"]:checked') as HTMLInputElement;
            const selected = selectedInput ? selectedInput.value : null;

            cleanup();
            resolve(selected);
        };

        const handleCancel = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            if (resolved) return;
            resolved = true;

            cleanup();
            resolve(null);
        };

        btnConfirm.addEventListener('click', handleConfirm, { once: true });
        btnCancel.addEventListener('click', handleCancel, { once: true });
    });
}

/**
 * 处理文件导入主流程
 */
export async function handleImportFiles(
    files: File[],
    currentScrapedData: ScrapedData | null,
    selectedSite: ScraperSite
): Promise<ImportResult> {
    try {
        // 验证文件类型
        const invalidFiles = files.filter(f => !f.name.toLowerCase().endsWith('.json'));
        if (invalidFiles.length > 0) {
            console.error('[Scraper] 文件类型错误:', invalidFiles.map(f => f.name));
            throw new ValidationError(
                `只支持JSON文件`,
                'SCRAPER_IMP_006',
                'files',
                invalidFiles.map(f => f.name),
                { module: 'ScraperImportHandler', action: 'handleImportFiles', invalidFiles: invalidFiles.map(f => f.name) }
            );
        }

        // 验证文件大小（最大10MB）
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            console.error('[Scraper] 文件过大:', oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`));
            throw new ValidationError(
                `文件大小不能超过10MB`,
                'SCRAPER_IMP_007',
                'files',
                oversizedFiles.map(f => ({ name: f.name, size: f.size })),
                { module: 'ScraperImportHandler', action: 'handleImportFiles', maxSize: MAX_FILE_SIZE }
            );
        }

        // 大文件警告（5MB以上）
        const LARGE_FILE_SIZE = 5 * 1024 * 1024;
        const largeFiles = files.filter(f => f.size > LARGE_FILE_SIZE && f.size <= MAX_FILE_SIZE);
        if (largeFiles.length > 0) {
            console.warn('[Scraper] 检测到大文件:', largeFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`));
            showToast(`⚠️ 检测到大文件，处理可能需要较长时间`, { type: 'warning' });
        }

        // 检查空文件
        const emptyFiles = files.filter(f => f.size === 0);
        if (emptyFiles.length > 0) {
            console.error('[Scraper] 空文件:', emptyFiles.map(f => f.name));
            throw new ValidationError(
                `文件内容为空`,
                'SCRAPER_IMP_008',
                'files',
                emptyFiles.map(f => f.name),
                { module: 'ScraperImportHandler', action: 'handleImportFiles', emptyFiles: emptyFiles.map(f => f.name) }
            );
        }

        showToast(`📂 正在解析 ${files.length} 个文件...`, { type: 'info' });

        const fileContents = await Promise.all(files.map(f => readFileAsJSON(f)));
        const productPool = new Map<string, Array<ScrapedProduct & { _source_site?: string; _filename?: string }>>();
        const detectedSites = new Set<string>();

        fileContents.forEach(({ data, filename }) => {
            if (!data) {
                console.warn(`[Scraper] 文件 ${filename} 数据为空，跳过`);
                return;
            }

            // 验证数据结构
            const validation = validateScrapedData(data);
            if (!validation.valid) {
                console.error(`[Scraper] 文件 ${filename} 数据验证失败:`, validation.error);
                throw new ValidationError(
                    `文件 ${filename} 数据验证失败`,
                    'SCRAPER_IMP_009',
                    'data',
                    validation.error,
                    { module: 'ScraperImportHandler', action: 'handleImportFiles', filename }
                );
            }

            let fileSite: string | null = null;

            // 类型守卫: 检查是否是包含products的对象
            if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'products' in data) {
                const dataWithMeta = data as { products: unknown[]; metadata?: { marketplace?: string } };
                fileSite = dataWithMeta.metadata?.marketplace || null;
            } else if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'metadata' in data) {
                // 单个产品对象
                fileSite = (data as { metadata?: { marketplace?: string } }).metadata?.marketplace || null;
            } else if (Array.isArray(data) && data.length > 0 && data[0]) {
                // 产品数组
                const firstProduct = data[0] as { metadata?: { marketplace?: string } };
                fileSite = firstProduct.metadata?.marketplace || null;
            }

            const site = fileSite || "Unknown";
            if (fileSite) detectedSites.add(fileSite);

            // 使用验证后的产品列表
            const list: ScrapedProduct[] = validation.products || [];

            list.forEach((p: ScrapedProduct) => {
                if (!p.asin) return;
                const productsForAsin = productPool.get(p.asin);
                const productWithSource = {
                    ...p,
                    _source_site: site,
                    _filename: filename
                };

                if (productsForAsin) {
                    productsForAsin.push(productWithSource);
                } else {
                    productPool.set(p.asin, [productWithSource]);
                }
            });
        });

        if (productPool.size === 0) {
            throw new BusinessError(
                "未找到有效的产品数据",
                'SCRAPER_IMP_010',
                { module: 'ScraperImportHandler', action: 'handleImportFiles', filesCount: files.length }
            );
        }

        let targetMarketplace: string = selectedSite || '';
        const hasExistingData = currentScrapedData && currentScrapedData.products && currentScrapedData.products.length > 0;

        // 决定基准站点的逻辑
        if (detectedSites.size > 1) {
            // 多站点数据，弹窗让用户选择（无论是否有现有数据）
            const selected = await showMarketplaceSelectionModal([...detectedSites]);
            if (!selected) {
                showToast("用户取消导入", { type: 'info' });
                return { success: false };
            }
            targetMarketplace = selected;
        } else if (detectedSites.size === 1) {
            // 单站点数据，直接使用新导入的站点（无论是否有现有数据）
            targetMarketplace = [...detectedSites][0] || '';
        } else if (hasExistingData && currentScrapedData) {
            // 新导入的数据没有站点信息，保留旧数据的站点
            targetMarketplace = currentScrapedData.metadata?.marketplace || '';
        }

        const currentProductsMap = new Map<string, ScrapedProduct>((currentScrapedData?.products || []).map((p: ScrapedProduct) => [p.asin, p]));
        const finalProducts = mergeProducts(productPool, targetMarketplace, currentProductsMap);

        const scrapedData: ScrapedData = {
            metadata: {
                marketplace: targetMarketplace,
                scrape_timestamp: new Date().toISOString(),
                total_asins: finalProducts.length,
                last_action: "multi_site_import_merge",
                domain: (LANGUAGE_HEADERS as Record<string, { domain: string; name: string }>)[targetMarketplace]?.domain || "unknown",
                language: (LANGUAGE_HEADERS as Record<string, { domain: string; name: string }>)[targetMarketplace]?.name || "unknown"
            },
            products: finalProducts
        };

        await HistoryService.saveAsync(scrapedData);

        // 触发事件通知其他模块更新
        eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, scrapedData);
        eventBus.emit(APP_EVENTS.DATA_UPDATED);
        eventBus.emit(APP_EVENTS.HISTORY_UPDATED);

        showToast(`✅ 成功导入并合并 ${finalProducts.length} 个ASIN (基准站点: ${targetMarketplace})`, { type: 'success' });

        return { success: true, data: scrapedData };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Scraper] 导入失败:', {
            error: error,
            errorMessage: errorMessage,
            filesCount: files.length,
            fileNames: files.map(f => f.name)
        });

        // 根据错误类型提供友好的错误提示
        let userMessage = "❌ 导入出错";
        if (errorMessage.includes('格式错误') || errorMessage.includes('JSON')) {
            userMessage = `❌ JSON格式错误: ${errorMessage}`;
        } else if (errorMessage.includes('读取文件')) {
            userMessage = `❌ 文件读取失败: ${errorMessage}`;
        } else if (errorMessage.includes('未找到有效')) {
            userMessage = `❌ ${errorMessage}`;
        } else {
            userMessage = `❌ 导入出错: ${errorMessage}`;
        }

        showToast(userMessage, { type: 'error' });

        return { success: false, error: errorMessage };
    }
}
