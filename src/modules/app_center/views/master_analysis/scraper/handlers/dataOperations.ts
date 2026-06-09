/**
 * 数据操作处理器 - 删除产品/评论
 */

import type { ScrapedData, DeleteResult, ConfirmModalCallback } from '../types';
import { HistoryService } from '../../services/historyService';
import { StorageService } from '../../../../../../services/storageService';
import { showToast } from '../../../../../../common/ui';
import eventBus from '../../../../../../common/EventBus';
import { APP_EVENTS } from '../../../../../../common/constants/eventConstants';
import { SafeRenderer } from '../../../../../../common/infrastructure/SafeRenderer';
import { ValidationError, BusinessError, SystemError } from '@common/errors/AppError';

type DeleteAction = 'deleteProduct' | 'deleteReview';

interface DeleteContext {
    action: DeleteAction;
    asin: string;
    index?: number;
}

function cloneScrapedData(scrapedData: ScrapedData | null): ScrapedData | null {
    return scrapedData ? JSON.parse(JSON.stringify(scrapedData)) as ScrapedData : null;
}

function createDeleteContext(context: DeleteContext): Record<string, unknown> {
    const { action, asin, index } = context;
    if (index === undefined) {
        return { module: 'ScraperDataOperations', action, asin };
    }

    return { module: 'ScraperDataOperations', action, asin, index };
}

function validateAsin(asin: string, action: DeleteAction, module = 'ScraperDataOperations'): void {
    if (!asin || typeof asin !== 'string') {
        throw new ValidationError(
            '无效的ASIN参数',
            'SCRAPER_DEL_001',
            'asin',
            asin,
            { module, action }
        );
    }
}

function validateReviewIndex(index: number, asin: string): void {
    if (typeof index !== 'number' || index < 0) {
        throw new ValidationError(
            '无效的评论索引',
            'SCRAPER_DEL_002',
            'index',
            index,
            { module: 'ScraperDataOperations', action: 'deleteReview', asin }
        );
    }
}

function isProductWithAsin(product: unknown, asin: string): boolean {
    return !!product
        && typeof product === 'object'
        && 'asin' in product
        && (product as { asin: string }).asin === asin;
}

function requireScrapedData(scrapedData: ScrapedData | null, context: DeleteContext): ScrapedData {
    if (!scrapedData) {
        throw new SystemError(
            '数据状态异常：scrapedData为空',
            'SCRAPER_DEL_005',
            createDeleteContext(context)
        );
    }

    if (!scrapedData.products || !Array.isArray(scrapedData.products)) {
        throw new SystemError(
            '数据状态异常：products不是有效数组',
            'SCRAPER_DEL_006',
            createDeleteContext(context)
        );
    }

    return scrapedData;
}

function requireProduct(scrapedData: ScrapedData, context: DeleteContext): ScrapedData['products'][number] {
    const product = scrapedData.products.find((item) => isProductWithAsin(item, context.asin));
    if (!product) {
        throw new BusinessError(
            `产品不存在：${context.asin}`,
            'SCRAPER_DEL_009',
            createDeleteContext(context)
        );
    }

    return product;
}

function removeProduct(scrapedData: ScrapedData, asin: string): void {
    const beforeCount = scrapedData.products.length;
    scrapedData.products = scrapedData.products.filter((product) => !isProductWithAsin(product, asin));
    const afterCount = scrapedData.products.length;

    if (beforeCount === afterCount) {
        throw new SystemError(
            `删除失败：产品数量未变化`,
            'SCRAPER_DEL_011',
            { module: 'ScraperDataOperations', action: 'deleteProduct', asin, beforeCount, afterCount }
        );
    }

    if (scrapedData.metadata) {
        scrapedData.metadata.total_asins = afterCount;
    }
}

function requireReviewList(
    product: ScrapedData['products'][number],
    context: DeleteContext
): ScrapedData['products'][number]['customer_reviews'] {
    if (!product.customer_reviews || !Array.isArray(product.customer_reviews)) {
        throw new SystemError(
            '产品的评论数据无效',
            'SCRAPER_DEL_007',
            createDeleteContext(context)
        );
    }

    return product.customer_reviews;
}

function validateReviewRange(
    reviews: ScrapedData['products'][number]['customer_reviews'],
    context: DeleteContext
): void {
    if (context.index !== undefined && context.index >= reviews.length) {
        throw new ValidationError(
            `评论索引超出范围：${context.index} >= ${reviews.length}`,
            'SCRAPER_DEL_003',
            'index',
            context.index,
            { module: 'ScraperDataOperations', action: 'deleteReview', asin: context.asin, maxIndex: reviews.length - 1 }
        );
    }
}

function removeReview(
    reviews: ScrapedData['products'][number]['customer_reviews'],
    context: DeleteContext
): void {
    const beforeCount = reviews.length;
    reviews.splice(context.index as number, 1);
    const afterCount = reviews.length;

    if (beforeCount === afterCount) {
        throw new SystemError(
            '删除失败：评论数量未变化',
            'SCRAPER_DEL_012',
            { ...createDeleteContext(context), beforeCount, afterCount }
        );
    }
}

async function saveDeletion(scrapedData: ScrapedData, context: DeleteContext): Promise<void> {
    try {
        await HistoryService.saveAsync(scrapedData);
    } catch (saveError) {
        console.error('[Scraper] 保存历史记录失败:', saveError);
        throw new SystemError(
            '保存历史记录失败',
            'SCRAPER_DEL_013',
            createDeleteContext(context),
            saveError instanceof Error ? saveError : undefined
        );
    }
}

