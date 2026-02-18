/**
 * 数据导入处理器
 */

import type { ScrapedData, ProductData } from '../types';
import { validateScrapedData } from '../utils/validators';
import { getFlag } from '../utils/formatters';
import { HistoryService } from '../../services/historyService';
import { LANGUAGE_HEADERS } from '../../../../../../common/constants/constants';
import { showToast } from '../../../../../../common/ui';
import eventBus from '../../../../../../common/EventBus';
import { APP_EVENTS, MODULE_EVENTS } from '../../../../../../common/constants/eventConstants';

/**
 * 读取文件为JSON
 */
export function readFileAsJSON(file: File): Promise<{ data: any; filename: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                
                // 验证内容不为空
                if (!content || content.trim().length === 0) {
                    reject(new Error(`文件 ${file.name} 内容为空`));
                    return;
                }
                
                // 尝试解析JSON
                let json;
                try {
                    json = JSON.parse(content);
                } catch (parseError) {
                    reject(new Error(`文件 ${file.name} 不是有效的JSON格式: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
                    return;
                }
                
                // 验证JSON不为null或undefined
                if (json === null || json === undefined) {
                    reject(new Error(`文件 ${file.name} JSON内容无效`));
                    return;
                }
                
                resolve({ data: json, filename: file.name });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error(`[Scraper] 解析文件 ${file.name} 失败:`, err);
                reject(new Error(`文件 ${file.name} 解析失败: ${errorMsg}`));
            }
        };
        
        reader.onerror = () => {
            const errorMsg = reader.error?.message || '未知错误';
            console.error(`[Scraper] 读取文件 ${file.name} 失败:`, reader.error);
            reject(new Error(`无法读取文件 ${file.name}: ${errorMsg}`));
        };
        
        reader.readAsText(file);
    });
}

/**
 * 获取评论签名（用于去重）
 */
export function getReviewSignature(review: any): string {
    if (review.id) return review.id;
    return `${review.date || review.review_date || ''}_${review.author || ''}_${(review.headline || review.title || '').substring(0, 20)}`.trim();
}

/**
 * 合并多站点产品数据
 */
export function mergeProducts(
    productPool: Map<string, any[]>,
    targetMarketplace: string,
    currentProductsMap: Map<string, any>
): ProductData[] {
    const finalProducts: ProductData[] = [];

    for (const [asin, versions] of productPool.entries()) {
        const masterVersion = versions.find(v => v._source_site === targetMarketplace);
        const existingVersion = currentProductsMap.get(asin);
        const baseProduct = existingVersion || masterVersion || versions[0];

        if (!baseProduct) continue;

        const mergedProduct: any = JSON.parse(JSON.stringify(baseProduct));
        if (!mergedProduct.metadata) mergedProduct.metadata = {};

        const allReviewSources: any[] = [];
        if (existingVersion) allReviewSources.push(existingVersion);
        allReviewSources.push(...versions);

        const uniqueReviewsMap = new Map<string, any>();

        allReviewSources.forEach(ver => {
            if (Array.isArray(ver.customer_reviews)) {
                ver.customer_reviews.forEach((r: any) => {
                    const sig = getReviewSignature(r);
                    if (!uniqueReviewsMap.has(sig)) {
                        if (ver._source_site && ver._source_site !== "Unknown") {
                            r._origin_site = ver._source_site;
                        }
                        uniqueReviewsMap.set(sig, r);
                    }
                });
            }
        });

        mergedProduct.customer_reviews = Array.from(uniqueReviewsMap.values());
        delete mergedProduct._source_site;
        delete mergedProduct._filename;
        finalProducts.push(mergedProduct);
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

        backdrop.innerHTML = content;
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
            setTimeout(() => resolve(selected), 0);
        };

        const handleCancel = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (resolved) return;
            resolved = true;
            
            cleanup();
            setTimeout(() => resolve(null), 0);
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
    selectedSite: string
): Promise<{ success: boolean; data?: ScrapedData; error?: string }> {
    try {
        // 验证文件类型
        const invalidFiles = files.filter(f => !f.name.toLowerCase().endsWith('.json'));
        if (invalidFiles.length > 0) {
            console.error('[Scraper] 文件类型错误:', invalidFiles.map(f => f.name));
            throw new Error(`只支持JSON文件，以下文件被忽略: ${invalidFiles.map(f => f.name).join(', ')}`);
        }
        
        // 验证文件大小（最大10MB）
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            console.error('[Scraper] 文件过大:', oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`));
            throw new Error(`文件大小不能超过10MB，以下文件被忽略: ${oversizedFiles.map(f => f.name).join(', ')}`);
        }
        
        // 大文件警告（5MB以上）
        const LARGE_FILE_SIZE = 5 * 1024 * 1024;
        const largeFiles = files.filter(f => f.size > LARGE_FILE_SIZE && f.size <= MAX_FILE_SIZE);
        if (largeFiles.length > 0) {
            console.warn('[Scraper] 检测到大文件:', largeFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`));
            showToast(`⚠️ 检测到大文件，处理可能需要较长时间`, "warning");
        }
        
        // 检查空文件
        const emptyFiles = files.filter(f => f.size === 0);
        if (emptyFiles.length > 0) {
            console.error('[Scraper] 空文件:', emptyFiles.map(f => f.name));
            throw new Error(`文件内容为空: ${emptyFiles.map(f => f.name).join(', ')}`);
        }

        showToast(`📂 正在解析 ${files.length} 个文件...`, "info");

        const fileContents = await Promise.all(files.map(f => readFileAsJSON(f)));
        const productPool = new Map<string, any[]>();
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
                throw new Error(`文件 ${filename} 数据验证失败: ${validation.error}`);
            }
            
            let fileSite: string | null = null;
            
            // 类型守卫: 检查是否是包含products的对象
            if (!Array.isArray(data) && 'products' in data) {
                const dataWithMeta = data as { products: any[]; metadata?: { marketplace?: string } };
                fileSite = dataWithMeta.metadata?.marketplace || null;
            } else if (!Array.isArray(data) && 'metadata' in data) {
                // 单个产品对象
                fileSite = (data as any).metadata?.marketplace || null;
            } else if (Array.isArray(data) && data.length > 0 && data[0]) {
                // 产品数组
                fileSite = data[0].metadata?.marketplace || null;
            }

            const site = fileSite || "Unknown";
            if (fileSite) detectedSites.add(fileSite);

            // 使用验证后的产品列表
            const list: any[] = validation.products || [];

            list.forEach((p: any) => {
                if (!p.asin) return;
                if (!productPool.has(p.asin)) {
                    productPool.set(p.asin, []);
                }
                productPool.get(p.asin)!.push({
                    ...p,
                    _source_site: site,
                    _filename: filename
                });
            });
        });

        if (productPool.size === 0) throw new Error("未找到有效的产品数据");

        let targetMarketplace: string = selectedSite || '';
        const hasExistingData = currentScrapedData && currentScrapedData.products && currentScrapedData.products.length > 0;

        if (!hasExistingData && detectedSites.size > 1) {
            const selected = await showMarketplaceSelectionModal([...detectedSites]);
            if (!selected) {
                showToast("用户取消导入", "info");
                return { success: false };
            }
            targetMarketplace = selected;
        } else if (!hasExistingData && detectedSites.size === 1) {
            targetMarketplace = [...detectedSites][0] || '';
        } else if (hasExistingData && currentScrapedData) {
            targetMarketplace = currentScrapedData.metadata?.marketplace || '';
        }

        const currentProductsMap = new Map<string, any>((currentScrapedData?.products || []).map((p: any) => [p.asin, p]));
        const finalProducts = mergeProducts(productPool, targetMarketplace, currentProductsMap);

        const scrapedData: ScrapedData = {
            metadata: {
                marketplace: targetMarketplace,
                scrape_timestamp: new Date().toISOString(),
                total_asins: finalProducts.length,
                last_action: "multi_site_import_merge",
                domain: (LANGUAGE_HEADERS as any)[targetMarketplace]?.domain || "unknown",
                language: (LANGUAGE_HEADERS as any)[targetMarketplace]?.name || "unknown"
            },
            products: finalProducts
        };

        HistoryService.save(scrapedData);

        // 触发事件通知其他模块更新
        eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, scrapedData);
        eventBus.emit(APP_EVENTS.DATA_UPDATED);
        window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));

        showToast(`✅ 成功导入并合并 ${finalProducts.length} 个ASIN (基准站点: ${targetMarketplace})`, "success");
        
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
        
        showToast(userMessage, "error");
        
        return { success: false, error: errorMessage };
    }
}
