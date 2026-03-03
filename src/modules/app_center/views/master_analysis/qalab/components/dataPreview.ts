/**
 * Q&A Lab 数据预览渲染器
 * 负责生成分析报告的预览卡片
 */

import type { AnalysisReportData } from '../services/importHandler';
import { SafeRenderer } from '../../../../../../common/infrastructure/SafeRenderer';

/**
 * 分析目标配置（与AI Analysis保持一致）
 */
const ANALYSIS_TARGETS = [
    { id: 'title-keywords', name: '标题核心词根', source: 'Listings', icon: 'fa-font', color: 'indigo' },
    { id: 'selling-points', name: '卖点结构拆解', source: 'Listings', icon: 'fa-layer-group', color: 'cyan' },
    { id: 'fatal-flaws', name: '致命劝退点', source: 'Reviews', icon: 'fa-triangle-exclamation', color: 'red' },
    { id: 'wow-moments', name: '惊喜顿悟时刻', source: 'Reviews', icon: 'fa-star', color: 'amber' },
    { id: 'hesitation-points', name: '购买前犹豫点', source: 'Reviews', icon: 'fa-circle-question', color: 'orange' },
    { id: 'buyer-profile', name: '画像与场景侧写', source: 'Reviews', icon: 'fa-user-group', color: 'purple' },
    { id: 'vocab-gap', name: '词汇鸿沟分析', source: 'Reviews', icon: 'fa-comments', color: 'teal' },
    { id: 'promise-reality', name: '承诺/现实断层', source: 'Reviews', icon: 'fa-scale-unbalanced', color: 'rose' }
];

/**
 * 检查目标数据是否有实际内容
 */
function hasValidData(targetData: any): boolean {
    if (!targetData || typeof targetData !== 'object') return false;

    // 检查是否是空对象
    const keys = Object.keys(targetData);
    if (keys.length === 0) return false;

    // 检查是否所有值都是空的
    const hasNonEmptyValue = keys.some(key => {
        const value = targetData[key];
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
    });

    return hasNonEmptyValue;
}

/**
 * 提取单个分析目标的统计数据
 */
