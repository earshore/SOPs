/**
 * 数据预览组件
 */

import type { ScrapedData, DataTab } from '../types';
import { renderProductCard, syntaxHighlight } from '../utils/renderers';
import { showToast } from '../../../../../../common/ui';

export interface DataPreviewState {
    expandedAsin: string | null;
    currentDataTab: DataTab;
    currentPage: number;
    itemsPerPage: number;
}

/**
 * 数据预览组件类
 */
export class DataPreview {
    private state: DataPreviewState;
    private scrapedData: ScrapedData | null;
    private _cardClickHandler: ((e: Event) => void) | null = null;

    constructor(initialState: DataPreviewState, scrapedData: ScrapedData | null) {
        this.state = initialState;
        this.scrapedData = scrapedData;
    }

    // ========== 计算属性 ==========

    get totalProducts(): number {
        return this.scrapedData?.products?.length || 0;
    }

    get totalPages(): number {
        return Math.ceil(this.totalProducts / this.state.itemsPerPage);
    }

    get paginatedProducts(): any[] {
        if (!this.scrapedData?.products) return [];
        const start = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const end = start + this.state.itemsPerPage;
        return this.scrapedData.products.slice(start, end);
    }

    get shouldUsePagination(): boolean {
        return this.totalProducts > this.state.itemsPerPage;
    }

    // ========== 性能优化 ==========

    /**
     * 检查并警告大数据集
     */
    checkLargeDataset(): void {
        const productCount = this.totalProducts;

        if (productCount > 100) {
            console.warn(`[Scraper] ⚠️ 检测到大数据集: ${productCount} 个产品`);
            showToast(`⚠️ 数据集较大 (${productCount} 个产品)，已启用分页显示以优化性能`, "info");
        }

        if (productCount > 500) {
            console.warn(`[Scraper] ⚠️ 数据集非常大: ${productCount} 个产品，建议清理历史记录`);
            showToast(`⚠️ 数据集非常大 (${productCount} 个产品)，建议定期清理历史记录以释放内存`, "warning");
        }
    }

    /**
     * 设置事件委托（性能优化）
     */
    setupEventDelegation(onToggle: (asin: string) => void): void {
        const cardsContainer = document.getElementById('data-cards');
        if (!cardsContainer) return;

        // 移除旧的监听器（如果存在）
        if (this._cardClickHandler) {
            cardsContainer.removeEventListener('click', this._cardClickHandler);
        }

        // 创建新的事件处理器
        this._cardClickHandler = (e: Event) => {
            const target = e.target as HTMLElement;

            // 查找最近的卡片元素
            const card = target.closest('.asin-card');
            if (card && card.id && card.id.startsWith('card-')) {
                const asin = card.id.replace('card-', '');

                // 检查是否点击了删除按钮
                const deleteBtn = target.closest('button[title*="删除"]');
                if (deleteBtn) {
                    e.stopPropagation();
                    return; // 删除按钮由 Alpine 的 @click 处理
                }

                // 展开/收起卡片
                onToggle(asin);
            }
        };

        // 添加事件监听器
        cardsContainer.addEventListener('click', this._cardClickHandler);

        console.log('[Scraper] ✅ 事件委托已设置');
    }

    /**
     * 清理旧的DOM元素（性能优化）
     */
    cleanupOldDOMElements(container: HTMLElement): void {
        if (!container) return;

        // 移除所有子元素的事件监听器（如果有的话）
        const oldCards = container.querySelectorAll('.asin-card');
        oldCards.forEach(card => {
            // 移除所有按钮的事件监听器
            const buttons = card.querySelectorAll('button');
            buttons.forEach(btn => {
                const clone = btn.cloneNode(true);
                btn.parentNode?.replaceChild(clone, btn);
            });
        });

        // 清空容器内容
        container.innerHTML = '';
    }

