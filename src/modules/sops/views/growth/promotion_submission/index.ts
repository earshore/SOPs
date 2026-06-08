/**
 * 促销活动提报 SOP - 欧洲站
 * Promotion Submission SOP - EU Sites
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';

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

class PromotionSubmissionModule extends BaseModule {
    private removeCalculatorListeners: (() => void) | null = null;

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

        // Initialize calculator after DOM is ready
        setTimeout(() => {
            this.calculateProfit();
        }, 100);

        console.log('✅ 促销活动提报 SOP 模块已挂载');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        this.removeCalculatorListeners?.();
        console.log('❌ 促销活动提报 SOP 模块已卸载');
    }
}

// 导出模块实例
const promotionSubmissionModule = new PromotionSubmissionModule('promotion_submission');

export const mount = (container: HTMLElement) => promotionSubmissionModule.mount(container);
export const unmount = () => promotionSubmissionModule.unmount();