function emitDeletionEvents(): void {
    try {
        eventBus.emit(APP_EVENTS.DATA_UPDATED);
        eventBus.emit(APP_EVENTS.HISTORY_UPDATED);
    } catch (eventError) {
        console.error('[Scraper] 触发事件失败:', eventError);
    }
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function handleDeleteFailure(
    operation: string,
    error: unknown,
    originalData: ScrapedData | null,
    details: Record<string, unknown>
): DeleteResult {
    const errorMessage = getErrorMessage(error);
    console.error(`[Scraper] ${operation}失败:`, {
        error,
        errorMessage,
        ...details,
        hasOriginalData: !!originalData
    });

    showToast(`删除操作失败: ${errorMessage}`, { type: 'error' });

    if (originalData) {
        console.warn('[Scraper] 正在回滚数据...');
        return { success: false, data: originalData, error: errorMessage };
    }

    return { success: false, error: errorMessage };
}

async function confirmProductDeletion(asin: string, confirmModal: ConfirmModalCallback): Promise<boolean> {
    return confirmModal(
        `删除产品`,
        `确定删除 ASIN: <span class="font-bold text-red-600 bg-red-50 px-1 rounded">${asin}</span> 及其所有数据吗？<br/><span class="text-xs text-red-400 mt-1 block">此操作无法撤销</span>`,
        "ignore_del_prod_confirm"
    );
}

async function confirmReviewDeletion(confirmModal: ConfirmModalCallback): Promise<boolean> {
    return confirmModal(
        `删除评论`,
        `确定删除该评论吗？<br/><span class="text-xs text-slate-400 mt-1 block">此操作无法撤销</span>`,
        "ignore_del_review_confirm"
    );
}

/**
 * 删除产品
 */
export async function deleteProduct(
    asin: string,
    scrapedData: ScrapedData | null,
    confirmModal: ConfirmModalCallback
): Promise<DeleteResult> {
    // 保存原始数据用于回滚
    const originalData = cloneScrapedData(scrapedData);

    try {
        validateAsin(asin, 'deleteProduct', 'Scraper');

        const confirmed = await confirmProductDeletion(asin, confirmModal);
        if (!confirmed) {
            return { success: false };
        }

        const validData = requireScrapedData(scrapedData, { action: 'deleteProduct', asin });
        requireProduct(validData, { action: 'deleteProduct', asin });
        removeProduct(validData, asin);
        await saveDeletion(validData, { action: 'deleteProduct', asin });
        emitDeletionEvents();

        showToast(`ASIN ${asin} 已移除`, { type: 'info' });

        return { success: true, data: validData };

    } catch (error) {
        return handleDeleteFailure('删除产品', error, originalData, { asin });
    }
}

/**
 * 删除评论
 */
export async function deleteReview(
    asin: string,
    index: number,
    scrapedData: ScrapedData | null,
    confirmModal: ConfirmModalCallback
): Promise<DeleteResult> {
    // 保存原始数据用于回滚
    const originalData = cloneScrapedData(scrapedData);

    try {
        validateAsin(asin, 'deleteReview');
        validateReviewIndex(index, asin);

        const confirmed = await confirmReviewDeletion(confirmModal);
        if (!confirmed) {
            return { success: false };
        }

        const context = { action: 'deleteReview' as const, asin, index };
        const validData = requireScrapedData(scrapedData, context);
        const product = requireProduct(validData, context);
        const reviews = requireReviewList(product, context);
        validateReviewRange(reviews, context);
        removeReview(reviews, context);
        await saveDeletion(validData, context);
        emitDeletionEvents();

        showToast('评论已删除', { type: 'info' });

        return { success: true, data: validData };

    } catch (error) {
        return handleDeleteFailure('删除评论', error, originalData, { asin, index });
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

        const renderer = SafeRenderer.getInstance();
        renderer.renderTemplate(backdrop, modalContent);
        document.body.appendChild(backdrop);

        const btnConfirm = document.getElementById(`btn-confirm-${modalId}`) as HTMLButtonElement | null;
        const btnCancel = document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement | null;
        const dontAskCheckbox = document.getElementById(`dont-ask-again-${modalId}`) as HTMLInputElement | null;

        let resolved = false;

        const cleanup = () => {
            if (btnConfirm) btnConfirm.removeEventListener('click', handleConfirm);
            if (btnCancel) btnCancel.removeEventListener('click', handleCancel);
            backdrop.removeEventListener('click', handleBackdropClick);
            document.removeEventListener('keydown', handleEscape);

            try {
                if (backdrop && document.body.contains(backdrop)) {
                    document.body.removeChild(backdrop);
                }
            } catch (error) {
                console.error('[Scraper] 清理确认对话框失败:', error);
            }
        };

        const finish = (result: boolean) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(result);
        };

        const handleConfirm = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            if (resolved) return;

            // 保存"不再提示"选项
            if (dontAskCheckbox && dontAskCheckbox.checked) {
                StorageService.set(ignoreKey, true);
            }

            finish(true);
        };

        const handleCancel = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            finish(false);
        };

        const handleBackdropClick = (e: MouseEvent) => {
            if (e.target === backdrop) {
                finish(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                finish(false);
            }
        };

        if (!btnConfirm || !btnCancel) {
            console.error('[Scraper] 确认对话框渲染不完整，已自动关闭');
            finish(false);
            return;
        }

        btnConfirm.addEventListener('click', handleConfirm, { once: true });
        btnCancel.addEventListener('click', handleCancel, { once: true });
        backdrop.addEventListener('click', handleBackdropClick);
        document.addEventListener('keydown', handleEscape);
    });
}