function extractTargetStats(targetId: string, targetData: any): Array<{ label: string; value: string }> {
    if (!targetData) {
        console.log(`[QALab] extractTargetStats: targetData 为空，targetId=${targetId}`);
        return [];
    }

    console.log(`[QALab] extractTargetStats: targetId=${targetId}, targetData keys=`, Object.keys(targetData));

    switch (targetId) {
        case 'title-keywords':
            // 兼容两种格式：对象数组和字符串数组
            const primaryKeywords = targetData.primary_keywords || [];
            const sceneKeywords = targetData.scene_keywords || [];
            const removedBrandTerms = targetData.removed_brand_terms || [];
            const removedModifiers = targetData.removed_modifiers || [];

            const titleStats = [
                { label: '核心词根', value: `${primaryKeywords.length}个` },
                { label: '场景词', value: `${sceneKeywords.length}个` },
                { label: '已剔除', value: `${removedBrandTerms.length + removedModifiers.length}个` }
            ];
            console.log(`[QALab] title-keywords stats:`, titleStats, 'data:', {
                primary_keywords: primaryKeywords.length,
                scene_keywords: sceneKeywords.length,
                removed_brand_terms: removedBrandTerms.length,
                removed_modifiers: removedModifiers.length
            });
            return titleStats;

        case 'selling-points':
            const bulletAnalysis = targetData.bullet_analysis || [];
            const sellingStats = [
                { label: '卖点数量', value: `${bulletAnalysis.length}个` },
                { label: '功能点', value: `${bulletAnalysis.filter((b: any) => b.function || b.functions).length}个` },
                { label: '场景覆盖', value: `${bulletAnalysis.filter((b: any) => b.scene || (b.scenes && b.scenes.length > 0)).length}个` }
            ];
            console.log(`[QALab] selling-points stats:`, sellingStats, 'bullet_analysis sample:', bulletAnalysis[0]);
            return sellingStats;

        case 'fatal-flaws':
            const criticalIssues = targetData.critical_issues || [];
            // 真实数据结构：没有actionable字段，使用severity判断
            const flawStats = [
                { label: '致命问题', value: `${criticalIssues.length}个` },
                { label: '高频缺陷', value: `${criticalIssues.filter((i: any) => i.severity === 'high' || i.severity === 'critical' || i.severity === 'major').length}个` },
                { label: '需规避', value: `${criticalIssues.filter((i: any) => i.actionable === true || i.severity === 'critical').length}个` }
            ];
            console.log(`[QALab] fatal-flaws stats:`, flawStats, 'sample keys:', criticalIssues[0] ? Object.keys(criticalIssues[0]) : []);
            return flawStats;

        case 'wow-moments':
            const moments = targetData.moments || [];
            const wowStats = [
                { label: 'Wow时刻', value: `${moments.length}个` },
                { label: '超预期点', value: `${moments.filter((m: any) => m.type === 'exceeded' || m.emotion_type === 'delight').length}个` },
                { label: '惊喜功能', value: `${moments.filter((m: any) => m.category === 'feature' || m.aspect === 'smell' || m.aspect === 'overall').length}个` }
            ];
            console.log(`[QALab] wow-moments stats:`, wowStats, 'moments sample:', moments[0]);
            return wowStats;

        case 'hesitation-points':
            const hesitations = targetData.hesitations || [];
            // 真实数据结构：pre_purchase_worry, post_purchase_resolution, resolution_status
            const hesitationStats = [
                { label: '犹豫点', value: `${hesitations.length}个` },
                { label: '已解决', value: `${hesitations.filter((h: any) => h.resolved === true || h.resolution_status === 'resolved' || h.post_purchase_resolution).length}个` },
                { label: '高优先级', value: `${hesitations.filter((h: any) => h.priority === 'high' || h.severity === 'high').length}个` }
            ];
            console.log(`[QALab] hesitation-points stats:`, hesitationStats, 'sample keys:', hesitations[0] ? Object.keys(hesitations[0]) : []);
            return hesitationStats;

        case 'buyer-profile':
            // 真实数据结构：demographics是对象，buyer_types是数组，usage_scenes不是usage_scenarios
            const buyerTypes = targetData.buyer_types || [];
            const usageScenes = targetData.usage_scenes || targetData.usage_scenarios || [];
            // demographics是对象，统计lifestyle_indicators数组长度
            const demographicsCount = targetData.demographics?.lifestyle_indicators?.length ||
                (targetData.demographics ? 1 : 0) ||
                (Array.isArray(targetData.demographics) ? targetData.demographics.length : 0);

            const profileStats = [
                { label: '买家类型', value: `${buyerTypes.length}种` },
                { label: '使用场景', value: `${usageScenes.length}个` },
                { label: '人群画像', value: `${demographicsCount}个` }
            ];
            console.log(`[QALab] buyer-profile stats:`, profileStats, 'data:', {
                buyer_types: buyerTypes.length,
                usage_scenes: usageScenes.length,
                demographics: demographicsCount,
                demographics_type: typeof targetData.demographics
            });
            return profileStats;

        case 'vocab-gap':
            // 真实数据结构：seller_terms, buyer_terms, uncovered_buyer_terms, listing_optimization(对象)
            const missingTerms = targetData.missing_terms || targetData.uncovered_buyer_terms || [];
            const buyerSlang = targetData.buyer_slang || targetData.buyer_terms || [];
            const recommendations = targetData.recommendations ||
                (targetData.listing_optimization && Array.isArray(targetData.listing_optimization) ? targetData.listing_optimization :
                    targetData.listing_optimization?.recommendations || []);

            const vocabStats = [
                { label: '词汇缺口', value: `${missingTerms.length}个` },
                { label: '买家黑话', value: `${buyerSlang.length}个` },
                { label: '建议补充', value: `${Array.isArray(recommendations) ? recommendations.length : 0}个` }
            ];
            console.log(`[QALab] vocab-gap stats:`, vocabStats, 'data keys:', Object.keys(targetData));
            return vocabStats;

        case 'promise-reality':
            const gaps = targetData.gaps || [];
            // 真实数据结构：listing_claim, review_reality, contradiction_severity, false_advertising_risk
            const promiseStats = [
                { label: '断层点', value: `${gaps.length}个` },
                { label: '过度承诺', value: `${gaps.filter((g: any) => g.type === 'overpromise' || g.gap_type === 'overpromise' || g.contradiction_severity === 'high' || g.false_advertising_risk === 'high').length}个` },
                { label: '需修正', value: `${gaps.filter((g: any) => g.actionable === true || g.contradiction_severity === 'high' || g.contradiction_severity === 'medium' || g.recommended_action).length}个` }
            ];
            console.log(`[QALab] promise-reality stats:`, promiseStats, 'sample keys:', gaps[0] ? Object.keys(gaps[0]) : []);
            return promiseStats;

        default:
            console.log(`[QALab] extractTargetStats: 未知的 targetId=${targetId}`);
            return [];
    }
}

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
 * 渲染数据预览卡片（遍历所有分析目标）
 */
