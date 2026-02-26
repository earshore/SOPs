/**
 * Q&A Lab 数据预览渲染器
 * 负责生成分析报告的预览卡片
 */

import type { AnalysisReportData } from './importHandler';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';

/**
 * 获取站点国旗emoji
 */
function getFlag(site: string): string {
    const flags: Record<string, string> = {
        DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
        SE: '🇸🇪', PL: '🇵🇱', BE: '🇧🇪', IE: '🇮🇪', UK: '🇬🇧'
    };
    return flags[site] || '🌍';
}

/**
 * 获取站点名称
 */
function getSiteName(site: string): string {
    const names: Record<string, string> = {
        DE: '德国', FR: '法国', IT: '意大利', ES: '西班牙', NL: '荷兰',
        SE: '瑞典', PL: '波兰', BE: '比利时', IE: '爱尔兰', UK: '英国'
    };
    return names[site] || site;
}

/**
 * 格式化日期
 */
function formatDate(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return timestamp;
    }
}

/**
 * 提取分析维度统计
 */
function extractAnalysisStats(reportData: AnalysisReportData): {
    sellingPoints: number;
    fatalFlaws: number;
    wowMoments: number;
    hesitations: number;
    buyerTypes: number;
} {
    const ar = reportData.analysisReport || reportData;
    
    const sellingPoints = ar['selling-points']?.bullet_analysis?.length 
        || ar.sellingPoints?.bullet_analysis?.length 
        || ar.selling_points?.bullet_analysis?.length
        || 0;
    
    const fatalFlaws = ar['fatal-flaws']?.critical_issues?.length 
        || ar.fatalFlaws?.critical_issues?.length 
        || ar.fatal_flaws?.critical_issues?.length
        || 0;
    
    const wowMoments = ar['wow-moments']?.moments?.length 
        || ar.wowMoments?.moments?.length 
        || ar.wow_moments?.moments?.length
        || 0;
    
    const hesitations = ar['hesitation-points']?.hesitations?.length 
        || ar.hesitationPoints?.hesitations?.length 
        || ar.hesitation_points?.hesitations?.length
        || 0;
    
    const buyerTypes = ar['buyer-profile']?.buyer_types?.length 
        || ar.buyerProfile?.buyer_types?.length 
        || ar.buyer_profile?.buyer_types?.length
        || 0;
    
    return { sellingPoints, fatalFlaws, wowMoments, hesitations, buyerTypes };
}

/**
 * 渲染数据预览卡片
 */
