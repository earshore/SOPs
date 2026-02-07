/**
 * 亚马逊新品生命周期跟踪 SOP - NPI Tracker
 * Amazon New Product Introduction Tracker (EU Focus)
 * 🎯 Phase 4: 迁移 window 全局函数到 ActionRegistry
 */

import { registerActionsWithLegacy } from "../../../../../common/utils/actionRegistry.js";

// Sample data for demonstration - EU All Sites
const SAMPLE_DATA = [
    {
        stage: 'new-test',
        arrival_date: '2024-01-15',
        product_attr: '明星产品',
        sku: 'DE-WIDGET-001',
        cn_name: '多功能收纳盒',
        store: '1组-Altear',
        asin: 'B0CXXXXXXX1',
        fnsku: 'X001234567',
        site: 'DE',
        qty_shipped: 500,
        inventory_days: 45,
        is_pan_eu: true,
        check_content: true,
        check_sensitive: true,
        check_creative: false,
        check_ebc: true,
        delivery_fee: 4.5,
        market_avg_price: 19.99,
        sessions: 1250,
        ctr_7d: 0.68,
        cvr_7d: 12.5,
        acoas: 35,
        organic_ratio: 45,
        vine_status: '15/30',
        ads_strategy: 'mixed',
        decision: 'keep',
        next_step: ['加VINE (0评论)'],
        break_even: 12.0
    },
    {
        stage: 'growth',
        arrival_date: '2024-01-08',
        product_attr: '潜力款',
        sku: 'FR-GADGET-002',
        cn_name: '便携充电器',
        store: '1组-Altear',
        asin: 'B0CXXXXXXX2',
        fnsku: 'X001234568',
        site: 'FR',
        qty_shipped: 300,
        inventory_days: 28,
        is_pan_eu: true,
        check_content: true,
        check_sensitive: true,
        check_creative: true,
        check_ebc: true,
        delivery_fee: 3.2,
        market_avg_price: 14.99,
        sessions: 890,
        ctr_7d: 0.45,
        cvr_7d: 8.2,
        acoas: 42,
        organic_ratio: 38,
        vine_status: '30/30',
        ads_strategy: 'manual',
        decision: 'keep',
        next_step: ['降价/Coupon (CVR低)'],
        break_even: 9.5
    },
    {
        stage: 'stable',
        arrival_date: '2023-10-01',
        product_attr: '稳定款',
        sku: 'UK-HOME-003',
        cn_name: '厨房收纳架',
        store: '1组-Altear',
        asin: 'B0CXXXXXXX3',
        fnsku: 'X001234570',
        site: 'UK',
        qty_shipped: 800,
        inventory_days: 35,
        is_pan_eu: false,
        check_content: true,
        check_sensitive: true,
        check_creative: true,
        check_ebc: true,
        delivery_fee: 5.2,
        market_avg_price: 24.99,
        sessions: 2100,
        ctr_7d: 0.85,
        cvr_7d: 15.2,
        acoas: 18,
        organic_ratio: 62,
        vine_status: '30/30',
        ads_strategy: 'manual',
        decision: 'keep',
        next_step: [],
        break_even: 14.0
    },
    {
        stage: 'clearance',
        arrival_date: '2023-11-20',
        product_attr: '清仓品',
        sku: 'IT-OLD-004',
        cn_name: '旧款手机壳',
        store: '1组-Altear',
        asin: 'B0CXXXXXXX4',
        fnsku: 'X001234569',
        site: 'IT',
        qty_shipped: 200,
        inventory_days: 95,
        is_pan_eu: true,
        check_content: true,
        check_sensitive: true,
        check_creative: true,
        check_ebc: false,
        delivery_fee: 2.8,
        market_avg_price: 9.99,
        sessions: 120,
        ctr_7d: 0.25,
        cvr_7d: 3.1,
        acoas: 85,
        organic_ratio: 15,
        vine_status: '30/30',
        ads_strategy: 'auto',
        decision: 'kill',
        next_step: ['清仓 (扶不起)'],
        break_even: 7.0
    },
    {
        stage: 'new-test',
        arrival_date: '2024-01-20',
        product_attr: '测款',
        sku: 'ES-NEW-005',
        cn_name: '户外背包',
        store: '10组-Aiacbof Sarl',
        asin: 'B0CXXXXXXX5',
        fnsku: 'X001234571',
        site: 'ES',
        qty_shipped: 200,
        inventory_days: 10,
        is_pan_eu: true,
        check_content: false,
        check_sensitive: true,
        check_creative: false,
        check_ebc: false,
        delivery_fee: 6.5,
        market_avg_price: 39.99,
        sessions: 450,
        ctr_7d: 0.52,
        cvr_7d: 5.8,
        acoas: 65,
        organic_ratio: 20,
        vine_status: '0/30',
        ads_strategy: 'auto',
        decision: 'keep',
        next_step: ['加VINE (0评论)'],
        break_even: 18.0
    }
];


