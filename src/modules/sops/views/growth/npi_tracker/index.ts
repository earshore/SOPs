/**
 * 亚马逊新品生命周期跟踪 SOP - NPI Tracker
 * Amazon New Product Introduction Tracker (EU Focus)
 * 
 * 架构说明：
 * - 使用 SafeModuleLoader 加载模板
 * - 使用 SafeRenderer 进行安全渲染
 * - 使用 registerActionsWithLegacy 注册全局操作
 * - 已迁移到新架构（系统稳定性优化）
 */

import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';
import { Logger } from '../../../../../services/loggerService';
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

// 模块状态
let tableData: NPIProductRecord[] = [...SAMPLE_DATA];
let registeredActions: string[] = [];
let removeFilterListener: (() => void) | null = null;

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

// Render the table
function renderTable(): void {
    const tbody = document.getElementById('npi-table-body');
    if (!tbody) return;

    // 使用 SafeRenderer 渲染表格（静态模板，已审计）
    const renderer = SafeRenderer.getInstance();
    const tableHTML = tableData
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
            <td class="px-3 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" data-action="open-product" data-domain="${domain}" data-asin="${row.asin}">
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
                <input type="checkbox" ${row.is_pan_eu ? 'checked' : ''} class="w-4 h-4 rounded" data-action="update-field" data-field="is_pan_eu">
            </td>
            <td class="px-3 py-3 text-center">
                <input type="checkbox" ${row.check_content ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600" data-action="update-field" data-field="check_content">
            </td>
            <td class="px-3 py-3 text-center">
                <input type="checkbox" ${row.check_sensitive ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600" data-action="update-field" data-field="check_sensitive">
            </td>
            <td class="px-3 py-3 text-center">
                <input type="checkbox" ${row.check_creative ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600" data-action="update-field" data-field="check_creative">
            </td>
            <td class="px-3 py-3 text-center">
                <input type="checkbox" ${row.check_ebc ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600" data-action="update-field" data-field="check_ebc">
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
                    data-action="update-delivery-fee">
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
                <select class="px-2 py-1 border rounded text-xs" data-action="update-field" data-field="ads_strategy">
                    <option value="auto" ${row.ads_strategy === 'auto' ? 'selected' : ''}>自动</option>
                    <option value="manual" ${row.ads_strategy === 'manual' ? 'selected' : ''}>手动</option>
                    <option value="mixed" ${row.ads_strategy === 'mixed' ? 'selected' : ''}>混合</option>
                </select>
            </td>
            <td class="px-3 py-3 text-center">
                <button data-action="toggle-decision" class="px-2 py-1 rounded text-xs font-medium ${row.decision === 'keep' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
                    ${row.decision === 'keep' ? '保留' : '放弃'}
                </button>
            </td>
            <td class="px-3 py-3">
                <div class="flex flex-wrap gap-1">
                    ${row.next_step.map((step: string) => `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">${step}</span>`).join('')}
                    <button data-action="open-next-step-editor" class="px-2 py-0.5 border border-dashed border-slate-300 rounded text-xs text-slate-400 hover:border-blue-400 hover:text-blue-500">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
        })
        .join('');
    
    // 使用 SafeRenderer 渲染（静态模板，已审计）
    renderer.renderTemplate(tbody, tableHTML);
    
    // 使用事件委托绑定所有事件
    setupTableEventDelegation(tbody);
}

// Update field
function updateField(index: number, field: keyof NPIProductRecord, value: unknown): void {
    if (index >= 0 && index < tableData.length) {
        const row = tableData[index];
        if (row) {
            // 类型安全的字段更新
            (row[field] as typeof value) = value as never;
            renderTable();
        }
    }
}

// 设置表格事件委托
function setupTableEventDelegation(tbody: HTMLElement): void {
    // 移除旧的事件监听器（如果存在）
    const oldHandler = (tbody as any)._eventHandler;
    if (oldHandler) {
        tbody.removeEventListener('click', oldHandler);
        tbody.removeEventListener('change', oldHandler);
    }
    
    // 创建新的事件处理器
    const eventHandler = (e: Event) => {
        const target = e.target as HTMLElement;
        const row = target.closest('tr[data-index]') as HTMLElement;
        if (!row) return;
        
        const index = parseInt(row.dataset.index || '-1');
        if (index < 0) return;
        
        const action = target.getAttribute('data-action');
        
        if (action === 'open-product') {
            const domain = target.getAttribute('data-domain');
            const asin = target.getAttribute('data-asin');
            if (domain && asin) {
                window.open(`https://www.${domain}/dp/${asin}`, '_blank');
            }
        } else if (action === 'update-field') {
            const field = target.getAttribute('data-field') as keyof NPIProductRecord;
            if (field) {
                const value = (target as HTMLInputElement).type === 'checkbox' 
                    ? (target as HTMLInputElement).checked 
                    : (target as HTMLInputElement).value;
                updateField(index, field, value);
            }
        } else if (action === 'update-delivery-fee') {
            const value = (target as HTMLInputElement).value;
            updateDeliveryFee(index, value);
        } else if (action === 'toggle-decision') {
            toggleDecision(index);
        } else if (action === 'open-next-step-editor') {
            openNextStepEditor(index);
        }
    };
    
    // 保存处理器引用以便后续移除
    (tbody as any)._eventHandler = eventHandler;
    
    // 绑定事件
    tbody.addEventListener('click', eventHandler);
    tbody.addEventListener('change', eventHandler);
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
    checkboxes.textContent = '';
    NEXT_STEP_OPTIONS.forEach((option) => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = option;
        input.checked = currentSteps.includes(option);
        input.className = 'w-4 h-4 rounded';

        const span = document.createElement('span');
        span.className = 'text-sm';
        span.textContent = option;

        label.appendChild(input);
        label.appendChild(span);
        checkboxes.appendChild(label);
    });

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
        removeFilterListener?.();
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

// 扩展 Window 接口以支持全局函数（兼容性）
function setupFilterEventDelegation(container: HTMLElement): void {
    removeFilterListener?.();

    const handleFilterChange = (event: Event): void => {
        const target = event.target as HTMLSelectElement | null;
        const filterType = target?.dataset?.npiFilter;
        if (!filterType) return;

        if (filterType === 'store') {
            filterByStore(target.value);
        } else if (filterType === 'stage') {
            filterByStage(target.value);
        }
    };

    container.addEventListener('change', handleFilterChange);
    removeFilterListener = () => {
        container.removeEventListener('change', handleFilterChange);
        removeFilterListener = null;
    };
}

declare global {
    interface Window {
        updateField?: (index: number, field: keyof NPIProductRecord, value: unknown) => void;
        updateDeliveryFee?: (index: number, value: string) => void;
        toggleDecision?: (index: number) => void;
        openNextStepEditor?: (index: number) => void;
        saveNextSteps?: () => void;
        closeNextStepModal?: () => void;
        exportToExcel?: () => void;
    }
}

/**
 * 挂载模块
 */
export async function mount(container: HTMLElement): Promise<void> {
    Logger.debug('[NPITracker] 🔧 开始挂载模块');

    try {
        // 1. 使用 SafeModuleLoader 加载模板
        const loader = SafeModuleLoader.getInstance();
        const renderer = SafeRenderer.getInstance();
        
        const html = await loader.loadTemplate(
            'src/modules/sops/views/growth/npi_tracker/template.html',
            {
                retryCount: 3,
                timeout: 5000,
                onError: (error) => {
                    Logger.error('[NPITracker] 模板加载失败:', error);
                }
            }
        );
        
        // 2. 使用 SafeRenderer 渲染模板（静态模板，已审计）
        renderer.renderTemplate(container, html);
        container.classList.add('fade-in');

        // 3. 注册全局操作
        const npiTrackerActions: Record<string, (...args: unknown[]) => void> = {
            updateField: updateField as (...args: unknown[]) => void,
            updateDeliveryFee: updateDeliveryFee as (...args: unknown[]) => void,
            toggleDecision: toggleDecision as (...args: unknown[]) => void,
            openNextStepEditor: openNextStepEditor as (...args: unknown[]) => void,
            saveNextSteps: saveNextSteps as (...args: unknown[]) => void,
            closeNextStepModal: closeNextStepModal as (...args: unknown[]) => void,
            exportToExcel: exportToExcel as (...args: unknown[]) => void,
        };

        registeredActions = registerActionsWithLegacy(npiTrackerActions);
        setupFilterEventDelegation(container);
        Logger.debug(`[NPITracker] 已注册 ${registeredActions.length} 个动作到 ActionRegistry`);

        // 4. 初始化表格（延迟渲染，确保 DOM 就绪）
        setTimeout(() => {
            renderTable();
        }, 100);

        Logger.debug('[NPITracker] ✅ 模块挂载成功');
    } catch (error) {
        Logger.error('[NPITracker] ❌ 模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载模块
 */
export function unmount(): void {
    Logger.debug('[NPITracker] 🔄 开始卸载模块');

    try {
        // 1. 清理注册的动作
        if (registeredActions.length > 0) {
            unregisterActions(registeredActions);
            Logger.debug(`[NPITracker] 已清理 ${registeredActions.length} 个动作`);
            registeredActions = [];
        }

        // 2. 重置表格数据
        tableData = [...SAMPLE_DATA];

        Logger.debug('[NPITracker] ✅ 模块卸载成功');
    } catch (error) {
        Logger.error('[NPITracker] ❌ 模块卸载失败:', error);
    }
}
