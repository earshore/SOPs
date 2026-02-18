/**
 * 数据操作处理器 - 删除产品/评论
 */

import type { ScrapedData } from '../types';
import { HistoryService } from '../../services/historyService';
import { StorageService } from '../../../../../../services/storageService';
import { showToast } from '../../../../../../common/ui';
import eventBus from '../../../../../../common/EventBus';
import { APP_EVENTS } from '../../../../../../common/constants/eventConstants';

/**
 * 删除产品
 */
export async function deleteProduct(
    asin: string,
    scrapedData: ScrapedData | null,
    confirmModal: (title: string, content: string, storageKey: string) => Promise<boolean>
): Promise<{ success: boolean; data?: ScrapedData; error?: string }> {
    // 保存原始数据用于回滚
    const originalData = scrapedData ? JSON.parse(JSON.stringify(scrapedData)) : null;
    
    try {
        // 验证ASIN参数
        if (!asin || typeof asin !== 'string') {
            throw new Error('无效的ASIN参数');
        }

        const confirmed = await confirmModal(
            `删除产品`,
            `确定删除 ASIN: <span class="font-bold text-red-600 bg-red-50 px-1 rounded">${asin}</span> 及其所有数据吗？<br/><span class="text-xs text-red-400 mt-1 block">此操作无法撤销</span>`,
            "ignore_del_prod_confirm"
        );

        if (!confirmed) {
            console.log('[Scraper] 用户取消删除产品操作');
            return { success: false };
        }

        // 验证数据状态
        if (!scrapedData) {
            throw new Error('数据状态异常：scrapedData为空');
        }

        if (!scrapedData.products || !Array.isArray(scrapedData.products)) {
            throw new Error('数据状态异常：products不是有效数组');
        }

        // 验证产品是否存在
        const productExists = scrapedData.products.some((p: any) => p.asin === asin);
        if (!productExists) {
            throw new Error(`产品不存在：${asin}`);
        }

        // 从数据集中移除产品
        const beforeCount = scrapedData.products.length;
        scrapedData.products = scrapedData.products.filter((p: any) => p.asin !== asin);
        const afterCount = scrapedData.products.length;

        // 验证删除是否成功
        if (beforeCount === afterCount) {
            throw new Error(`删除失败：产品数量未变化`);
        }

        // 更新元数据
        if (scrapedData.metadata) {
            scrapedData.metadata.total_asins = afterCount;
        }

        // 保存到历史记录
        try {
            HistoryService.save(scrapedData);
        } catch (saveError) {
            console.error('[Scraper] 保存历史记录失败:', saveError);
            throw new Error('保存历史记录失败');
        }

        // 触发事件通知其他模块
        try {
            eventBus.emit(APP_EVENTS.DATA_UPDATED);
            window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));
        } catch (eventError) {
            console.error('[Scraper] 触发事件失败:', eventError);
        }

        showToast(`ASIN ${asin} 已移除`, "info");
        console.log(`[Scraper] 成功删除产品: ${asin}`);

        return { success: true, data: scrapedData };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Scraper] 删除产品失败:', {
            error: error,
            errorMessage: errorMessage,
            asin: asin,
            hasOriginalData: !!originalData
        });
        
        showToast(`删除操作失败: ${errorMessage}`, 'error');
        
        // 回滚数据
        if (originalData) {
            console.warn('[Scraper] 正在回滚数据...');
            return { success: false, data: originalData, error: errorMessage };
        }
        
        return { success: false, error: errorMessage };
    }
}

/**
 * 删除评论
 */