export function renderDataPreview(reportData: AnalysisReportData | null): void {
    const container = document.getElementById('data-preview-content');
    if (!container) {
        console.warn('[QALab] 数据预览容器未找到');
        return;
    }
    
    const renderer = SafeRenderer.getInstance();
    
    if (!reportData) {
        // 空状态
        const emptyHTML = `
            <div class="empty-state text-center py-16 cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50/30 to-white group"
                 onclick="window.qalabTriggerImport && window.qalabTriggerImport()">
                <div class="flex flex-col items-center pointer-events-none">
                    <div class="relative mb-6">
                        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200 shadow-inner group-hover:border-blue-300 group-hover:from-blue-50 group-hover:to-blue-100/50 transition-all duration-300">
                            <i class="fas fa-file-import text-3xl text-slate-300 group-hover:text-blue-400 transition-colors duration-300"></i>
                        </div>
                        <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-100 border border-slate-200 group-hover:bg-blue-100 group-hover:border-blue-300 transition-all duration-300"></div>
                        <div class="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-slate-100 border border-slate-200 group-hover:bg-blue-100 group-hover:border-blue-300 transition-all duration-300"></div>
                    </div>
                    <p class="text-base font-semibold text-slate-500 mb-2 group-hover:text-blue-600 transition-colors duration-300">点击导入分析报告 JSON</p>
                    <p class="text-sm text-slate-400 mb-3 max-w-sm leading-relaxed group-hover:text-blue-500 transition-colors duration-300">
                        或等待 AI Analysis 模块自动加载
                    </p>
                    <div class="flex items-center gap-2 text-xs text-slate-400 group-hover:text-blue-500 transition-colors duration-300">
                        <i class="fas fa-mouse-pointer text-[10px]"></i>
                        <span>点击任意位置选择文件</span>
                    </div>
                </div>
            </div>
        `;
        renderer.renderTemplate(container, emptyHTML);
        return;
    }
    
    // 提取数据
    const metadata = reportData.metadata || {};
    const marketplace = metadata.marketplace || 'DE';
    const asins = metadata.asins || [];
    const productTitle = metadata.productTitle || '未知产品';
    const timestamp = metadata.timestamp || new Date().toISOString();
    const dataSource = metadata.dataSource || 'import';
    
    const stats = extractAnalysisStats(reportData);
    
    // 数据源标签
    const sourceLabels: Record<string, { text: string; color: string }> = {
        scraper: { text: '数据采集', color: 'emerald' },
        sample: { text: '示例数据', color: 'amber' },
        import: { text: '手动导入', color: 'blue' }
    };
    const sourceLabel = (sourceLabels[dataSource] || sourceLabels['import'])!;
    const sourceLabelColor = sourceLabel.color;
    const sourceLabelText = sourceLabel.text;
    
    // 渲染预览卡片
    const previewHTML = `
        <!-- 重新导入触发器 -->
        <div class="import-trigger mb-4 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-gradient-to-r from-slate-50/50 to-white hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer group flex items-center justify-center gap-3"
             onclick="window.qalabTriggerImport && window.qalabTriggerImport()">
            <div class="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-300 group-hover:bg-blue-50 transition-all duration-300">
                <i class="fas fa-file-import text-slate-400 group-hover:text-blue-500 transition-colors duration-300"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors duration-300">重新导入</span>
                <span class="text-xs text-slate-400 group-hover:text-blue-500 transition-colors duration-300">点击选择 JSON 文件</span>
            </div>
        </div>
        
        <!-- 数据卡片 -->
        <div class="data-card p-5 rounded-xl border-2 border-slate-150 bg-white shadow-sm">
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-2.5">
                    <span class="text-xl flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-150 shrink-0 shadow-sm">
                        ${getFlag(marketplace)}
                    </span>
                    <div class="flex flex-col">
                        <div class="flex items-center gap-1.5">
                            <span class="text-sm font-bold text-slate-800 tracking-tight">${getSiteName(marketplace)}站</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-${sourceLabelColor}-50 text-${sourceLabelColor}-600 font-bold border border-${sourceLabelColor}-100">
                                ${sourceLabelText}
                            </span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-mono mt-0.5">${formatDate(timestamp)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Product Title -->
            <div class="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div class="flex items-start gap-2">
                    <i class="fas fa-box text-slate-400 text-xs mt-0.5"></i>
                    <div class="flex-1">
                        <div class="text-xs text-slate-500 mb-1">产品标题</div>
                        <div class="text-sm text-slate-700 font-medium leading-relaxed">${productTitle}</div>
                    </div>
                </div>
            </div>
            
            <!-- ASINs -->
            ${asins.length > 0 ? `
                <div class="flex flex-wrap gap-1.5 mb-4">
                    ${asins.slice(0, 3).map(asin => `
                        <span class="text-[10px] font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md">
                            ${asin}
                        </span>
                    `).join('')}
                    ${asins.length > 3 ? `
                        <span class="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                            +${asins.length - 3}
                        </span>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-2">
                <div class="stat-item p-2.5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/30 border border-blue-100">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-white border border-blue-100 flex items-center justify-center">
                            <i class="fas fa-star text-blue-500 text-xs"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] text-blue-600 font-medium">卖点</span>
                            <span class="text-sm font-bold text-blue-700">${stats.sellingPoints}</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-item p-2.5 rounded-lg bg-gradient-to-br from-rose-50 to-rose-50/30 border border-rose-100">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-white border border-rose-100 flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle text-rose-500 text-xs"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] text-rose-600 font-medium">致命缺陷</span>
                            <span class="text-sm font-bold text-rose-700">${stats.fatalFlaws}</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-item p-2.5 rounded-lg bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-100">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-white border border-amber-100 flex items-center justify-center">
                            <i class="fas fa-sparkles text-amber-500 text-xs"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] text-amber-600 font-medium">Wow时刻</span>
                            <span class="text-sm font-bold text-amber-700">${stats.wowMoments}</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-item p-2.5 rounded-lg bg-gradient-to-br from-purple-50 to-purple-50/30 border border-purple-100">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-white border border-purple-100 flex items-center justify-center">
                            <i class="fas fa-question-circle text-purple-500 text-xs"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] text-purple-600 font-medium">犹豫点</span>
                            <span class="text-sm font-bold text-purple-700">${stats.hesitations}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Buyer Types -->
            ${stats.buyerTypes > 0 ? `
                <div class="mt-3 pt-3 border-t border-slate-100">
                    <div class="flex items-center gap-2 text-xs text-slate-500">
                        <i class="fas fa-users text-[10px]"></i>
                        <span>买家画像: <span class="font-bold text-slate-700">${stats.buyerTypes}</span> 种类型</span>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    renderer.renderTemplate(container, previewHTML);
}

/**
 * 渲染JSON预览
 */
export function renderJSONPreview(reportData: AnalysisReportData | null): void {
    const container = document.getElementById('json-preview-content');
    if (!container) {
        console.warn('[QALab] JSON预览容器未找到');
        return;
    }
    
    if (!reportData) {
        container.textContent = '// 暂无数据';
        return;
    }
    
    try {
        const jsonString = JSON.stringify(reportData, null, 2);
        container.textContent = jsonString;
    } catch (error) {
        console.error('[QALab] JSON序列化失败:', error);
        container.textContent = '// JSON序列化失败';
    }
}
