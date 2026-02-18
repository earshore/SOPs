// 促销活动提报 SOP - 欧洲站
import { loadTemplate } from "../../../../../common/utils/viewLoader";
// Profit Calculator Logic

function calculateProfit() {
    // Get inputs
    const originalPrice = parseFloat(document.getElementById('calc-original-price')?.value) || 0;
    const cost = parseFloat(document.getElementById('calc-cost')?.value) || 0;
    const fbaFee = parseFloat(document.getElementById('calc-fba-fee')?.value) || 0;
    const vatRate = parseFloat(document.getElementById('calc-vat-rate')?.value) / 100 || 0.19;

    // Get promotion selections
    const hasCoupon = document.getElementById('promo-coupon')?.checked || false;
    const hasPrime = document.getElementById('promo-prime')?.checked || false;
    const hasLD = document.getElementById('promo-ld')?.checked || false;
    const hasBD = document.getElementById('promo-bd')?.checked || false;

    const couponPercent = parseFloat(document.getElementById('coupon-percent')?.value) / 100 || 0;
    const primePercent = parseFloat(document.getElementById('prime-percent')?.value) / 100 || 0;
    const ldPercent = parseFloat(document.getElementById('ld-percent')?.value) / 100 || 0;
    const bdPercent = parseFloat(document.getElementById('bd-percent')?.value) / 100 || 0;

    // Calculate stacked discount (EU rules: Deal first, then Coupon)
    let salePrice = originalPrice;
    let totalDiscountRate = 0;
    let promoFee = 0;

    // LD and BD are exclusive (can't stack with each other)
    if (hasLD) {
        salePrice = salePrice * (1 - ldPercent);
        totalDiscountRate = ldPercent;
        promoFee += 100; // Average LD fee
    } else if (hasBD) {
        salePrice = salePrice * (1 - bdPercent);
        totalDiscountRate = bdPercent;
        promoFee += 200; // Average BD fee
    }

    // Prime Exclusive (can stack with Coupon but not with LD/BD)
    if (hasPrime && !hasLD && !hasBD) {
        salePrice = salePrice * (1 - primePercent);
        totalDiscountRate = 1 - (1 - totalDiscountRate) * (1 - primePercent);
    }

    // Coupon can stack with everything
    if (hasCoupon) {
        salePrice = salePrice * (1 - couponPercent);
        totalDiscountRate = 1 - (1 - totalDiscountRate) * (1 - couponPercent);
        promoFee += 0.50; // Per redemption
    }

    // Calculate costs
    const commission = salePrice * 0.15; // 15% referral fee
    const vatAmount = salePrice * vatRate / (1 + vatRate); // VAT from gross price

    // Calculate profit - amortize deal fee over estimated 50 sales
    const amortizedPromoFee = promoFee > 1 ? promoFee / 50 : promoFee;
    const profit = salePrice - commission - fbaFee - vatAmount - cost - amortizedPromoFee;
    const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

    // Update UI
    const setElementText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setElementText('result-original', '€' + originalPrice.toFixed(2));
    setElementText('result-discount', '-' + (totalDiscountRate * 100).toFixed(1) + '%');
    setElementText('result-sale-price', '€' + salePrice.toFixed(2));
    setElementText('result-commission', '-€' + commission.toFixed(2));
    setElementText('result-fba', '-€' + fbaFee.toFixed(2));
    setElementText('result-vat', '-€' + vatAmount.toFixed(2));
    setElementText('result-cost', '-€' + cost.toFixed(2));
    setElementText('result-promo-fee', promoFee > 0 ? '-€' + amortizedPromoFee.toFixed(2) + (promoFee > 1 ? '/单' : '') : '€0.00');
    setElementText('result-profit', '€' + profit.toFixed(2));
    setElementText('result-margin', '利润率: ' + profitMargin.toFixed(1) + '%');

    // Show warning if loss
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

// Expose to global scope for inline event handlers
window.calculateProfit = calculateProfit;

export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/growth/promotion_submission/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');

    // Initialize calculator after DOM is ready
    setTimeout(() => {
        calculateProfit();
    }, 100);

    console.log("✅ 促销活动提报 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 促销活动提报 SOP 模块已卸载");
}