// Stage configuration
const STAGE_CONFIG = {
    'new-test': { label: '新品-测款', color: 'bg-blue-100 text-blue-700' },
    'growth': { label: '成长期', color: 'bg-emerald-100 text-emerald-700' },
    'stable': { label: '稳定期', color: 'bg-purple-100 text-purple-700' },
    'clearance': { label: '清仓期', color: 'bg-red-100 text-red-700' }
};

// Next step options
const NEXT_STEP_OPTIONS = [
    '加VINE (0评论)',
    '降价/Coupon (CVR低)',
    '否词/关广告 (ACOS高)',
    '清仓 (扶不起)'
];

// Pricing calculation functions
const calcNewPrice = (marketAvg) => (marketAvg * 0.9).toFixed(2);
const calcClearancePrice = (deliveryFee) => (deliveryFee / 0.5).toFixed(2);
const calcMovingPrice = (deliveryFee) => ((deliveryFee / 0.5) + 1).toFixed(2);
const calcCurrentPrice = (deliveryFee) => ((deliveryFee / 0.5) + 2).toFixed(2);
const calcDeliveryPercent = (deliveryFee, currentPrice) => ((deliveryFee / currentPrice) * 100).toFixed(1);

// Check compliance score
const getComplianceStatus = (record) => {
    const checks = [record.check_content, record.check_sensitive, record.check_creative, record.check_ebc];
    const completed = checks.filter(Boolean).length;
    return { completed, total: 4, isComplete: completed === 4 };
};

// Current data state
let tableData = [...SAMPLE_DATA];

// Render the table
/* Site Configuration */
const SITE_FLAGS = {
    'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸', 'UK': '🇬🇧',
    'NL': '🇳🇱', 'SE': '🇸🇪', 'PL': '🇵🇱', 'BE': '🇧🇪',
    'US': '🇺🇸', 'JP': '🇯🇵'
};

const SITE_DOMAINS = {
    'DE': 'amazon.de', 'FR': 'amazon.fr', 'IT': 'amazon.it', 'ES': 'amazon.es', 'UK': 'amazon.co.uk',
    'NL': 'amazon.nl', 'SE': 'amazon.se', 'PL': 'amazon.pl', 'BE': 'amazon.com.be',
    'US': 'amazon.com', 'JP': 'amazon.co.jp'
};

