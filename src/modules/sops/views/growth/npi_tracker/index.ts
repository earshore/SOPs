/**
 * 亚马逊新品生命周期跟踪 SOP - NPI Tracker
 * Amazon New Product Introduction Tracker (EU Focus)
 * Phase 4: 迁移 window 全局函数到 ActionRegistry
 * 🎯 P0优化: 使用统一类型定义
 * 优化: 示例数据已移至独立文件
 */

import BaseModule from '../../../../../common/BaseModule';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { registerActionsWithLegacy } from '../../../../../common/utils/actionRegistry';
import type {
  NPIProductRecord,
  StageConfig,
  StageConfigMap,
  SiteFlagsMap,
  SiteDomainsMap,
  ComplianceStatus
} from '@/types/modules-business';
import {
    MOCK_PRODUCTS,
    STAGE_CONFIG,
    SITE_FLAGS,
    SITE_DOMAINS,
} from './data/mockData';

// 示例数据
const SAMPLE_DATA = MOCK_PRODUCTS as NPIProductRecord[];

// 类型断言常量
const stageConfigMap = STAGE_CONFIG as StageConfigMap;
const siteFlagsMap = SITE_FLAGS as SiteFlagsMap;
const siteDomainsMap = SITE_DOMAINS as SiteDomainsMap;

// Next step options
const NEXT_STEP_OPTIONS: string[] = [
    '加VINE (0评论)',
    '降价/Coupon (CVR低)',
    '否词/关广告 (ACOS高)',
    '清仓 (扶不起)',
];

// Pricing calculation functions
const calcClearancePrice = (deliveryFee: number): string => (deliveryFee / 0.5).toFixed(2);
const calcMovingPrice = (deliveryFee: number): string => (deliveryFee / 0.5 + 1).toFixed(2);
const calcCurrentPrice = (deliveryFee: number): string => (deliveryFee / 0.5 + 2).toFixed(2);
const calcDeliveryPercent = (deliveryFee: number, currentPrice: number): string =>
    ((deliveryFee / currentPrice) * 100).toFixed(1);

// Check compliance score
const getComplianceStatus = (record: NPIProductRecord): ComplianceStatus => {
    const checks = [
        record.check_content,
        record.check_sensitive,
        record.check_creative,
        record.check_ebc,
    ];
    const completed = checks.filter(Boolean).length;
    return { completed, total: 4, isComplete: completed === 4 };
};

// Current data state
let tableData: NPIProductRecord[] = [...SAMPLE_DATA];

// Render the table
function renderTable(): void {
    const tbody = document.getElementById('npi-table-body');
    if (!tbody) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    tbody.innerHTML = tableData
        .map((row: NPIProductRecord, index) => {
            const stageConfig: StageConfig = stageConfigMap[row.stage] || stageConfigMap['new-test'];
            const clearancePrice = calcClearancePrice(row.delivery_fee);
            const movingPrice = calcMovingPrice(row.delivery_fee);
            const suggestedPrice = calcCurrentPrice(row.delivery_fee);
            const deliveryPercent = calcDeliveryPercent(row.delivery_fee, parseFloat(suggestedPrice));
            const compliance = getComplianceStatus(row);
            const isOverstock = row.inventory_days > 60;
            const isPriceBelowClearance = parseFloat(suggestedPrice) < parseFloat(clearancePrice);

            const domain = siteDomainsMap[row.site] || 'amazon.de';
            const flag = siteFlagsMap[row.site] || row.site;

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
                ${
                    compliance.isComplete
                        ? '<span class="text-emerald-600"><i class="fas fa-check-circle"></i></span>'
                        : `<span class="text-amber-500 text-xs">${compliance.completed}/${compliance.total}</span>`
                }
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
                    ${row.next_step.map((step: string) => `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">${step}</span>`).join('')}
                    <button onclick="openNextStepEditor(${index})" class="px-2 py-0.5 border border-dashed border-slate-300 rounded text-xs text-slate-400 hover:border-blue-400 hover:text-blue-500">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
        })
        .join('');
}

// Update field
function updateField(index: number, field: keyof NPIProductRecord, value: any): void {
    if (index >= 0 && index < tableData.length) {
        (tableData[index] as any)[field] = value;
        renderTable();
    }
}

// Update delivery fee and recalculate prices
function updateDeliveryFee(index: number, value: string): void {
    const row = tableData[index];
    if (row) {
        row.delivery_fee = parseFloat(value) || 0;
        renderTable();
    }
}