export async function deleteReview(
    asin: string,
    index: number,
    scrapedData: ScrapedData | null,
    confirmModal: (title: string, content: string, storageKey: string) => Promise<boolean>
): Promise<{ success: boolean; data?: ScrapedData; error?: string }> {
    // 保存原始数据用于回滚
    const originalData = scrapedData ? JSON.parse(JSON.stringify(scrapedData)) : null;
    
    try {
        // 验证参数
        if (!asin || typeof asin !== 'string') {
            throw new Error('无效的ASIN参数');
        }
        
        if (typeof index !== 'number' || index < 0) {
            throw new Error('无效的评论索引');
        }

        const confirmed = await confirmModal(
            `删除评论`,
            `确定删除该评论吗？<br/><span class="text-xs text-slate-400 mt-1 block">此操作无法撤销</span>`,
            "ignore_del_review_confirm"
        );

        if (!confirmed) {
            console.log('[Scraper] 用户取消删除评论操作');
            return { success: false };
        }

        // 验证数据状态
        if (!scrapedData) {
            throw new Error('数据状态异常：scrapedData为空');
        }

        if (!scrapedData.products || !Array.isArray(scrapedData.products)) {
            throw new Error('数据状态异常：products不是有效数组');
        }

        // 找到产品
        const product = scrapedData.products.find((p: any) => p.asin === asin);
        if (!product) {
            throw new Error(`产品不存在：${asin}`);
        }

        // 验证评论数组
        if (!product.customer_reviews || !Array.isArray(product.customer_reviews)) {
            throw new Error('产品的评论数据无效');
        }

        // 验证索引范围
        if (index >= product.customer_reviews.length) {
            throw new Error(`评论索引超出范围：${index} >= ${product.customer_reviews.length}`);
        }

        // 删除评论
        const beforeCount = product.customer_reviews.length;
        product.customer_reviews.splice(index, 1);
        const afterCount = product.customer_reviews.length;

        // 验证删除是否成功
        if (beforeCount === afterCount) {
            throw new Error('删除失败：评论数量未变化');
        }

        // 保存到历史记录
        try {
            HistoryService.save(scrapedData);
        } catch (saveError) {
            console.error('[Scraper] 保存历史记录失败:', saveError);
            throw new Error('保存历史记录失败');
        }

        // 触发事件通知其他模块
        try {
            eventBus.emit(APP_EVENTS.DATA_UPDATED);
            window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));
        } catch (eventError) {
            console.error('[Scraper] 触发事件失败:', eventError);
        }

        showToast('评论已删除', 'info');
        console.log(`[Scraper] 成功删除评论: ASIN=${asin}, index=${index}`);

        return { success: true, data: scrapedData };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Scraper] 删除评论失败:', {
            error: error,
            errorMessage: errorMessage,
            asin: asin,
            index: index,
            hasOriginalData: !!originalData
        });
        
        showToast(`删除操作失败: ${errorMessage}`, 'error');
        
        // 回滚数据
        if (originalData) {
            console.warn('[Scraper] 正在回滚数据...');
            return { success: false, data: originalData, error: errorMessage };
        }
        
        return { success: false, error: errorMessage };
    }
}

/**
 * 显示确认对话框
 */
export function confirmWithModal(title: string, content: string, storageKey: string): Promise<boolean> {
    return new Promise((resolve) => {
        // 检查是否已经选择"不再提示"
        const ignoreKey = `modal_ignore_${storageKey}`;
        const ignored = StorageService.get(ignoreKey);
        if (ignored === true) {
            resolve(true);
            return;
        }

        const modalId = 'confirm-modal-' + Date.now();
        const backdrop = document.createElement('div');
        backdrop.id = modalId;
        backdrop.className = "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in";

        const modalContent = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                <div class="bg-gradient-to-r from-red-600 to-orange-600 p-5 text-white">
                    <h3 class="text-lg font-bold flex items-center gap-2">
                        <i class="fas fa-exclamation-triangle"></i> ${title}
                    </h3>
                </div>
                
                <div class="p-6">
                    <p class="text-slate-600 text-sm mb-4">${content}</p>
                    
                    <label class="flex items-center gap-2 text-xs text-slate-500 mb-4 cursor-pointer">
                        <input type="checkbox" id="dont-ask-again-${modalId}" class="rounded border-slate-300">
                        <span>不再提示</span>
                    </label>

                    <div class="flex justify-end gap-3">
                        <button id="btn-cancel-${modalId}" class="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm transition-colors">
                            取消
                        </button>
                        <button id="btn-confirm-${modalId}" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-md transition-transform transform active:scale-95">
                            确认删除
                        </button>
                    </div>
                </div>
            </div>
        `;

        backdrop.innerHTML = modalContent;
        document.body.appendChild(backdrop);

        const btnConfirm = document.getElementById(`btn-confirm-${modalId}`) as HTMLButtonElement;
        const btnCancel = document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement;
        const dontAskCheckbox = document.getElementById(`dont-ask-again-${modalId}`) as HTMLInputElement;

        let resolved = false;

        const cleanup = () => {
            if (btnConfirm) btnConfirm.removeEventListener('click', handleConfirm);
            if (btnCancel) btnCancel.removeEventListener('click', handleCancel);
            
            try {
                if (backdrop && document.body.contains(backdrop)) {
                    document.body.removeChild(backdrop);
                }
            } catch (error) {
                console.error('[Scraper] 清理确认对话框失败:', error);
            }
        };

        const handleConfirm = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (resolved) return;
            resolved = true;

            // 保存"不再提示"选项
            if (dontAskCheckbox && dontAskCheckbox.checked) {
                StorageService.set(ignoreKey, true);
            }
            
            cleanup();
            setTimeout(() => resolve(true), 0);
        };

        const handleCancel = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (resolved) return;
            resolved = true;
            
            cleanup();
            setTimeout(() => resolve(false), 0);
        };

        btnConfirm.addEventListener('click', handleConfirm, { once: true });
        btnCancel.addEventListener('click', handleCancel, { once: true });
    });
}