export function renderDataPreview(reportData: AnalysisReportData | null): void {
    console.log('[QALab] 📊 renderDataPreview 被调用');
    console.log('[QALab] - reportData 存在:', !!reportData);

    const container = document.getElementById('data-preview-content');
    if (!container) {
        console.warn('[QALab] ⚠️ 数据预览容器未找到');
        return;
    }

    console.log('[QALab] ✅ 数据预览容器已找到');

    const renderer = SafeRenderer.getInstance();

    if (!reportData) {
        // 空状态（超紧凑版）
        const emptyHTML = `
            <div class="empty-state text-center py-10 cursor-pointer rounded-lg border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50/30 to-white group"
                 onclick="window.qalabTriggerImport && window.qalabTriggerImport()">
                <div class="flex flex-col items-center pointer-events-none">
                    <div class="relative mb-3">
                        <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200 shadow-inner group-hover:border-blue-300 group-hover:from-blue-50 group-hover:to-blue-100/50 transition-all duration-300">
                            <i class="fas fa-file-import text-xl text-slate-300 group-hover:text-blue-400 transition-colors duration-300"></i>
                        </div>
                        <div class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-100 border border-slate-200 group-hover:bg-blue-100 group-hover:border-blue-300 transition-all duration-300"></div>
                        <div class="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 rounded-full bg-slate-100 border border-slate-200 group-hover:bg-blue-100 group-hover:border-blue-300 transition-all duration-300"></div>
                    </div>
                    <p class="text-xs font-semibold text-slate-500 mb-1 group-hover:text-blue-600 transition-colors duration-300">点击导入分析报告 JSON</p>
                    <p class="text-[10px] text-slate-400 mb-2 max-w-sm leading-relaxed group-hover:text-blue-500 transition-colors duration-300">
                        或等待 AI Analysis 模块自动加载
                    </p>
                    <div class="flex items-center gap-1 text-[9px] text-slate-400 group-hover:text-blue-500 transition-colors duration-300">
                        <i class="fas fa-mouse-pointer text-[8px]"></i>
                        <span>点击任意位置选择文件</span>
                    </div>
                </div>
            </div>
        `;
        renderer.renderTemplate(container, emptyHTML);
        console.log('[QALab] ✅ 空状态已渲染');
        return;
    }

    // 提取数据
    const metadata = reportData.metadata || {};
    const marketplace = metadata.marketplace || 'DE';
    const dataSource = metadata.dataSource || 'import';
    const analysisReport = reportData.analysisReport || reportData;

    // 数据源标签
    const sourceLabels: Record<string, { text: string; color: string }> = {
        scraper: { text: '数据采集', color: 'emerald' },
        sample: { text: '示例数据', color: 'amber' },
        import: { text: '手动导入', color: 'blue' }
    };
    const sourceLabel = (sourceLabels[dataSource] || sourceLabels['import'])!;

    // 遍历所有分析目标，生成卡片
    const cards: string[] = [];

    console.log('[QALab] 开始遍历分析目标，analysisReport keys:', Object.keys(analysisReport));

    for (const target of ANALYSIS_TARGETS) {
        // 尝试多种命名方式获取目标数据
        const targetData = analysisReport[target.id]
            || analysisReport[target.id.replace(/-/g, '_')]
            || analysisReport[target.id.replace(/-/g, '')];

        console.log(`[QALab] 检查目标 ${target.id}:`, {
            found: !!targetData,
            hasValidData: targetData ? hasValidData(targetData) : false,
            keys: targetData ? Object.keys(targetData) : []
        });

        // 如果该目标没有数据或数据为空，跳过
        if (!hasValidData(targetData)) {
            console.log(`[QALab] 跳过目标 ${target.id}: 无有效数据`);
            continue;
        }

        // 提取统计数据
        const stats = extractTargetStats(target.id, targetData);
        console.log(`[QALab] 目标 ${target.id} 统计数据:`, stats);

        // 生成卡片HTML（3列紧凑版）
        const cardHTML = `
            <div class="analysis-card rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <!-- 卡片头部 -->
                <div class="card-header p-2 bg-gradient-to-r from-${target.color}-500 to-${target.color}-600">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-md flex items-center justify-center border border-white/30 shadow-lg flex-shrink-0">
                            <i class="fa-solid ${target.icon} text-sm text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-xs tracking-tight text-white truncate leading-tight">${target.name}</h3>
                            <div class="flex items-center gap-1 mt-0.5">
                                <span class="text-[8px] px-1.5 py-0.5 rounded-full bg-white/20 border border-white/20 font-medium backdrop-blur-sm text-white leading-none">${target.source}</span>
                                <span class="text-[8px] px-1 py-0.5 rounded bg-white/30 text-white font-bold border border-white/20 leading-none">
                                    ${getFlag(marketplace)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${stats.length > 0 ? `
                <!-- 统计数据 -->
                <div class="p-2 bg-gradient-to-b from-slate-50/80 to-white">
                    <div class="grid grid-cols-3 gap-1.5">
                        ${stats.map(stat => `
                            <div class="relative bg-white rounded p-1.5 text-center border border-slate-100 shadow-sm hover:shadow-md hover:border-${target.color}-200 transition-all">
                                <div class="text-base font-extrabold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent leading-none">${stat.value}</div>
                                <div class="text-[8px] text-slate-500 mt-1 font-medium leading-tight">${stat.label}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- 数据源标签 -->
                <div class="px-2 py-1.5 bg-slate-50/50 flex items-center justify-between">
                    <div class="flex items-center gap-1">
                        <div class="w-1 h-1 rounded-full bg-${sourceLabel.color}-400"></div>
                        <span class="text-[8px] text-slate-500">${sourceLabel.text}</span>
                    </div>
                    <span class="text-[8px] text-slate-400 font-mono">${target.id}</span>
                </div>
            </div>
        `;

        cards.push(cardHTML);
    }

    // 如果没有任何卡片，显示提示
    if (cards.length === 0) {
        const noDataHTML = `
            <div class="text-center py-8">
                <div class="w-12 h-12 mx-auto mb-2.5 rounded-lg bg-slate-100 flex items-center justify-center">
                    <i class="fas fa-inbox text-lg text-slate-400"></i>
                </div>
                <p class="text-[11px] text-slate-500 font-medium">分析报告中未找到有效的分析目标数据</p>
                <p class="text-[9px] text-slate-400 mt-1">请确保导入的JSON包含完整的分析结果</p>
            </div>
        `;
        renderer.renderTemplate(container, noDataHTML);
        return;
    }

    // 渲染所有卡片（超紧凑布局）
    const finalHTML = `
        <!-- 重新导入触发器 -->
        <div class="import-trigger mb-3 p-2.5 rounded-lg border-2 border-dashed border-slate-200 bg-gradient-to-r from-slate-50/50 to-white hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer group flex items-center justify-center gap-2"
             onclick="window.qalabTriggerImport && window.qalabTriggerImport()">
            <div class="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-300 group-hover:bg-blue-50 transition-all duration-300">
                <i class="fas fa-file-import text-xs text-slate-400 group-hover:text-blue-500 transition-colors duration-300"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-[11px] font-semibold text-slate-700 group-hover:text-blue-600 transition-colors duration-300">重新导入</span>
                <span class="text-[9px] text-slate-400 group-hover:text-blue-500 transition-colors duration-300">点击选择 JSON 文件</span>
            </div>
        </div>
        
        <!-- 分析目标卡片网格（4列布局） -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            ${cards.join('')}
        </div>
        
        <!-- 底部提示 -->
        <div class="mt-3 p-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 bg-indigo-100 rounded-md flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-lightbulb text-xs text-indigo-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] text-slate-700">
                        <span class="font-semibold">共找到 ${cards.length} 个分析目标</span>
                        <span class="text-slate-500"> · 来源: ${sourceLabel.text}</span>
                    </p>
                    <p class="text-[9px] text-slate-500 mt-0.5">
                        点击"智能分析并生成 Q&A"按钮开始分析
                    </p>
                </div>
            </div>
        </div>
    `;

    renderer.renderTemplate(container, finalHTML);
    console.log('[QALab] ✅ 数据预览已渲染，卡片数量:', cards.length);
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