function renderTable() {
    const tbody = document.getElementById('npi-table-body');
    if (!tbody) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    tbody.innerHTML = tableData.map((row, index) => {
        const stageConfig = STAGE_CONFIG[row.stage] || STAGE_CONFIG['new-test'];
        const clearancePrice = calcClearancePrice(row.delivery_fee);
        const movingPrice = calcMovingPrice(row.delivery_fee);
        const suggestedPrice = calcCurrentPrice(row.delivery_fee);
        const deliveryPercent = calcDeliveryPercent(row.delivery_fee, parseFloat(suggestedPrice));
        const compliance = getComplianceStatus(row);
        const isOverstock = row.inventory_days > 60;
        const isPriceBelowClearance = parseFloat(suggestedPrice) < parseFloat(clearancePrice);

        const domain = SITE_DOMAINS[row.site] || 'amazon.de';
        const flag = SITE_FLAGS[row.site] || row.site;

        return `
        <tr class="hover:bg-slate-50 border-b border-slate-100" data-index="${index}">
            <!-- 基础档案 (8列) -->
            <td class="px-3 py-3 sticky left-0 bg-white z-10 border-r">
                <span class="px-2 py-1 rounded text-xs font-medium ${stageConfig.color}">${stageConfig.label}</span>
            </td>
            <td class="px-3 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onclick="window.open('https://www.${domain}/dp/${row.asin}', '_blank')">
                ${row.sku}
            </td>
            <td class="px-3 py-3 text-sm">${row.cn_name}</td>
            <td class="px-3 py-3 text-sm">${row.store}</td>
            <td class="px-3 py-3 text-sm font-mono">
                <a href="https://www.${domain}/dp/${row.asin}" target="_blank" class="text-blue-600 hover:underline">${row.asin}</a>
            </td>
            <td class="px-3 py-3 text-sm text-center">
                <span class="inline-flex items-center gap-1" title="${row.site}">
                    ${flag}
                </span>
            </td>
            <td class="px-3 py-3 text-sm text-center">${row.qty_shipped}</td>
            <td class="px-3 py-3 text-sm text-center ${isOverstock ? 'text-red-600 font-bold' : ''}">${row.inventory_days}天</td>
            
            <!-- SOP合规 (6列: 泛欧 + 4项检查 + 状态) -->
            <td class="px-3 py-3 text-center border-l">
                <input type="checkbox" ${row.is_pan_eu ? 'checked' : ''} class="w-4 h-4 rounded" onchange="updateField(${index}, 'is_pan_eu', this.checked)">
            </td>
            <td class="px-3 py-3 text-center">
                <input type="checkbox" ${row.check_content ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600" onchange="updateField(${index}, 'check_content', this.checked)">
            </td>
            <td class="px-3 py-3 text-center">
                <input type="checkbox" ${row.check_sensitive ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600" onchange="updateField(${index}, 'check_sensitive', this.checked)">
            </td>
            <td class="px-3 py-3 text-center">
                <input type="checkbox" ${row.check_creative ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600" onchange="updateField(${index}, 'check_creative', this.checked)">
            </td>
            <td class="px-3 py-3 text-center">
                <input type="checkbox" ${row.check_ebc ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600" onchange="updateField(${index}, 'check_ebc', this.checked)">
            </td>
            <td class="px-3 py-3 text-center">
                ${compliance.isComplete
                ? '<span class="text-emerald-600"><i class="fas fa-check-circle"></i></span>'
                : `<span class="text-amber-500 text-xs">${compliance.completed}/${compliance.total}</span>`}
            </td>
            
            <!-- 财务模型 (6列) -->
            <td class="px-3 py-3 border-l">
                <input type="number" step="0.1" value="${row.delivery_fee}" 
                    class="w-16 px-2 py-1 border rounded text-sm text-center" 
                    onchange="updateDeliveryFee(${index}, this.value)">
            </td>
            <td class="px-3 py-3 text-center text-sm text-slate-500">${deliveryPercent}%</td>
            <td class="px-3 py-3 text-center text-red-600 font-bold">€${clearancePrice}</td>
            <td class="px-3 py-3 text-center text-amber-600 font-medium">€${movingPrice}</td>
            <td class="px-3 py-3 text-center ${isPriceBelowClearance ? 'text-red-600 font-bold bg-red-50' : 'text-emerald-600 font-bold'}">€${suggestedPrice}</td>
            <td class="px-3 py-3 text-center text-sm">€${row.break_even}</td>
            
            <!-- 流量转化 (5列) -->
            <td class="px-3 py-3 text-center border-l text-sm">${row.sessions.toLocaleString()}</td>
            <td class="px-3 py-3 text-center text-sm ${row.ctr_7d < 0.5 ? 'text-amber-600 bg-amber-50' : ''}">${row.ctr_7d}%</td>
            <td class="px-3 py-3 text-center text-sm">${row.cvr_7d}%</td>
            <td class="px-3 py-3 text-center text-sm ${row.acoas > 50 ? 'text-red-600' : ''}">${row.acoas}%</td>
            <td class="px-3 py-3 text-center text-sm">${row.organic_ratio}%</td>
            
            <!-- 决策 (4列: Vine进度 + 广告 + 保留 + Next Step) -->
            <td class="px-3 py-3 text-center text-sm border-l">${row.vine_status}</td>
            <td class="px-3 py-3">
                <select class="px-2 py-1 border rounded text-xs" onchange="updateField(${index}, 'ads_strategy', this.value)">
                    <option value="auto" ${row.ads_strategy === 'auto' ? 'selected' : ''}>自动</option>
                    <option value="manual" ${row.ads_strategy === 'manual' ? 'selected' : ''}>手动</option>
                    <option value="mixed" ${row.ads_strategy === 'mixed' ? 'selected' : ''}>混合</option>
                </select>
            </td>
            <td class="px-3 py-3 text-center">
                <button onclick="toggleDecision(${index})" class="px-2 py-1 rounded text-xs font-medium ${row.decision === 'keep' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
                    ${row.decision === 'keep' ? '保留' : '放弃'}
                </button>
            </td>
            <td class="px-3 py-3">
                <div class="flex flex-wrap gap-1">
                    ${row.next_step.map(step => `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">${step}</span>`).join('')}
                    <button onclick="openNextStepEditor(${index})" class="px-2 py-0.5 border border-dashed border-slate-300 rounded text-xs text-slate-400 hover:border-blue-400 hover:text-blue-500">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Update field
window.updateField = function (index, field, value) {
    tableData[index][field] = value;
    renderTable();
};

// Update delivery fee and recalculate prices
window.updateDeliveryFee = function (index, value) {
    tableData[index].delivery_fee = parseFloat(value) || 0;
    renderTable();
};

// Toggle decision
window.toggleDecision = function (index) {
    tableData[index].decision = tableData[index].decision === 'keep' ? 'kill' : 'keep';
    renderTable();
};

// Open Next Step Editor
window.openNextStepEditor = function (index) {
    const modal = document.getElementById('next-step-modal');
    const checkboxes = document.getElementById('next-step-checkboxes');
    modal.dataset.index = index;

    checkboxes.innerHTML = NEXT_STEP_OPTIONS.map(option => `
        <label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
            <input type="checkbox" value="${option}" ${tableData[index].next_step.includes(option) ? 'checked' : ''} class="w-4 h-4 rounded">
            <span class="text-sm">${option}</span>
        </label>
    `).join('');

    modal.classList.remove('hidden');
};

// Save Next Steps
window.saveNextSteps = function () {
    const modal = document.getElementById('next-step-modal');
    const index = parseInt(modal.dataset.index);
    const checkboxes = document.querySelectorAll('#next-step-checkboxes input:checked');

    tableData[index].next_step = Array.from(checkboxes).map(cb => cb.value);
    modal.classList.add('hidden');
    renderTable();
};

// Close modal
window.closeNextStepModal = function () {
    document.getElementById('next-step-modal').classList.add('hidden');
};

// Export to Excel with formulas
window.exportToExcel = function () {
    // Column mapping for Excel formulas (0-indexed becomes 1-indexed in Excel)
    // Row 1 is header, data starts at row 2
    const COL = {
        DELIVERY_FEE: 'O',  // Column O = 配送费
        CLEARANCE: 'Q',     // Column Q = 清仓红线
        MOVING: 'R',        // Column R = 动销价格
        SUGGESTED: 'S'      // Column S = 建议售价
    };

    const exportData = tableData.map((row, idx) => {
        const excelRow = idx + 2; // Excel row number (1-indexed, row 1 is header)

        return {
            '阶段': STAGE_CONFIG[row.stage]?.label || row.stage,
            'SKU': row.sku,
            '中文名': row.cn_name,
            '店铺': row.store,
            'ASIN': row.asin,
            '站点': row.site,
            '发货数量': row.qty_shipped,
            '库存周转天数': row.inventory_days,
            '是否泛欧': row.is_pan_eu ? '是' : '否',
            '五点Rufus+标题': row.check_content ? '✓' : '',
            '敏感词规避': row.check_sensitive ? '✓' : '',
            '图片+QA': row.check_creative ? '✓' : '',
            'A+页面': row.check_ebc ? '✓' : '',
            'SOP合规状态': getComplianceStatus(row).isComplete ? '完成' : `${getComplianceStatus(row).completed}/4`,
            'DE配送费(€)': row.delivery_fee,
            '配送占比(%)': `=${COL.DELIVERY_FEE}${excelRow}/${COL.SUGGESTED}${excelRow}*100`,
            '清仓红线(€)': `=${COL.DELIVERY_FEE}${excelRow}/0.5`,
            '动销价格(€)': `=${COL.DELIVERY_FEE}${excelRow}/0.5+1`,
            '建议售价(€)': `=${COL.DELIVERY_FEE}${excelRow}/0.5+2`,
            '盈亏平衡点(€)': row.break_even,
            '流量': row.sessions,
            '7天CTR(%)': row.ctr_7d,
            '7天CVR(%)': row.cvr_7d,
            'ACOAS(%)': row.acoas,
            '自然单占比(%)': row.organic_ratio,
            'Vine进度': row.vine_status,
            '广告策略': row.ads_strategy === 'auto' ? '自动' : row.ads_strategy === 'manual' ? '手动' : '混合',
            '是否保留': row.decision === 'keep' ? '保留' : '放弃',
            'Next Step': row.next_step.join('; ')
        };
    });

    // Convert to CSV
    const headers = Object.keys(exportData[0]);
    const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => {
            const val = row[h];
            // Escape commas and quotes in values
            if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('='))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `NPI_Tracker_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    // Show notification
    alert('导出成功！Excel文件包含计算公式，打开后公式会自动计算。\n\n提示：清仓红线/动销价格/建议售价列包含Excel公式，修改配送费后会自动更新。');
};

// Filter by store
window.filterByStore = function (store) {
    if (store === 'all') {
        tableData = [...SAMPLE_DATA];
    } else {
        tableData = SAMPLE_DATA.filter(row => row.store === store);
    }
    renderTable();
};

// Filter by stage
window.filterByStage = function (stage) {
    if (stage === 'all') {
        tableData = [...SAMPLE_DATA];
    } else {
        tableData = SAMPLE_DATA.filter(row => row.stage === stage);
    }
    renderTable();
};

import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// Module mount function
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/growth/npi_tracker/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');

    // Initialize table after DOM is ready
    setTimeout(() => {
        renderTable();
    }, 100);

    console.log("✅ 新品生命周期跟踪 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 新品生命周期跟踪 SOP 模块已卸载");
}

// ================================================================
// 🎯 Phase 4: 集中注册所有动作到 ActionRegistry
// ================================================================

const npiTrackerActions = {
    updateField: window.updateField,
    updateDeliveryFee: window.updateDeliveryFee,
    toggleDecision: window.toggleDecision,
    openNextStepEditor: window.openNextStepEditor,
    saveNextSteps: window.saveNextSteps,
    closeNextStepModal: window.closeNextStepModal,
    exportToExcel: window.exportToExcel,
    filterByStore: window.filterByStore,
    filterByStage: window.filterByStage,
};

registerActionsWithLegacy(npiTrackerActions);

console.log("✅ [npi_tracker] 已注册 " + Object.keys(npiTrackerActions).length + " 个动作到 ActionRegistry");