// Toggle decision
function toggleDecision(index: number): void {
    const row = tableData[index];
    if (row) {
        row.decision = row.decision === 'keep' ? 'kill' : 'keep';
        renderTable();
    }
}

// Open Next Step Editor
function openNextStepEditor(index: number): void {
    const modal = document.getElementById('next-step-modal') as HTMLElement & { dataset: { index: string } };
    const checkboxes = document.getElementById('next-step-checkboxes');
    const row = tableData[index];
    if (!modal || !checkboxes || !row) return;

    modal.dataset.index = index.toString();

    const currentSteps = row.next_step;
    checkboxes.innerHTML = NEXT_STEP_OPTIONS.map(
        (option) => `
        <label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
            <input type="checkbox" value="${option}" ${currentSteps.includes(option) ? 'checked' : ''} class="w-4 h-4 rounded">
            <span class="text-sm">${option}</span>
        </label>
    `
    ).join('');

    modal.classList.remove('hidden');
}

// Save Next Steps
function saveNextSteps(): void {
    const modal = document.getElementById('next-step-modal') as HTMLElement & { dataset: { index: string } };
    if (!modal) return;

    const index = parseInt(modal.dataset.index);
    const row = tableData[index];
    if (isNaN(index) || !row) return;

    const checkboxes = document.querySelectorAll('#next-step-checkboxes input:checked');

    row.next_step = Array.from(checkboxes).map((cb) => (cb as HTMLInputElement).value);
    modal.classList.add('hidden');
    renderTable();
}

// Close modal
function closeNextStepModal(): void {
    const modal = document.getElementById('next-step-modal');
    if (modal) modal.classList.add('hidden');
}


