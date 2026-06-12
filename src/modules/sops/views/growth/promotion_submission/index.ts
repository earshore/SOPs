/**
 * 促销活动提报 SOP - 欧洲站
 * Promotion Submission SOP - EU Sites
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';

const REVIEW_OWNER_STORAGE_KEY = 'promotion_submission_owner_v1';
const DEFAULT_REVIEW_OWNER = '运营负责人';

interface PromotionInputs {
    originalPrice: number;
    cost: number;
    fbaFee: number;
    vatRate: number;
    hasCoupon: boolean;
    hasPrime: boolean;
    hasLD: boolean;
    hasBD: boolean;
    couponPercent: number;
    primePercent: number;
    ldPercent: number;
    bdPercent: number;
}

interface CalculationResult {
    salePrice: number;
    totalDiscountRate: number;
    promoFee: number;
    commission: number;
    vatAmount: number;
    profit: number;
    profitMargin: number;
}

function normalizeReviewOwner(owner: unknown): string {
    return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
    const input = document.getElementById('promotion-submission-owner') as HTMLInputElement | null;
    if (input) input.value = normalizeReviewOwner(StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER));
}

function readReviewOwner(): string {
    const input = document.getElementById('promotion-submission-owner') as HTMLInputElement | null;
    return normalizeReviewOwner(input?.value);
}

function saveReviewOwner(owner: string): void {
    StorageService.set(REVIEW_OWNER_STORAGE_KEY, normalizeReviewOwner(owner));
}

function fallbackCopyText(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        return document.execCommand('copy');
    } finally {
        textarea.remove();
    }
}

export function buildPromotionSubmissionTemplate(owner = DEFAULT_REVIEW_OWNER): string {
    const today = new Date().toISOString().split('T')[0];
    const reviewOwner = normalizeReviewOwner(owner);

    return [
        `# 促销提报/复盘归档 - ${today}`,
        '',
        '## 作业范围',
        `- 作业负责人：${reviewOwner}`,
        '- ASIN/SKU：',
        '- 店铺/站点：',
        '- 活动类型：Coupon / Prime Exclusive Discount / Lightning Deal / 7-Day Deal / 其他',
        '- 活动目标：冲排名 / 清库存 / 利润最大化 / 日常转化',
        '- 活动周期：',
        '',
        '## 提报前核算',
        '- 原售价：',
        '- 过去 30 天最低价：',
        '- 活动价/折扣：',
        '- 产品成本 + 头程：',
        '- FBA 配送费：',
        '- VAT 税率：',
        '- 活动费用或单次兑换费：',
        '- 折后单品利润和利润率：',
        '- 利润红线：通过 / 需主管确认 / 取消',
        '',
        '## 提报条件',
        '- Omnibus 价格合规：已确认 / 待确认',
        '- 库存和泛欧分布：充足 / 风险 / 不足',
        '- Buy Box 和前台折扣展示：已确认 / 待确认',
        '- Listing 评分、差评和本地化：已确认 / 待确认',
        '- 广告预算和活动承接：已确认 / 待确认',
        '',
        '## 决策结论',
        '- 结论：提报 / 调价后提报 / 暂缓 / 取消',
        '- 核心依据：',
        '- 主要风险：',
        '- 取消条件：',
        '',
        '## 执行动作（人工确认后执行）',
        '- 活动提报或取消：',
        '- 价格调整：',
        '- 广告预算或出价调整：',
        '- Coupon 接力或活动后承接：',
        '- 库存、补货或清仓联动：',
        '',
        '## 人工确认点',
        '- Omnibus 30 天最低价：已确认 / 待确认',
        '- 利润红线和亏损活动：已确认 / 待确认',
        '- 库存是否足够支撑活动：已复核 / 待复核',
        '- 广告预算上调或活动取消：已确认 / 待确认',
        '- 最终提报/取消动作：已确认 / 待确认',
        `- 最终确认人：${reviewOwner}`,
        '',
        '## 复盘记录',
        '- 实际销量、销售额和净利润：',
        '- TACOS/ACOS 变化：',
        '- 核心词排名变化：',
        '- 库存消耗和断货风险：',
        '- 下次活动建议：',
        '- 已沉淀经验：',
        '',
        '> 促销提报、价格调整、广告预算上调和活动取消都会直接影响利润与排名，必须人工确认后执行。',
    ].join('\n');
}

async function copyPromotionSubmissionTemplate(): Promise<void> {
    const owner = readReviewOwner();
    saveReviewOwner(owner);
    const reviewTemplate = buildPromotionSubmissionTemplate(owner);

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(reviewTemplate);
        } else if (!fallbackCopyText(reviewTemplate)) {
            throw new Error('clipboard unavailable');
        }

        alert('已复制促销提报/复盘模板，可粘贴到周报或归档文档。');
    } catch {
        alert('复制失败，请手动复制促销提报模板或稍后重试。');
    }
}

declare global {
    interface Window {
        sops_copyPromotionSubmissionTemplate?: () => Promise<void>;
    }
}

class PromotionSubmissionModule extends BaseModule {
    private removeCalculatorListeners: (() => void) | null = null;
    private registeredActions: string[] = [];

    /**
     * 计算利润
     */
    private calculateProfit(): void {
        const inputs = this.getInputs();
        const result = this.performCalculation(inputs);
        this.updateUI(inputs, result);
    }

    /**
     * 获取输入值
     */
    private getInputs(): PromotionInputs {
        const getNumberValue = (id: string, defaultValue: number = 0): number => {
            const element = document.getElementById(id) as HTMLInputElement | null;
            return parseFloat(element?.value || '') || defaultValue;
        };

        const getCheckboxValue = (id: string): boolean => {
            const element = document.getElementById(id) as HTMLInputElement | null;
            return element?.checked || false;
        };

        return {
            originalPrice: getNumberValue('calc-original-price'),
            cost: getNumberValue('calc-cost'),
            fbaFee: getNumberValue('calc-fba-fee'),
            vatRate: getNumberValue('calc-vat-rate') / 100 || 0.19,
            hasCoupon: getCheckboxValue('promo-coupon'),
            hasPrime: getCheckboxValue('promo-prime'),
            hasLD: getCheckboxValue('promo-ld'),
            hasBD: getCheckboxValue('promo-bd'),
            couponPercent: getNumberValue('coupon-percent') / 100,
            primePercent: getNumberValue('prime-percent') / 100,
            ldPercent: getNumberValue('ld-percent') / 100,
            bdPercent: getNumberValue('bd-percent') / 100,
        };
    }

    /**
     * 执行计算
     */
    private performCalculation(inputs: PromotionInputs): CalculationResult {
        let salePrice = inputs.originalPrice;
        let totalDiscountRate = 0;
        let promoFee = 0;

        // LD and BD are exclusive (can't stack with each other)
        if (inputs.hasLD) {
            salePrice = salePrice * (1 - inputs.ldPercent);
            totalDiscountRate = inputs.ldPercent;
            promoFee += 100; // Average LD fee
        } else if (inputs.hasBD) {
            salePrice = salePrice * (1 - inputs.bdPercent);
            totalDiscountRate = inputs.bdPercent;
            promoFee += 200; // Average BD fee
        }

        // Prime Exclusive (can stack with Coupon but not with LD/BD)
        if (inputs.hasPrime && !inputs.hasLD && !inputs.hasBD) {
            salePrice = salePrice * (1 - inputs.primePercent);
            totalDiscountRate = 1 - (1 - totalDiscountRate) * (1 - inputs.primePercent);
        }

        // Coupon can stack with everything
        if (inputs.hasCoupon) {
            salePrice = salePrice * (1 - inputs.couponPercent);
            totalDiscountRate = 1 - (1 - totalDiscountRate) * (1 - inputs.couponPercent);
            promoFee += 0.50; // Per redemption
        }

        // Calculate costs
        const commission = salePrice * 0.15; // 15% referral fee
        const vatAmount = salePrice * inputs.vatRate / (1 + inputs.vatRate); // VAT from gross price

        // Calculate profit - amortize deal fee over estimated 50 sales
        const amortizedPromoFee = promoFee > 1 ? promoFee / 50 : promoFee;
        const profit = salePrice - commission - inputs.fbaFee - vatAmount - inputs.cost - amortizedPromoFee;
        const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

        return {
            salePrice,
            totalDiscountRate,
            promoFee: amortizedPromoFee,
            commission,
            vatAmount,
            profit,
            profitMargin,
        };
    }

    /**
     * 更新UI显示
     */
    private updateUI(inputs: PromotionInputs, result: CalculationResult): void {
        const setElementText = (id: string, text: string): void => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setElementText('result-original', '€' + inputs.originalPrice.toFixed(2));
        setElementText('result-discount', '-' + (result.totalDiscountRate * 100).toFixed(1) + '%');
        setElementText('result-sale-price', '€' + result.salePrice.toFixed(2));
        setElementText('result-commission', '-€' + result.commission.toFixed(2));
        setElementText('result-fba', '-€' + inputs.fbaFee.toFixed(2));
        setElementText('result-vat', '-€' + result.vatAmount.toFixed(2));
        setElementText('result-cost', '-€' + inputs.cost.toFixed(2));
        
        const promoFeeText = result.promoFee > 0 
            ? '-€' + result.promoFee.toFixed(2) + (result.promoFee > 1 ? '/单' : '') 
            : '€0.00';
        setElementText('result-promo-fee', promoFeeText);
        
        setElementText('result-profit', '€' + result.profit.toFixed(2));
        setElementText('result-margin', '利润率: ' + result.profitMargin.toFixed(1) + '%');

        // Show warning if loss
        this.updateProfitDisplay(result.profit);
    }

    /**
     * 更新利润显示样式
     */
    private updateProfitDisplay(profit: number): void {
        const profitBox = document.getElementById('result-profit-box');
        const warningBox = document.getElementById('result-warning');
        const profitEl = document.getElementById('result-profit');

        if (profitBox && warningBox && profitEl) {
            if (profit < 0) {
                profitBox.className = 'p-4 bg-red-100 rounded-lg border-2 border-red-300 text-center';
                profitEl.className = 'text-2xl font-bold text-red-700';
                warningBox.classList.remove('hidden');
            } else {
                profitBox.className = 'p-4 bg-emerald-100 rounded-lg border-2 border-emerald-300 text-center';
                profitEl.className = 'text-2xl font-bold text-emerald-700';
                warningBox.classList.add('hidden');
            }
        }
    }

    private bindCalculatorEvents(container: HTMLElement): void {
        this.removeCalculatorListeners?.();

        const calculatorInputIds = new Set([
            'calc-original-price',
            'calc-cost',
            'calc-fba-fee',
            'calc-vat-rate',
            'promo-coupon',
            'coupon-percent',
            'promo-prime',
            'prime-percent',
            'promo-ld',
            'ld-percent',
            'promo-bd',
            'bd-percent',
        ]);

        const handleCalculatorChange = (event: Event): void => {
            const target = event.target as HTMLElement | null;
            if (target?.id && calculatorInputIds.has(target.id)) {
                this.calculateProfit();
            }
        };

        container.addEventListener('input', handleCalculatorChange);
        container.addEventListener('change', handleCalculatorChange);
        this.removeCalculatorListeners = () => {
            container.removeEventListener('input', handleCalculatorChange);
            container.removeEventListener('change', handleCalculatorChange);
            this.removeCalculatorListeners = null;
        };
    }

    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/sops/views/growth/promotion_submission/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        setSafeHtml(container, html);
        container.classList.add('fade-in');
        this.bindCalculatorEvents(container);
        restoreReviewOwner();

        // Initialize calculator after DOM is ready
        setTimeout(() => {
            this.calculateProfit();
        }, 100);

        this.registeredActions = registerActionsWithLegacy({
            sops_copyPromotionSubmissionTemplate: copyPromotionSubmissionTemplate as (...args: unknown[]) => void,
        });
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        this.removeCalculatorListeners?.();
        if (this.registeredActions.length > 0) {
            unregisterActions(this.registeredActions);
            this.registeredActions = [];
        }
    }
}

// 导出模块实例
const promotionSubmissionModule = new PromotionSubmissionModule('promotion_submission');

export const mount = (container: HTMLElement) => promotionSubmissionModule.mount(container);
export const unmount = () => promotionSubmissionModule.unmount();