    /**
     * 清理事件监听器
     */
    cleanup(): void {
        const cardsContainer = document.getElementById('data-cards');
        if (cardsContainer && this._cardClickHandler) {
            cardsContainer.removeEventListener('click', this._cardClickHandler);
            this._cardClickHandler = null;
            console.log('[Scraper] ✅ 事件委托已清理');
        }
    }

    // ========== 渲染方法 ==========

    /**
     * 渲染数据预览面板
     */
    renderDataPanel(
        _onToggle: (asin: string) => void,
        _onDelete: (asin: string) => void,
        _onDeleteReview: (asin: string, index: number) => void
    ): void {
        if (!this.scrapedData) return;

        const noDataMsg = document.getElementById("no-data-msg");
        const cardsWrapper = document.getElementById("data-cards-wrapper");
        const cardsEl = document.getElementById("data-cards");

        // 如果 DOM 元素还不存在,延迟渲染
        if (!cardsEl || !cardsWrapper) {
            console.warn('[Scraper] DOM 元素尚未就绪,延迟渲染');
            return;
        }

        if (!this.scrapedData.products || this.scrapedData.products.length === 0) {
            if (noDataMsg) noDataMsg.classList.remove("hidden");
            if (cardsWrapper) cardsWrapper.classList.add("hidden");
            return;
        }

        if (noDataMsg) noDataMsg.classList.add("hidden");
        if (cardsWrapper) cardsWrapper.classList.remove("hidden");

        // 使用分页数据而不是全部数据
        const productsToRender = this.shouldUsePagination ? this.paginatedProducts : this.scrapedData.products;

        console.log(`[Scraper] 渲染 ${productsToRender.length}/${this.totalProducts} 个产品 (页码: ${this.state.currentPage}/${this.totalPages})`);

        // 清理旧的DOM元素，释放内存
        this.cleanupOldDOMElements(cardsEl);

        const globalSiteCode = this.scrapedData.metadata?.marketplace || '';

        // 渲染产品卡片
        cardsEl.innerHTML = productsToRender.map((rawProduct: any) => {
            const isExpanded = this.state.expandedAsin === rawProduct.asin;
            return renderProductCard(
                rawProduct,
                isExpanded,
                globalSiteCode,
                `toggleCardExpand('${rawProduct.asin}')`,
                `deleteProduct('${rawProduct.asin}')`,
                `deleteReview('${rawProduct.asin}', INDEX)`
            );
        }).join("");

        // 渲染JSON视图
        const jsonDisplay = document.getElementById("json-display");
        if (jsonDisplay) {
            jsonDisplay.innerHTML = syntaxHighlight(JSON.stringify(this.scrapedData, null, 2));
        }
    }

    // ========== 分页控制 ==========

    /**
     * 跳转到指定页码
     */
    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.state.currentPage = page;

        // 滚动到顶部
        const cardsEl = document.getElementById("data-cards");
        if (cardsEl) {
            cardsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * 上一页
     */
    previousPage(): void {
        if (this.state.currentPage > 1) {
            this.goToPage(this.state.currentPage - 1);
        }
    }

    /**
     * 下一页
     */
    nextPage(): void {
        if (this.state.currentPage < this.totalPages) {
            this.goToPage(this.state.currentPage + 1);
        }
    }

    // ========== 状态管理 ==========

    /**
     * 切换卡片展开状态
     */
    toggleCardExpand(asin: string): void {
        this.state.expandedAsin = this.state.expandedAsin === asin ? null : asin;
    }

    /**
     * 切换数据标签页
     */
    switchDataTab(tab: DataTab): void {
        this.state.currentDataTab = tab;
    }

    /**
     * 更新数据源
     */
    updateData(scrapedData: ScrapedData | null): void {
        this.scrapedData = scrapedData;
    }

    /**
     * 获取当前状态
     */
    getState(): DataPreviewState {
        return { ...this.state };
    }

    /**
     * 更新状态
     */
    updateState(newState: Partial<DataPreviewState>): void {
        this.state = { ...this.state, ...newState };
    }
}