// Export to Excel with formulas
function exportToExcel(): void {
    // Column mapping for Excel formulas (0-indexed becomes 1-indexed in Excel)
    // Row 1 is header, data starts at row 2
    const COL = {
        DELIVERY_FEE: 'O', // Column O = 配送费
        CLEARANCE: 'Q', // Column Q = 清仓红线
        MOVING: 'R', // Column R = 动销价格
        SUGGESTED: 'S', // Column S = 建议售价
    };

    interface ExportRow {
        阶段: string;
        SKU: string;
        中文名: string;
        店铺: string;
        ASIN: string;
        站点: string;
        发货数量: number;
        库存周转天数: number;
        是否泛欧: string;
        五点Rufus加标题: string;
        敏感词规避: string;
        图片加QA: string;
        A加页面: string;
        SOP合规状态: string;
        DE配送费欧元: number;
        配送占比百分号: string;
        清仓红线欧元: string;
        动销价格欧元: string;
        建议售价欧元: string;
        盈亏平衡点欧元: string;
        流量: number;
        七天CTR百分号: number;
        七天CVR百分号: number;
        ACOAS百分号: number;
        自然单占比百分号: number;
        Vine进度: string;
        广告策略: string;
        是否保留: string;
        NextStep: string;
    }

    const exportData: ExportRow[] = tableData.map((row, idx) => {
        const excelRow = idx + 2; // Excel row number (1-indexed, row 1 is header)

        return {
            阶段: stageConfigMap[row.stage]?.label || row.stage,
            SKU: row.sku,
            中文名: row.cn_name,
            店铺: row.store,
            ASIN: row.asin,
            站点: row.site,
            发货数量: row.qty_shipped,
            库存周转天数: row.inventory_days,
            是否泛欧: row.is_pan_eu ? '是' : '否',
            五点Rufus加标题: row.check_content ? '✓' : '',
            敏感词规避: row.check_sensitive ? '✓' : '',
            图片加QA: row.check_creative ? '✓' : '',
            A加页面: row.check_ebc ? '✓' : '',
            SOP合规状态: getComplianceStatus(row).isComplete
                ? '完成'
                : `${getComplianceStatus(row).completed}/4`,
            DE配送费欧元: row.delivery_fee,
            配送占比百分号: `=${COL.DELIVERY_FEE}${excelRow}/${COL.SUGGESTED}${excelRow}*100`,
            清仓红线欧元: `=${COL.DELIVERY_FEE}${excelRow}/0.5`,
            动销价格欧元: `=${COL.DELIVERY_FEE}${excelRow}/0.5+1`,
            建议售价欧元: `=${COL.DELIVERY_FEE}${excelRow}/0.5+2`,
            盈亏平衡点欧元: row.break_even,
            流量: row.sessions,
            七天CTR百分号: row.ctr_7d,
            七天CVR百分号: row.cvr_7d,
            ACOAS百分号: row.acoas,
            自然单占比百分号: row.organic_ratio,
            Vine进度: row.vine_status,
            广告策略:
                row.ads_strategy === 'auto' ? '自动' : row.ads_strategy === 'manual' ? '手动' : '混合',
            是否保留: row.decision === 'keep' ? '保留' : '放弃',
            NextStep: row.next_step.join('; '),
        };
    });

    // Convert to CSV
    if (exportData.length === 0) {
        alert('没有数据可导出');
        return;
    }

    const firstRow = exportData[0];
    if (!firstRow) {
        alert('数据格式错误');
        return;
    }

    const headers = Object.keys(firstRow);
    const csvContent = [
        headers.join(','),
        ...exportData.map((row) =>
            headers
                .map((h) => {
                    const val = row[h as keyof ExportRow];
                    // Escape commas and quotes in values
                    if (
                        typeof val === 'string' &&
                        (val.includes(',') || val.includes('"') || val.includes('='))
                    ) {
                        return `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                })
                .join(',')
        ),
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
    alert(
        '导出成功！Excel文件包含计算公式，打开后公式会自动计算。\n\n提示：清仓红线/动销价格/建议售价列包含Excel公式，修改配送费后会自动更新。'
    );
}

// Filter by store
function filterByStore(store: string): void {
    if (store === 'all') {
        tableData = [...SAMPLE_DATA];
    } else {
        tableData = SAMPLE_DATA.filter((row: NPIProductRecord) => row.store === store);
    }
    renderTable();
}

// Filter by stage
function filterByStage(stage: string): void {
    if (stage === 'all') {
        tableData = [...SAMPLE_DATA];
    } else {
        tableData = SAMPLE_DATA.filter((row: NPIProductRecord) => row.stage === stage);
    }
    renderTable();
}

// Expose to window for inline event handlers
(window as any).updateField = updateField;
(window as any).updateDeliveryFee = updateDeliveryFee;
(window as any).toggleDecision = toggleDecision;
(window as any).openNextStepEditor = openNextStepEditor;
(window as any).saveNextSteps = saveNextSteps;
(window as any).closeNextStepModal = closeNextStepModal;
(window as any).exportToExcel = exportToExcel;
(window as any).filterByStore = filterByStore;
(window as any).filterByStage = filterByStage;

// Module class
class NPITrackerModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/sops/views/growth/npi_tracker/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
        container.classList.add('fade-in');

        // Initialize table after DOM is ready
        setTimeout(() => {
            renderTable();
        }, 100);

        console.log('✅ 新品生命周期跟踪 SOP 模块已挂载');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        // Clean up global functions
        delete (window as any).updateField;
        delete (window as any).updateDeliveryFee;
        delete (window as any).toggleDecision;
        delete (window as any).openNextStepEditor;
        delete (window as any).saveNextSteps;
        delete (window as any).closeNextStepModal;
        delete (window as any).exportToExcel;
        delete (window as any).filterByStore;
        delete (window as any).filterByStage;

        console.log('❌ 新品生命周期跟踪 SOP 模块已卸载');
    }
}

// Phase 4: 集中注册所有动作到 ActionRegistry
const npiTrackerActions: Record<string, (...args: any[]) => void> = {
    updateField: updateField as any,
    updateDeliveryFee: updateDeliveryFee as any,
    toggleDecision: toggleDecision as any,
    openNextStepEditor: openNextStepEditor as any,
    saveNextSteps: saveNextSteps as any,
    closeNextStepModal: closeNextStepModal as any,
    exportToExcel: exportToExcel as any,
    filterByStore: filterByStore as any,
    filterByStage: filterByStage as any,
};

registerActionsWithLegacy(npiTrackerActions);

console.log('✅ [npi_tracker] 已注册 ' + Object.keys(npiTrackerActions).length + ' 个动作到 ActionRegistry');

// 导出模块实例
const npiTrackerModule = new NPITrackerModule('npi_tracker');

export const mount = (container: HTMLElement) => npiTrackerModule.mount(container);
export const unmount = () => npiTrackerModule.unmount();
